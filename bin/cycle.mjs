#!/usr/bin/env node
/**
 * One publication cycle: for the window's pair set, fetch the live rate from
 * the product's read-only endpoint, gate it, render it, post it to the channel.
 * - One pair failing never fails the cycle; failures are logged and skipped.
 * - Freshness: an expired rate (validUntil passed) is skipped, never published.
 * - Dedup (DEC-024): a (pair, window) marker in .posted/ prevents a second
 *   post in the same window. Markers ride the GitHub Actions cache - runtime
 *   state, never committed to the repository.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { windowOf, pairsForWindow, pairKey } from "../config/rotation.mjs";
import { checkPost } from "./check-post.mjs";
import { sendTelegram } from "./send-telegram.mjs";
import { renderTickerPost } from "../templates/render.mjs";

const MARKER_DIR = ".posted";

function log(line) {
  console.log(`[cycle] ${line}`);
}

async function fetchRate({ url, secret, asset, amount }) {
  const res = await fetch(
    `${url}?asset=${encodeURIComponent(asset)}&amount=${encodeURIComponent(amount)}`,
    { headers: { "x-rate-preview-secret": secret } },
  );
  if (res.status === 404) return { ok: false, reason: "RATE_UNAVAILABLE (no executable quote)" };
  if (res.status === 401) return { ok: false, reason: "UNAUTHORIZED (endpoint secret mismatch)" };
  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
  return { ok: true, rate: await res.json() };
}

async function main() {
  const url = process.env.RATE_PREVIEW_URL;
  const secret = (process.env.RATE_PREVIEW_SECRET ?? "").trim();
  const token = (process.env.TG_BOT_TOKEN ?? "").trim();
  const chatId = (process.env.TG_CHANNEL_ID ?? "").trim();
  for (const [name, value] of Object.entries({
    RATE_PREVIEW_URL: url,
    RATE_PREVIEW_SECRET: secret,
    TG_BOT_TOKEN: token,
    TG_CHANNEL_ID: chatId,
  })) {
    if (!value) {
      log(`config missing: ${name}`);
      process.exit(2);
    }
  }

  const override = Number.parseInt(process.env.WINDOW_OVERRIDE ?? "", 10);
  const window = Number.isSafeInteger(override) ? override : windowOf();
  let pairs;
  if (process.env.PAIRS_OVERRIDE) {
    try {
      pairs = JSON.parse(process.env.PAIRS_OVERRIDE);
    } catch {
      log("PAIRS_OVERRIDE is not valid JSON");
      process.exit(2);
    }
    if (!Array.isArray(pairs) || pairs.length === 0) {
      log("PAIRS_OVERRIDE must be a non-empty array");
      process.exit(2);
    }
  } else {
    pairs = pairsForWindow(window);
  }

  mkdirSync(MARKER_DIR, { recursive: true });
  let posted = 0;
  let skipped = 0;
  let failed = 0;
  for (const pair of pairs) {
    const key = pairKey(pair);
    const marker = `${MARKER_DIR}/${key}-${window}`;
    if (existsSync(marker)) {
      log(`window=${window} pair=${key} skipped (already published this window)`);
      skipped += 1;
      continue;
    }
    const fetched = await fetchRate({ url, secret, asset: pair.asset, amount: pair.amount });
    if (!fetched.ok) {
      log(`window=${window} pair=${key} failed (rate: ${fetched.reason})`);
      failed += 1;
      continue;
    }
    const text = renderTickerPost(fetched.rate);
    const gate = checkPost({ text, rate: fetched.rate });
    if (!gate.ok) {
      log(`window=${window} pair=${key} failed (gate: ${gate.reason})`);
      failed += 1;
      continue;
    }
    const sent = await sendTelegram({ token, chatId, text });
    if (!sent.ok) {
      log(`window=${window} pair=${key} failed (send: ${sent.error})`);
      failed += 1;
      continue;
    }
    writeFileSync(marker, new Date().toISOString());
    posted += 1;
    log(`window=${window} pair=${key} posted message_id=${sent.messageId}`);
  }
  log(`summary window=${window} posted=${posted} skipped=${skipped} failed=${failed}`);
  if (posted === 0 && skipped === 0 && failed > 0) process.exit(1);
}

await main();
