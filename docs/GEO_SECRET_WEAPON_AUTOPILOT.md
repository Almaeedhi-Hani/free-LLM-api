# GEO Intelligence Secret Weapon — Automatic Schedule

Owner authorization: 2026-11-18, enable the **existing dashboard GEO agent** to operate without manual button presses. This is separate from the weekly bounded code maintenance workflow.

## Unattended cycle (Saudi local time)
1. **05:00 daily:** existing \`GEO Intelligence Analysis\` workflow launches \`scripts/opencode-geo-analysis.js --full-pipeline\`: Exa/Tavily/Parallel/Firecrawl candidate discovery as available, evidence gathering, Arabic/English/Chinese analysis via allowed free OpenCode models, persistence of opportunities, goals, FAQ drafts and editorial ideas. This is an existing authenticated Supabase-backed workflow, not a replacement process.
2. **09:20 daily:** independent \`GEO Daily Auto Publication\` publishes eligible pending work under existing DB policy. At review, enabled=true, allow_high_risk=true, daily_limit=1 per rolling 24h; this change does not alter it.
3. **10:20 daily:** existing GSC daily sync requests observed metrics; missing Google page data remains unknown, never invented.
4. **Every Monday 08:40:** separate bounded, low-risk technical code maintenance. Do not conflate this with the GEO agent.

GitHub can delay scheduled runs. The dashboard displays schedule metadata plus actual workflow activation state fetched from GitHub (unknown stays unknown), and most recent GitHub run outcomes.

## Partial execution and provider limitations
The 2026-11-17 manual GEO run 44170923939 failed overall after recording partial results: 2/3 languages analyzed (AR model timeouts), 6 opportunities, 6 goals, 1 FAQ draft and 10 editorial actions persisted; discovery candidates were rejected on conflicting evidence. The full pipeline must keep reporting incomplete runs as partial or failures — do not falsify success or remove evidence controls. The stored artifact is uploaded with \`if: always()\`. The independent daily publisher can run even if analysis fails.

This change does not edit Supabase schema, RLS, secrets, current publication permissions, costs, the separate market-radar schedule or the autonomous code-maintenance workflow. Default model remains free allowlisted; external free-tier limits may reduce coverage. Production publication remains controlled by the current dedicated endpoint and DB state.

## Stopping the system
Disable the **GEO Intelligence Analysis** workflow in GitHub Actions to stop daily research. To stop daily publication also, disable it separately in the authenticated Content & Impact Center or disable its workflow. To stop bounded code changes, disable the separate Autonomous Site Maintenance workflow.

## Proof required
1. CI contract test/build and merge.
2. Main-push rollout runs the actual analysis workflow once and saves evidence.
3. Verify the actual pipeline stage outcomes, including partial failure details.
4. Verify Render deployed the admin status change and read-only production acceptance passed.
5. Future scheduled events must be observed in Actions logs — cron configuration alone does not prove execution.
