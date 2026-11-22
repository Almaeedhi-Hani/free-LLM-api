# V3 Stage 2 — W05 green but cadence-skipped must not resolve incident

Verification date: 2026-11-23 KSA. No AI or search provider calls, data writes or publishing changes were made.

## Real production evidence

- [W05 schedule run #45073616338](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/45073616338) had **`event=schedule`** on main `7ed69edc` and GitHub **`conclusion=success`**, but its actual job log said `[EVENT_CADENCE] SKIP kind=llm reason=four_hour_half_slot`.
- GitHub Jobs API independently verified its required step **`Read canonical public LLM feed and detect meaningful index updates` was `skipped`** (as were the index quality checks). The successful workflow status therefore means the **cadence gate worked**, not that a verified index check returned `no_change`.
- Existing Stage-2 failure monitor automatically closed [W05 incident #238](https://github.com/Almaeedhi-Hani/free-LLM-api/issues/238) after receiving the green workflow conclusion, without checking the actual index-read step. A skipped half-slot is not sufficient source-backed evidence to close that incident.

## Small fail-closed correction

- For **W05 only**, monitor reads the fixed, read-only GitHub Actions `/actions/runs/<id>/jobs` record (existing `actions: read` permission) for recent successful scheduled candidates.
- Counts W05 as `success` **only if the exact expected index-read step actually completed successfully**. A cadence skip is classified `skipped`, an API or incomplete result as `unknown`.
- In `workflow_run` failure-event reconciliation, W05 `conclusion=success` with a skipped/unverified index-read step **will not auto-resolve a real failure Issue**.
- Non-W05 workflow status behavior, unchanged-index `no_change` outcomes that actually executed index read, 2h/4h cadence, owner pause, weekly reports, public content, quota and policy stay unchanged.
- Offline test fixtures include two authentic schedule outcome shapes (later cadence SKIP vs earlier executed index-read), the GitHub Jobs endpoint, and failure Issue resolution guards.

## Unproven gates

- CI green and production release do **not** establish a future verified W05 index read. Require the next `event=schedule` run with the **index-read job step `success`**, then release/postmerge acceptance and natural monitor incident reconciliation.
- Issue #238 was already automatically closed before this correction; review reopening it with a precise false-resolution evidence comment rather than claiming it healed from a skipped half-slot. Other outstanding Phase-2 blockers include the actual quality schedule on PR #239, natural Watchdog using server GEO readback from PR #240, and owner-approved pause/80%-quota controls.
