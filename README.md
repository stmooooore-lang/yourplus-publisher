# yourplus-publisher

The **rate ticker publishing engine**: GitHub Actions cron → a read-only rate
endpoint → validation gate → Telegram `sendMessage`. One post per 2-hour
window into one channel.

Adapted structurally from the owner's blog-pipeline project (workflow skeleton,
queue pattern, acceptance gate); the Telegram sender is written here from
scratch — the source project never had one.

## Contract

- **Rate source**: a read-only HTTP endpoint returning the best *executable*
  quote for a desired asset and amount: `inputAsset`, `inputAmount`,
  `expectedOutput`, `baselineOutput`, `advantagePercent`, `providerId`,
  `network`, `strategy`, `validUntil`, `generatedAt`. No database access, no
  stored data — the endpoint is the single source of truth.
- **Cadence**: one post every 2 hours (cron `0 */2 * * *`), one pair from the
  rotation per window, liquid pairs weighted first.
- **One channel, one bot**: the publishing bot only POSTs `sendMessage` —
  no `getUpdates`, no `setWebhook`, no profile calls; it cannot interfere with
  a production webhook.

## Rules

- **Engine only**: no data, no project configuration, no personal identifiers
  in this repository. Secrets live in GitHub Secrets only
  (`RATE_PREVIEW_URL`, `RATE_PREVIEW_SECRET`, `TG_BOT_TOKEN`, `TG_CHANNEL_ID`).
- **Zero cost**: GitHub Actions is the only scheduler; public repos run free.
- **Dry-run rule**: posts go to the configured test channel; nothing is
  published to a public channel before rate verification has run.
- **Dedup**: a concurrency group keeps one run at a time; a
  `(pair, window)` marker (GitHub Actions cache, never committed) blocks a
  second post of the same pair in the same window.
- **Validate before publish** (`bin/check-post.mjs`): required fields,
  `#rates` marker, 4096-char limit, freshness (`validUntil` must be in the
  future) and the stop-list — no rate/advantage claims, no comparisons, no
  superlatives. The only comparison a post carries is the measured number
  against a typical on-hand basket, phrased as data.

## Layout

- `.github/workflows/publish-ticker.yml` — scheduler, concurrency, dedup cache.
- `bin/cycle.mjs` — one publication cycle (fetch → gate → render → send).
- `bin/check-post.mjs` — the gate (`node bin/check-post.mjs --selftest`).
- `bin/send-telegram.mjs` — the sender (plain `sendMessage`).
- `bin/window.mjs` — window/cache-key math shared with the workflow.
- `config/rotation.mjs` — pair rotation and window math.
- `templates/render.mjs` — RU/EN/ES post rendering; `#news` layer provisioned,
  not built.

## Dry-run testing

`workflow_dispatch` accepts two overrides:

- `window` — an explicit window number (a missed old window re-posts exactly
  its own pair, never a catch-up batch);
- `pairs` — a JSON pair set, e.g. `[{"asset":"USDT","amount":"100"}]`, to
  exercise multi-pair cycles and the one-pair-fails-cycle-lives behaviour.
