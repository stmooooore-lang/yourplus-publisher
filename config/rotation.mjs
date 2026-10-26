/**
 * The pair rotation. Coverage rule (DEC-020): all assets, weighted by pair
 * activity - liquid pairs appear more often. Engine configuration, not
 * product data: no user data, no secrets, no project configuration here.
 */
export const WINDOW_MS = 2 * 60 * 60 * 1000; // DEC-020 cadence: one post every 2 hours.

export const ROTATION = [
  { asset: "USDT", amount: "100" },
  { asset: "BTC", amount: "0.05" },
  { asset: "USDT", amount: "500" },
  { asset: "ETH", amount: "0.2" },
  { asset: "SOL", amount: "10" },
  { asset: "TON", amount: "50" },
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
