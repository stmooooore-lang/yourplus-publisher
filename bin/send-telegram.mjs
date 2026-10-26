#!/usr/bin/env node
/**
 * The sender - the piece that never existed in the source project: a plain
 * Bot API sendMessage call. Webhook-safe by construction: it only POSTs.
 * No getUpdates, no setWebhook, no profile calls - nothing that could touch
 * the production bot's update flow. The token is never printed: only the
 * outcome (message_id, date) or Telegram's error description is logged.
 */
export async function sendTelegram({ token, chatId, text }) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.ok) {
    const description = body?.description ?? `HTTP ${res.status}`;
    return { ok: false, error: description };
  }
  return { ok: true, messageId: body.result?.message_id, date: body.result?.date };
}
