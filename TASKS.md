# Project Status & Task Backlog

Project: **saudi-investor-services-aio** (Invest in Saudi – Investor Services AIO/GEO Platform)  
Stack: Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS  
Last reviewed: 2026-11-08

## 1. Project Structure (current)

```
investor/
├── .claude/settings.local.json
├── .env.example
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
└── src/
    ├── app/
    │   ├── layout.tsx                 # Root layout, header/nav/footer, metadata
    │   ├── page.tsx                   # Home (hero, metrics, services grid, FAQ)
    │   ├── globals.css
    │   ├── robots.ts
    │   ├── ai-readable/page.tsx       # LLM/AI-readable text version
    │   ├── api/
    │   │   ├── cron-agent/route.ts    # AI dynamic optimization agent (GET)
    │   │   └── revalidate/route.ts    # On-demand revalidation (POST)
    │   └── services/
    │       ├── misa-license/page.tsx
    │       ├── company-formation/page.tsx
    │       ├── contract-drafting/page.tsx
    │       ├── corporate-banking/page.tsx   # untracked (new)
    │       ├── premium-residency/page.tsx
    │       └── investment-funds/page.tsx
    ├── components/
    │   ├── LanguageSwitcher.tsx
    │   └── SchemaMarkup.tsx
    └── lib/
        └── keep-alive.ts
```

Notes:
- No `public/` directory (no favicon, OG images, or static assets).
- No `sitemap.ts` although `robots.ts` references `/sitemap.xml`.
- No `README.md`.
- Git working tree currently has uncommitted changes: modified `src/app/layout.tsx` and untracked `src/app/services/corporate-banking/`.

## 2. Completed Core Features

- [x] Next.js 14 App Router project with strict TypeScript and Tailwind.
- [x] Luxury B2B UI design: custom `primary`/`gold` palette, `golden-paragraph`, `luxury-card`, sticky header.
- [x] Root layout with trilingual service navigation (AR labels) and footer.
- [x] Home page: hero, trust metrics, services grid, FAQ + `FAQSchema`.
- [x] Service pages (6): MISA license, company formation, contract drafting, corporate banking, premium residency, investment funds.
- [x] Trilingual content blocks (Arabic / English / Chinese) on most service pages.
- [x] AI-readable endpoint (`/ai-readable`) for LLMs and AI search engines.
- [x] Structured data components: `ProfessionalServiceSchema`, `ServiceSchema`, `FAQSchema`, `MultilingualGraphSchema`.
- [x] `robots.ts` exposing rules for major global + AI crawlers.
- [x] Cron agent API (`/api/cron-agent`) querying Perplexity/OpenAI and triggering Google/Bing indexing.
- [x] Revalidation API (`/api/revalidate`).
- [x] Keep-alive utility for free hosting tiers.
- [x] Build passes (`npm run build` → 14 static/dynamic routes).
- [x] No `TODO/FIXME/XXX` markers found anywhere in the source.

## 3. Remaining Tasks / Gaps

### P0 – Must fix before production

- [ ] **Commit or review uncommitted work**  
  `src/app/layout.tsx` (nav/footer corporate-banking links) and new `src/app/services/corporate-banking/` are not committed.
- [x] **Add `src/app/sitemap.ts`**  
  `robots.ts` references `/sitemap.xml`; route now generated and build passes.
- [x] **Add corporate-banking card to Home services grid**  
  Home services grid now includes `/services/corporate-banking`.
- [ ] **Replace placeholder business data**  
  Phone `+966110000000`, CR `1010998877`, MISA `MISA-2024-LIC-9988`, address, and social links in `SchemaMarkup.tsx`/layout footer.
- [ ] **Implement real language switching**  
  `LanguageSwitcher` buttons have no handlers/routing; pages render all languages inline instead of locale-based routes.
- [ ] **Add contact/lead capture**  
  No contact page, form, or submission endpoint; only static phone text.
- [ ] **Add `public/` assets**  
  Favicon, apple-touch-icon, OG image, and any brand logos are missing.

