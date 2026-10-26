/**
 * Trilingual ticker post: one post per window, three languages side by side,
 * #rates as the layer marker (DEC-020 closure: #rates / #news + a pinned
 * index post). The announcement layer (#news) is provisioned but not built
 * in this phase - its content pipeline is a later task (DEC-026).
 */
export function renderTicker(rate, locale) {
  const until = new Date(rate.validUntil);
  const hhmm = `${String(until.getUTCHours()).padStart(2, "0")}:${String(until.getUTCMinutes()).padStart(2, "0")} UTC`;
  const pair = `${rate.inputAmount} ${rate.inputAsset} → ${rate.expectedOutput} ${rate.desiredAsset}`;
  const plus = `+${Number(rate.advantagePercent).toFixed(2)}%`;
  const meta = rate.network ? `${rate.network} · ${rate.providerId}` : rate.providerId;
  const lines = {
    ru: [pair, `Сеть: ${meta}`, `Плюс к типичной корзине: ${plus}`, `Актуально до ${hhmm}`],
    en: [pair, `Network: ${meta}`, `Plus vs typical on-hand basket: ${plus}`, `Valid until ${hhmm}`],
    es: [pair, `Red: ${meta}`, `Plus frente a canasta típica: ${plus}`, `Válido hasta ${hhmm}`],
  }[locale];
  if (!lines) throw new Error(`unknown locale: ${locale}`);
  return `📈 ${lines.join("\n")}\n#rates`;
}

export function renderTickerPost(rate) {
  return ["ru", "en", "es"].map((locale) => renderTicker(rate, locale)).join("\n\n");
}

/** #news layer provision (DEC-026): the marker exists, the pipeline does not. */
export function renderAnnouncement() {
  throw new Error("announcement layer: not built in this phase (DEC-026 provision only)");
}
