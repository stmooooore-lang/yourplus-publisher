/**
 * The pair rotation (interim, 9 live majors as of 2026-10-28).
 * Order follows catalog popularity (most popular first). When live
 * discovery unlocks the long tail, this will be replaced by a
 * curated "known → unknown" rotation per the owner's decision.
 */
export const WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

export const ROTATION = [
  { asset: "USDT", amount: "100" },
  { asset: "BTC",  amount: "0.05" },
  { asset: "ETH",  amount: "0.2" },
  { asset: "TON",  amount: "50" },
  { asset: "SOL",  amount: "10" },
  { asset: "XRP",  amount: "1000" },
  { asset: "BNB",  amount: "1" },
  { asset: "USDC", amount: "100" },
  { asset: "TRX",  amount: "10000" },
];

export function windowOf(nowMs = Date.now()) {
  return Math.floor(nowMs / WINDOW_MS);
}

export function pairsForWindow(window, rotation = ROTATION) {
  const index = ((window % rotation.length) + rotation.length) % rotation.length;
  return [rotation[index]];
}

export function pairKey(pair) {
  return `${String(pair.asset).toUpperCase()}-${String(pair.amount)}`;
}
