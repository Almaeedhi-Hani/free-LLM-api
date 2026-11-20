# Phase 5 — Published link provenance and acceptance (draft)

Base: Stage 4 branch at `6e5855243a355331fb91dd60b6f9ad12b7bb935e`. No updates to `PROGRESS.md`; awaiting Phase 2/3 coordinator gate.

## Existing link/preview locations on phase-4 base

| ID | Actual file/lines (at inspection) | Existing behavior | Phase 5 treatment |
|---|---|---|---|
| V09 | `src/components/ContentImpactCenter.tsx:92-96, 245-269, 290-302` | Mixed page/FAQ/draft inventory, per-row public link for `published` and inline preview | Keep mixed impact analysis; replace the list link with "عرض في شاشة الروابط" when flag enabled |
| V10 | `src/components/EditorialReviewPanel.tsx:12-18, 105-110, 185` | `linkFor` resolves public URLs for approved items | Keep item-specific editorial review; send navigation to published links under the new flag, preserve rollback |
| V11/V12 | `src/app/admin/dashboard/page.tsx:667-815` | Pending FAQ draft approvals and persisted FAQ edits, not one dedicated published-list view | Keep editor/review; published links separate; pending preview text only |
| V08 | `src/components/UnifiedRunHistory.tsx:4-5, 26-43, 65-75` | Auto publication/rollback events and target paths | Reuse existing authenticated GET /api/admin/geo-publication; keep run log for audit |
| D06 | `src/lib/geo-auto-publication.ts:130-147`, `src/app/api/admin/geo-publication/route.ts:5-15` | Service-only persisted publication records, up to 30 in existing status API | Enrich attribution/timestamps only; not proof of live content after rollback |
| Current public routing | `src/lib/editorial-workflow.ts:30-31,100-101`; `src/lib/content-impact.ts:20-28`; `src/app/page.tsx:15-20,261-265` | Live editorial needs approved + reviewedAt + automated or verified sources; only known locale paths; FAQs on Arabic homepage, excluding STORAGE_TEST | Shared `buildPublishedLinks` uses `approvedEditorial` and `editorialPath`; FAQ path / and language ar |

**Counts:** The count must be calculated from **current** `content_store.editorialItems` passing the public route gate plus non-test `content_store.faqs` that the Arabic homepage exposes. Do not equate D06 event count (historical, may include rollbacks) or approved-but-unlinked proposals with live URLs. A unique URL may have several published content elements; the screen counts elements, not unique paths.

**HTTP 200 acceptance:** `scripts/admin-published-links.test.cjs` exercises the fixture contract, count, provenance, rollback and draft separation; an optional `PUBLISHED_LINKS_TEST_BASE_URL` checks each fixture URL by HTTP GET. The coordinator must additionally compare the authenticated production content_store count with the screen and check every current production path via read-only HTTP 200 **after authorized deployment**; no live conclusion before that.

**Rollback:** Set `NEXT_PUBLIC_ADMIN_PUBLISHED_LINKS=false` at build/deploy time; the new tab disappears and the previous per-item page links stay available.

**No changes:** Production publishing approvals and daily limits, manual legal review, Supabase schema, legacy records, API GET authorization, scheduler cron and page copy untouched.
