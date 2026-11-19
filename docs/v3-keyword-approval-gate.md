# V3 keyword evaluation: approval gate

This PR adds **advisory-only** keyword classification and a fixed trilingual regression set. It does not change discovery ingestion, filtering, the append-only `geo_agent_feedback` database, site content, publishing policy, or schema.

## Decisions

- `accept`: specific investor/business-formation intent.
- `reject`: clearly outside investor services, e.g. football or employment.
- `needs_context`: "formation" or "company" without enough commercial meaning.
- `out_of_scope_review`: trademarks/logos and future commercial services. Keep for owner review; do not permanently ban.

## Explicit checkpoint

The V3 strategy requires owner approval **before** inferred/generalized feedback rules can be activated in automated discovery, triage or publishing. This PR deliberately leaves `assessKeyword` disconnected from those flows until that approval. Chinese negative synonyms also require language review before activation.

The existing exact human corrections in `geo_agent_feedback` remain active without change; no old keyword is deleted. Run `node scripts/v3-regression-evals.test.cjs` through the dedicated GitHub workflow.

## Future operational acceptance

1. Fetch stored keywords, generate a **read-only** `would_remove` / `needs_context` report.
2. Review general patterns and Chinese translations with the owner.
3. Integrate the evaluator into both radar and GEO ingestion and all downstream opportunity/publication stages using an explicit, separately approved PR.
4. Add every new approved correction as a regression fixture and check CI.
