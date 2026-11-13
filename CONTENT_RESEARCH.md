# Content research and editorial basis — 13 November 2026

This release changes the public design and service copy. AI ingestion, analysis, storage, admin logic, publication controls and scheduled workflows are unchanged. Existing dynamic paragraph, FAQs, keywords and contact data remain connected to the same content store. No production records are deleted.

## Market comparison

- AstroLabs: https://astrolabs.com/business-setup-saudi — clear progression from eligibility to incorporation and banking. Used to identify visitor questions and information structure, without copying promises, track records or timelines.
- TASC: https://tascoutsourcing.sa/en/services/business-setup-in-saudi-arabia — distinguishes pre-incorporation, incorporation and operational readiness. No adoption of its commercial guarantees.
- TMF: https://www.tmf-group.com/en/locations/middle-east-africa/saudi-arabia/ — highlights ongoing administration after incorporation. No claims of equivalent capabilities or credentials.

## Official factual sources

- MISA updated Investment Law: https://misa.gov.sa/activities/laws-regulations-copy/
- MISA investor FAQ, page last modified 10 November 2026: https://misa.gov.sa/frequently-asked-questions/
- Ministry of Commerce LLC service: https://mc.gov.sa/en/eservices/Pages/ServiceDetails.aspx?sid=99
- Ministry of Commerce foreign investment company service: https://mc.gov.sa/ar/eservices/pages/ServiceDetails.aspx?sID=20
- SAMA account rules: https://rulebook.sama.gov.sa/en/account-opening-rules
- SAMA beneficial owner guidance: https://rulebook.sama.gov.sa/en/entiresection/3634
- Ministry of Justice licensed lawyer directory: https://www.moj.gov.sa/ar/eServices/Pages/10abd1a2-a4c2-4951-a464-ac926eb24417.aspx
- Saudi legislation portal: https://laws.boe.gov.sa/
- Premium Residency investor product: https://pr.gov.sa/product-details-investor-residency
- Premium Residency product terms: https://pr.gov.sa/services-terms
- CMA regulations and FAQs: https://cma.gov.sa/en/RulesRegulations/Regulations/Pages/default.aspx and https://cma.gov.sa/en/RulesRegulations/FAQ/Pages/FAQs.aspx

## Editorial decisions

- Replace universal MISA licence and ownership promises with activity-specific investment registration guidance.
- Separate government service charges, capital thresholds, professional fees and operational costs. LLC government fee items and the Business Investor Residency threshold and product fee are labelled by scope and linked to official sources. They are not an all-inclusive quote or approval guarantee.
- Give each of the six services its own preparation checklist, decision guidance, budget explanation and FAQ in Arabic, English and Simplified Chinese.
- Do not present unverified licence numbers, office branches, social accounts, affiliations or performance statistics as facts.
- Keep machine-readable content discoverable through metadata and its existing endpoint, with no customer-facing AI button.
- Government portal links can be JavaScript-dependent or intermittently inaccessible. Confirm the current official application terms and invoice before a transaction. Arabic official texts govern when translations differ.

## Verification and boundaries

- Local production build passed.
- Browser checks: Arabic / English / Chinese switching and language direction; service navigation; desktop and 390px mobile presentation; no horizontal overflow in tested views.
- Dynamic content read paths remain getContent() and the existing fields; no database migration, account change, publication-mode change or schedule change is included.
- Admin defects observed during the initial audit (including /admin/geo returning 404) are not fixed in this design-and-content release, following the user's final scope restriction.

## Search and AI discovery update

The follow-up presentation release adds independent /en and /zh URLs for all seven public pages, localized canonical and reciprocal hreflang metadata, unique titles/descriptions, Open Graph metadata, visible topic wording in the home H1, and page-matched FAQ/Breadcrumb JSON-LD. The sitemap contains 21 public URLs. Admin pages are noindex and administrative endpoints are excluded from robots crawling; crawler exclusions do not replace authentication.

The smoke checker validates all 21 pages, metadata, heading counts, JSON-LD parsing and sitemap entries. These changes improve crawlability and clarity; no search ranking or AI citation position is guaranteed. No keyword stuffing or hidden search-only copy is added.

Guidance: https://developers.google.com/search/docs/appearance/ai-features and https://developers.google.com/search/docs/specialty/international/localized-versions
