#!/usr/bin/env node
/**
 * The acceptance gate: validate BEFORE publishing, fail loudly (exit 1).
 * A post that fails any rule is never sent. The stop-list is the Message
 * rule set: no rate/advantage claims, no comparisons, no superlatives -
 * the only comparison a post may carry is the measured number against the
 * typical on-hand basket, phrased as data, never as a claim.
 */
export const STOP_LIST = [
  /cheaper/i,
  /better than/i,
  /the best/i,
  /best rate/i,
  /выгодн/i,
  /лучш/i,
  /дешев/i,
  /la mejor/i,
  /mejor tasa/i,
  /más barato/i,
];

export function checkPost({ text, rate, now = new Date() }) {
  if (!text || !text.trim()) return { ok: false, reason: "empty text" };
  if (text.length > 4096) return { ok: false, reason: "text exceeds 4096 chars (Telegram limit)" };
  if (!text.includes("#rates")) return { ok: false, reason: "missing #rates hashtag (layer marker)" };
  for (const rule of STOP_LIST) {
    if (rule.test(text)) return { ok: false, reason: `stop-list match: ${rule}` };
  }
  if (!rate) return { ok: false, reason: "no rate payload" };
  for (const field of ["inputAsset", "inputAmount", "expectedOutput", "providerId", "validUntil"]) {
    if (!rate[field]) return { ok: false, reason: `missing field: ${field}` };
  }
  if (!Number.isFinite(Number(rate.advantagePercent))) {
    return { ok: false, reason: "advantagePercent is not a number" };
  }
  const until = Date.parse(rate.validUntil);
  if (!Number.isFinite(until)) return { ok: false, reason: "validUntil is not a date" };
  if (until <= now.getTime()) {
    return { ok: false, reason: `stale: validUntil ${rate.validUntil} has passed` };
  }
  return { ok: true, reason: "" };
}

if (process.argv.includes("--selftest")) {
  const fresh = {
    validUntil: new Date(Date.now() + 60_000).toISOString(),
    inputAsset: "SOL",
    inputAmount: "1",
    expectedOutput: "100",
    providerId: "p",
    advantagePercent: 2.1,
  };
  const stale = { ...fresh, validUntil: new Date(Date.now() - 60_000).toISOString() };
  const good = checkPost({ text: "1 SOL -> 100 USDT\nPlus vs typical basket: +2.10%\n#rates", rate: fresh });
  const noTag = checkPost({ text: "no hashtag", rate: fresh });
  const claim = checkPost({ text: "the best rate! #rates", rate: fresh });
  const ru = checkPost({ text: "самый лучший курс! #rates", rate: fresh });
  const es = checkPost({ text: "la mejor tasa! #rates", rate: fresh });
  const old = checkPost({ text: "ok #rates", rate: stale });
  console.log(`[gate] good post -> ok=${good.ok}`);
  console.log(`[gate] missing #rates -> ok=${noTag.ok} reason="${noTag.reason}"`);
  console.log(`[gate] EN claim -> ok=${claim.ok} reason="${claim.reason}"`);
  console.log(`[gate] RU claim -> ok=${ru.ok} reason="${ru.reason}"`);
  console.log(`[gate] ES claim -> ok=${es.ok} reason="${es.reason}"`);
  console.log(`[gate] stale rate -> ok=${old.ok} reason="${old.reason}"`);
  const pass = good.ok && !noTag.ok && !claim.ok && !ru.ok && !es.ok && !old.ok;
  console.log(`[gate] selftest ${pass ? "PASS" : "FAIL"}`);
  process.exit(pass ? 0 : 1);
}
