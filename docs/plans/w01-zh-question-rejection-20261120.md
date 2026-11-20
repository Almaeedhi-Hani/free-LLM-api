# W01 — actual scheduled Chinese FAQ question rejection (2026-11-20)

**Execution scope:** targeted prevention of already observed invalid optional FAQ proposals; no weaker quality checks and no extra diagnostic provider calls.

## Confirmed, not inferred

The genuine [W01 `event=schedule` GitHub Actions run #44767261138](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44767261138) failed on `b1db7e4021b6ea0d5d1e15fe0fa4d94a2176ff2d`, around `2026-11-20T15:50–15:51Z`. The downloaded sanitized `geo-analysis-report` artifact [#14645736429](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44767261138/artifacts/14645736429) shows:
- Arabic: 1 FAQ generated, no rejected draft.
- English: 0 FAQ generated.
- **Chinese:** 1 FAQ generated, 1 rejected, exact reason `question_too_short`.
- The existing *single* validation repair was attempted and returned `quota_reached`; `repaired=0`.
- Overall `drafts` stage: `partial`, one valid FAQ persisted, `unresolved_draft_schema` reported, full pipeline `pipeline_ok=false`. This appropriately prevented guarded auto-publication in that run.
- Other stage outcomes remained legitimate: 10 discovery candidates and 13 existing keywords persisted; 5 opportunities, 5 goals, and 2 editorial actions persisted. The incident opened a real [GitHub Issue #203](https://github.com/Almaeedhi-Hani/free-LLM-api/issues/203).

**No source FAQ text, provider secret, private prompt or user/customer information is reproduced here.**

## Minimal correction

The existing authenticated-server draft validation (`src/lib/geo-draft-quality.ts`) requires Chinese FAQ questions to contain at least 15 characters and 8 readable letters. The direct-model instructions already mentioned a general 15-character minimum, but the actual model still returned a shorter question. A more prominent *Chinese-specific* generation-time final check now directs the model to supply a **natural question with at least 15 Han ideographs**, counted separately from its answer, or **omit the optional draft and return a research goal** when not justified by source evidence. This is *more conservative* than the server, not a lower threshold. The same rule applies to the one permitted repair prompt; **no extra model call or provider quota** is introduced.

Offline regression tests check the Chinese instruction in normal and repair prompts and verify the English prompt is unchanged. The original strict `screenDrafts`/server validators, human review requirements for legal/financial text, `daily_limit=3`, workflow schedule, pricing, RLS and publishing settings are untouched.

## Acceptance and non-claims

- PR CI/Evals/browser must all complete successfully; coordinator merge may follow if scoped review passes.
- The guard is **not proven to prevent all future short questions** by its existence or CI alone. Confirm at the next *genuine* W01 schedule: no rejected FAQ due to `question_too_short`, per-language validation and saved or correctly absent drafts in the sanitized artifact.
- Keep Incident #203 open until an actual subsequent healthy scheduled W01 cycle and persisted readback justify resolution. Do not induce extra provider usage or publish synthetic content to force this signal.
- Phase 2 watchdog/quality/weekly schedule evidence, owner-approved Master Pause interface and verified provider 80%-quota accounting remain separate outstanding gates; Phase 3 stays Draft.
