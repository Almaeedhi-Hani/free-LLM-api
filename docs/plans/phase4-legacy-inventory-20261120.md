# Phase 4 — Verified legacy UI inventory (draft; 2026-11-20)

Base: `main` at `ee4ac44a603714e0f15e0c83ec13b9e07937d4f0`. This document does not change PROGRESS.md.

| ID | Old location (code) | Function | Current replacement / status | Last proven use | Archive rationale |
|---|---|---|---|---|---|
| B15 | `src/app/admin/dashboard/page.tsx` V12, `content_store.keywords` (persisted in `src/lib/content-store.ts`) | Legacy editorial keyword editor | Removed from UI *before* this phase; V03 market keywords active | Unknown | Avoid two conflicting keyword editors; keep stored list |
| V04 (only former temporary recommendations) | `page.tsx` `tab==='evidence'`, `EvidencePriorityReviewPanel` | Earlier transient recommendations | V05 opportunities is decision store; V04 recorded evidence remains **active** | Unknown | Archive outdated **interpretation**, not evidence panel or API |
| B08 / D08 | `/api/admin/ai-citation-samples`, table `ai_citation_panel_observations` | Historical AI observation samples | V13 visibility; historical read-only records kept | Unknown | Model-only evidence must not be treated as search-grounded citations |
| V07 manual buttons | `page.tsx` agent details, `/api/admin/market/analyze` and `/api/admin/market/radar` | Additional manual market runs | W01/W02 scheduled operations, V07 GEO and V08 history | Unknown | Avoid accidental duplicate runs / quota consumption |
| cron-agent / cron-unified | `src/app/api/cron-agent`, `src/app/api/cron-unified` and worker/orchestrator files | Legacy background API/internal entry points | Keep existing APIs untouched; V08 for diagnostics | Unknown | No separate active navigation element proved; never delete solely on age |
| V18 shortcuts | `page.tsx` settings button group | Duplicate quick jumps to agent/contact/reviews | Existing 7-hub navigation; settings remains | Unknown | Remove duplicate shortcuts, not active destinations |

**Scope guard:** This is not evidence that V04, V07, V08 or V18 as a whole are obsolete. Their active evidence, operational monitoring, settings and historical run data remain available. Old APIs, tables, data, logs and integrations were not deleted or migrated.

**Rollback:** Set `NEXT_PUBLIC_ADMIN_LEGACY_ARCHIVE=false` at build/deploy time to restore the historical V07 manual controls and V18 shortcuts. Default is archive mode on. Do not flip on production until the coordinator authorizes phases 2/3 dependency gate and release.

**Read-only verification needed before merge:** rerun all admin browser acceptance, navigation, mobile RTL, admin authentication and Supabase table/API count baselines. No claim of production acceptance is made by this document.
