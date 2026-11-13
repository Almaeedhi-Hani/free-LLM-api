---
name: technical-seo
description: Audit Next.js SEO discoverability, indexing, structured data, canonical URLs, multilingual hreflang and crawl correctness without invented search rankings.
---

# Technical SEO
## Workflow
1. Inspect real routes and generated output: sitemap.xml, robots.txt, canonical, hreflang, indexability, redirects, HTTP status, titles, descriptions, page headings and link navigation.
2. For this repo review src/lib/site-seo.ts, src/app/sitemap.ts, src/app/robots.ts, service catalog and app routes. Separate repository checks from live production checks.
3. Validate Arabic RTL, English and Chinese alternate links; use correctly reciprocal language URLs and x-default where appropriate. Check duplicate content and language-specific titles.
4. Check schema against visible content. Structured data cannot manufacture rankings, eligibility or rich-result guarantees.
5. When accessible, use Search Console indexing, coverage and performance data. Diagnose missing proof without guessing.
6. Suggest bounded changes with tests, before/after evidence and rollback; do not push/deploy without explicit approval.
## Output
Issue, affected URL/file, reproducible evidence, expected impact, priority, safe fix, test and limitations.
