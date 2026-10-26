#!/usr/bin/env node
/**
 * Workflow helper: prints the window and its dedup cache key (DEC-024).
 * Same math as the cycle - both import config/rotation.mjs, so they cannot
 * drift apart.
 */
import { windowOf, pairKey, pairsForWindow } from "../config/rotation.mjs";

const override = Number.parseInt(process.env.WINDOW_OVERRIDE ?? "", 10);
const window = Number.isSafeInteger(override) ? override : windowOf();
const [pair] = pairsForWindow(window);
console.log(`window=${window}`);
console.log(`cache-key=ticker-window-${window}`);
console.log(`pair=${pairKey(pair)}`);
