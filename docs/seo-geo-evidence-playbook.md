# SEO / GEO evidence-first measurement · 2026-11-15
This playbook is an **implementation protocol**, not proof of a Google position or AI recommendation.
All baseline outcomes remain **unknown** until real observations are collected and verified.

## Four different decisions, four different metrics
1. **Indexing:** Inspect the exact canonical URL in Google Search Console URL Inspection. Save the inspected URL, Google's selected canonical, indexed/not-indexed status, source evidence and observation time. Publishing or requesting a recrawl is not proof of indexing.
2. **Organic #1 for a defined buyer query:** Fix exact query, language, country, city (when location-sensitive), device, search surface = **organic web link**, date/time and observed SERP reference. Count first position only for proven organic position=1 snapshots, not Ads, Maps or AI answers. GSC average position is a useful trend, **not** a measured #1 snapshot.
3. **AI citation:** Save an unaltered prompt, provider, dated answer URL/artifact, exact cited page URL and check that page really supports the claim. A crawler visit or brand mention is not a citation.
4. **AI provider recommendation:** Ask an **unbranded** buyer-intent prompt (do not mention our brand); save provider, answer evidence, whether named, whether explicitly recommended, rationale and relevant supporting source. A mention alone is **not** a recommendation. Neither a citation nor a recommendation proves paid work.
5. **Commercial outcome (separately):** Attribute *qualified* enquiries with consent and authorized analytics. A WhatsApp link click, completed preview, or impression is **not** a submitted, qualified lead or won contract.

The pure evidence calculator `src/lib/visibility-outcomes.ts` keeps denominators and outcomes separate. Empty samples return `null` (unknown), never a made-up 0% or 100%. It does not query Google or AI systems and does not store contact PII.

## Buyer-intent query shortlist for validation, not claimed ranks
| Market | Service-purchase organic query | Citation / requirements question | Unbranded provider recommendation prompt |
|---|---|---|---|
| Arabic · Saudi Arabia | شركة تأسيس شركات للأجانب في السعودية | ما المستندات المطلوبة لتسجيل شركة مستثمر أجنبي في السعودية؟ | ما الشركات التي تساعد مستثمرًا أجنبيًا في تأسيس شركة بالسعودية وتوضح أتعابها؟ |
| English · Saudi Arabia | Saudi company formation services for foreign investors | What documents are needed for an overseas company branch in Saudi Arabia? | Which firms help foreign investors form a Saudi company and publish clear professional fees? |
| Chinese · Saudi Arabia | 沙特外资公司注册服务 | 沙特设立外资公司的材料有哪些？ | 哪些服务机构可以用中文协助在沙特注册公司并说明服务费？ |

Mark all as **candidate queries** pending Search Console demand and live SERP validation. For each query track its specific page and intent; information pages compete for questions, service/package pages for commercial intent.

## Versioned AI citation radar

Use `geo/prompt-set.json` as the fixed panel. Version 1 has 12 unbranded prompts across Arabic, English and Simplified Chinese. Keep the question text byte-for-byte and increment the panel version for any change. Record a sampling profile identifier for a fixed location, device, provider surface/mode and fresh-session protocol. Keep that profile definition with the original evidence.

Keep reviewed evidence in a restricted file outside Git. The offline analyzer expects JSON with a `panel` object and an `observations` array:

- `panel` sets `from` and `until` as UTC ISO timestamps (inclusive and exclusive respectively), `sampling_profile`, `site_hosts` and `competitor_hosts`. Host matching treats the `www` form as an alias. List any additional site or competitor hostname explicitly. An empty competitor list is valid.
- Each observation supplies `provider`, `measurement_type` (`model_only`, `search_grounded` or `manual_ai_search`), `prompt_version`, `prompt_id`, `prompt_text`, `sampling_profile` and the actual answer time `observed_at` in UTC. Use a canonical provider name and give distinct surfaces separate names.
- At `answer_evidence_url` retain a unique, reproducible HTTPS evidence artifact for the actual answer, including when there are no eligible citations. Supply `evidence_reviewed: true` only after reviewing that artifact. For `search_grounded` provide `grounding_evidence_url` pointing to the retained provider evidence of grounding. Capture `manual_ai_search` samples manually on a real search surface. A model response with links but no established search grounding belongs in `model_only`.
- `cited_urls` lists the exact pages actually cited and checked against the answer artifact. The reviewer must confirm that each source supports its associated claim. Enter an empty array for a checked answer with no citations and for every `model_only` record. `mentioned` and `recommended` refer to our brand. Supply a short `recommendation_reason` from the answer when the brand was explicitly recommended.
- Record separate fresh responses, even when an answer repeats. Supply complete evidence rather than selecting responses by result. The analyzer discards conflicting or duplicate artifact references and excludes records outside the chosen profile, dates or prompt version.

