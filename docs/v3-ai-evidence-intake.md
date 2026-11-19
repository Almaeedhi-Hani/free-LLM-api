# V3 AI citation evidence: operational intake gate (Issue #149)

This change extends the **already merged** 12-prompt trilingual panel and evidence
reporter from PR #155. It is not itself a real AI Search experiment.

## Owner approval required

The proposed additive migration `20261119_v3_ai_citation_reviewed_observations.sql`
has **not been applied to production**. Do not enable the write path without
separate permission to change the Supabase production schema and activate the
new intake route.

The existing `impact_ai_observations` table has only general observation
fields and cannot store the complete reviewed evidence contract; it is left
untouched. The proposed `ai_citation_panel_observations` table is
append-only, private (service_role-only) and does not change publication,
site design, quotas, model-provider settings or cron cadence.

## Proposed rollout

1. Confirm the protected schema, SQL migration, RLS and role grants with the
   project's database security advisors; approve and apply only when reviewed.
2. Keep `AI_CITATION_CAPTURE_ENABLED` unset until after schema and API tests.
3. To submit manually reviewed evidence, send an admin-authenticated POST
   `/api/admin/ai-citation-samples` with a **single** `observation` matching
   `src/lib/ai-citation-radar.ts` and the fixed `geo/prompt-set.json`.
   The capture requires `evidence_reviewed:true`, a dated evidence URL,
   provider, exact prompt/version, sampling profile and reported citations.
4. Never label a `model_only` text response a search citation. Genuine search
   visibility requires dated `search_grounded` or `manual_ai_search` evidence.
   `answer_evidence_url` is reviewer-attested metadata, not automatically
   validated third-party search output.
5. Admin GET reads up to 1000 reviewed records and calls the existing
   `analyzeAiCitationPanel`. It requires three valid answers **per prompt**,
   provider and comparable sampling profile before returning a percentage;
   otherwise values are `null`/not comparable.
6. Keep provider credentials, answer bodies, client PII, raw reports and
   paid-model calls out of this evidence API. Observations remain manual until
   a separately authorized provider integration exists.

## Verification and rollback

Test `npm run test:ai-radar`, the guarded API with denied anonymous requests,
a clean empty report and an attested input fixture, real Supabase readback,
duplicate denial and non-retry after ambiguous writes.

Rollback: set `AI_CITATION_CAPTURE_ENABLED=false`. Revert code if needed but
preserve evidence history; do not drop tables or delete observations without
owner approval. No percentage may be claimed as observed before real evidence
is collected and reproducibly reviewed.