### P1 – Functionality & SEO

- [ ] **Per-page metadata**  
  Only root `metadata` exists; service pages lack `title/description/canonical` (add `generateMetadata` or static `metadata`).
- [ ] **Fix typos in localized strings**  
  - `misa-license`: Fixed Korean character (`의` → `的`).  
  - `corporate-banking`: Chinese text contains a Korean character.  
  - Review all `zh` strings for mixed scripts.
- [ ] **Standardize FAQ language handling**  
  Several pages mix Arabic/English FAQ items in one `FAQSchema`; decide on per-locale FAQ lists.
- [x] **Update `/ai-readable` content**  
  Now lists all 6 services (MISA, company formation, contract drafting, corporate banking, premium residency, investment funds).
- [ ] **Improve structured data (Schema.org)**  
  - `MultilingualGraphSchema` only uses English for `FAQPage` and passes `name`/`description` objects where strings are expected.  
  - Add `contactPoint`, `email`, `logo`, and correct `sameAs` URLs.  
  - Make FAQ schema multilingual (or emit one per locale).
- [ ] **Align corporate-banking page schema usage**  
  Uses both `MultilingualGraphSchema` and `ServiceSchema`; ensure no duplicate/conflicting JSON-LD.
- [ ] **Wire up or remove `keep-alive.ts`**  
  `startKeepAlive` is never called. Either integrate on server startup or remove; add `/api/health` endpoint.
- [ ] **Complete or simplify cron agent**  
  - Google Indexing API uses `GOOGLE_SERVICE_ACCOUNT_JSON` as a raw JWT assertion (needs proper signed JWT).  
  - `rewriteWithGPT4o` receives empty current content; no CMS/DB integration.  
  - Add `vercel.json` (or Render cron) schedule and protect default when `CRON_SECRET` is unset.  
  - Consider persisting optimized content instead of only returning JSON.
- [ ] **Revalidation route usefulness**  
  `revalidateTag` is called but no tags are defined on pages/fetches; add cache tags or remove endpoint.
- [ ] **Clean `next.config.js`**  
  `optimizePackageImports: ["lucide-react"]` references an unused/uninstalled package; remove or install lucide-react.

### P2 – Quality, DX & operations

- [ ] **Add ESLint configuration**  
  `npm run lint` currently prompts to configure ESLint; add `.eslintrc`/flat config and fix warnings.
- [ ] **Add tests**  
  No tests exist; add at least build/smoke tests for routes and schema rendering.
- [ ] **Custom error/not-found pages**  
  Add `app/not-found.tsx` and `app/error.tsx` with localized content.
- [ ] **Accessibility (a11y)**  
  - Set `lang`/`dir` per locale instead of hardcoded `ar`/`rtl`.  
  - Add focus-visible styles and ARIA labels for nav/switcher.  
  - All content is text-only (no images), but verify contrast.
- [ ] **Performance**  
  - No `next/image` usage yet; plan for optimized images/OG.  
  - Review bundle size (First Load JS ~87 kB) and remove unused imports.
- [ ] **Observability**  
  Add structured logging and error reporting for API routes.
- [ ] **Documentation**  
  Add `README.md` with setup, env vars, deploy (Render/Vercel) instructions.
- [ ] **Git hygiene**  
  Remote is named `free-LLM-api` (mismatched); verify remote/branch strategy.  
  Add `.env.local` guidance and ensure secrets are not committed.

## 4. Imported Agent Skills (from previous project)

The following compatible UI skills were imported into `.claude/skills/` and adapted to this project:
- `component-reuse`
- `rtl-responsive`
- `ui-audit`
- `visual-diversity`

## 5. Suggested Next Sprint (ordered)

1. Commit/review current changes + add `sitemap.ts`.  
2. Add home card + fix typos + update `/ai-readable`.  
3. Implement per-page metadata + schema improvements.  
4. Language switching strategy decision (client toggle vs. locale routes).  
5. Contact form + real business data.  
6. Cron agent hardening or removal.  
7. ESLint + README + tests.