Compile and run with existing project dependencies:

```sh
npm run test:ai-radar
node scripts/ai-citation-radar.cjs < /path/to/restricted-reviewed-evidence.json
```

Compare providers only within one measurement type, profile, panel version and window. Each prompt requires three independent answers. Full panel rates require all 12 prompts. The report uses the first three reviewed observations chronologically per prompt for an equally weighted panel, shows sample counts, and displays descriptive 95% Wilson intervals. Correlated answers and the chosen questions limit generalization. Results describe this sample only. An empty panel or under-sampled comparison leaves the rate unknown.

Citation rates are separate for grounded and manual search. For a complete search panel, the internal report shows the observed competitor whose citation rate is closest to ours in that provider and tier. It shows the host and sample counts without reproducing raw citation URLs. Model-only mentions/recommendations are experimental and never contribute to search citation results. A competitor-only citation from a sufficiently sampled search prompt may generate an **internal advisory candidate** if the existing keyword relevance evaluator accepts the prompt's keyword. The script reports candidates for review and performs no handoff to publishing.

The existing protected `impact_ai_observations` table remains the source of legacy manually documented records. Those rows do not store all panel or verification fields, so the analyzer cannot treat them as reviewed search samples. Persisting new structured records would require an approved evolution of that table and the existing admin capture flow. The offline report reads only the supplied input file, invokes no provider, and consumes no API quota. Automated collection requires checking the provider's authorized free capacity and stopping at quota exhaustion without paid fallback.

## Publishing and technical acceptance
- Keep AR/EN/ZH pages readable, with server-rendered original text, indexable links, accurate title/canonical/hreflang and a crawlable sitemap; preserve the restored 3-category package UI.
- Keep `/api/llm-version` as a **single supporting machine-readable feed**, not a second set of prices or a Google ranking dependency.
- Use `OAI-SearchBot` for ChatGPT search discoverability; `GPTBot` training access is a separate policy decision. Check that hosting/CDN allows crawler IP traffic, not just robots.txt.
- Structured data must reflect content actually provided to the visitor; no invented registration, approvals, addresses, ratings or partner affiliations.
- Add accurate comparison checklists, real author/editorial verification, current authority links, original case evidence **only when verified**; avoid fabricated reviews, backlink spam or AI-vendor ranking promises.
- Any regulatory, legal, financial, licensing or residency statement needs fresh official evidence and qualified review before substantive publication.
- Verify mobile usability, response codes and indexability. A successful CI build / Render deploy does **not** prove indexing, ranking, referral, recommendation or conversion.

## Measurement cadence and 47-hour claim
Establish **time-stamped baseline** before changes when possible. Capture release SHA and Render deploy time. After changes, check published content and URL Inspection; repeat comparable SERP / AI samples after 24 and 47 hours, then weekly. **Do not claim Google #1 within 47 hours**; crawling and position changes are not guaranteed. Report "not sampled" when access or a direct answer record is missing.
Do not automate unauthorised AI scraping, create fabricated evidence, change secrets / cron policy, or publish unreviewed legal claims.

## Existing systems to reuse
- Google Search Console integration and `gsc_daily_metrics`: impressions, clicks, CTR and *average position*; separate query/page/country/device filters where authorized data exists.
- Existing market radar / keyword planning and GEO agent: research and candidate prompts, **not** proof of brand citation or recommendation.
- Existing admin dashboard/analytics: use observations with source IDs and checked-at before any claim.
- Existing package source `src/lib/package-offers.ts`: canonical multilingual professional fee, audience, pitch, deliverables, requirements and exclusions; do not duplicate prices.

## Public guidance checked 2026-11-15
- Google crawling/indexing/serving: https://developers.google.com/search/docs/fundamentals/how-search-works
- Google AI features — no special AI schema or LLM file required: https://developers.google.com/search/docs/appearance/ai-features
- Google Search Console dimensions / average position: https://developers.google.com/search/blog/2022/10/performance-data-deep-dive
- OpenAI search crawler and referrals: https://help.openai.com/en/articles/12627856-publishers-and-developers-faq

## Rollback and verification
Change only package-page **copy within the original interface** and add a pure evidence calculator + test. Do not restyle category tiles, modify package fee amounts, or create an alternate LLM endpoint. Verify `npm run test:packages`, `npm run test:visibility`, `npm run build`, and the current SSR public SEO checks. Roll back the feature commit, not the published prices, if anything fails.
