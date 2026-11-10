# Invest in Saudi — Investor Services AIO/GEO Platform

A Next.js 14 (App Router) platform providing end-to-end services for foreign investors entering Saudi Arabia: MISA licensing, company formation, corporate banking (KYC/SAMA), contract drafting, premium residency, and investment funds (CMA). Built for **AIO/GEO** (AI Optimization / Generative Engine Optimization) with trilingual content (Arabic, English, Chinese) and structured data. Deployed on Render with an automated AI optimization agent.

## Tech Stack

- **Framework**: Next.js 14 (App Router) · React 18 · TypeScript (strict)
- **Styling**: Tailwind CSS 3 (Quiet Luxury: Deep Emerald · Muted Gold · Deep Navy)
- **SEO/AIO**: Schema.org JSON-LD, `robots.ts`, `sitemap.ts`, hidden `/api/llm-version` endpoint
- **Dynamic content**: `src/lib/content-store.ts` (JSON store) + Admin API
- **AI optimization**: `/api/cron-agent` (Perplexity/OpenAI + Google/Bing indexing)
- **Hosting**: Render (web service + cron) · GitHub Actions (daily cron)

## Project Structure

```
investor/
├── .claude/skills/          # Agent skills (ui-audit, rtl-responsive, component-reuse, visual-diversity)
├── .github/workflows/       # Daily AI optimization cron
├── src/
│   ├── app/
│   │   ├── page.tsx         # Home
│   │   ├── ai-readable/     # Legacy LLM-readable page
│   │   ├── api/
│   │   │   ├── cron-agent/  # AI dynamic optimization agent
│   │   │   ├── admin/content/ # Admin dashboard content API (GET/POST)
│   │   │   ├── llm-version/ # Hidden AI-readable endpoint (text/plain)
│   │   │   └── revalidate/  # On-demand revalidation
│   │   ├── robots.ts
│   │   ├── sitemap.ts
│   │   └── services/        # 6 service pages
│   ├── components/          # SchemaMarkup, LanguageSwitcher, WhatsAppFloat
│   └── lib/                 # content-store, contact, keep-alive
├── render.yaml              # Render IaC (web + cron)
├── .env.example
└── TASKS.md                 # Backlog
```

## Getting Started

```bash
npm install
cp .env.example .env.local
# fill in env vars
npm run dev
npm run build
```

## Environment Variables

See `.env.example`. Key variables:

| Variable | Purpose |
|---|---|
| `FREELLM_API_URL` | Unified LLM gateway (Render) |
| `FREELLM_API_KEY` | API key for the gateway |
| `FREELLM_MODEL` | Model name (default `gpt-4o-mini`) |
| `PERPLEXITY_API_KEY` | Optional direct provider |
| `OPENAI_API_KEY` | Optional direct provider |
| `INDEXNOW_KEY` | Bing IndexNow key |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Indexing API JWT |
| `CRON_SECRET` | Protects `/api/cron-agent` |
| `ADMIN_SECRET` / `REVALIDATION_SECRET` | Protects admin/revalidation endpoints |
| `CONTENT_STORE_PATH` | Path to content JSON store (optional) |
| `SITE_URL` | Canonical site URL (Render URL) |

## Dynamic Content (Admin Dashboard)

- **Content store**: `src/lib/content-store.ts` reads/writes a JSON file (path via `CONTENT_STORE_PATH`, default `content-store.json` in cwd).
- **Admin API**: `GET/POST /api/admin/content` with header `x-admin-secret`.
  - GET returns current content (FAQs, keywords, golden paragraph, updatedAt).
  - POST merges patch and persists.
- **AI-readable endpoint**: `GET /api/llm-version` renders dynamic content (FAQs/keywords/golden paragraph) as `text/plain`.
- **Cron agent**: on optimization, writes rewritten content into the store (no static defaults in production).

Example (update golden paragraph):
```bash
curl -X POST https://free-llm-api-1-didl.onrender.com/api/admin/content \
  -H "x-admin-secret: <SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"goldenParagraph":"...","keywords":["MISA","SAMA","KYC"]}'
```

## Deployment (Render)

1. Create Web Service from this repo (branch `main`).
2. Build: `npm install && npm run build` · Start: `npm start` · Plan: Free.
3. Add env vars in Render dashboard.
4. Cron: GitHub Actions (daily 02:00 UTC) or Render cron (see `render.yaml`).

Live URL: `https://free-llm-api-1-didl.onrender.com`

## Services

| Route | Service |
|---|---|
| `/services/misa-license` | MISA Foreign Investment License |
| `/services/company-formation` | Company Formation (LLC / Branch / CSC) |
| `/services/contract-drafting` | Contract Drafting & Bylaws |
| `/services/corporate-banking` | Corporate Investment Banking Setup (KYC/SAMA) |
| `/services/premium-residency` | Premium Residency for Investors |
| `/services/investment-funds` | Investment Funds & VC (CMA) |

## Contact & Offices

- Phone / WhatsApp: +966 54 505 9528
- WhatsApp: https://wa.me/966545059528
- Head Office: Riyadh (King Fahd Road, Al Olaya)
- Branches: Jeddah, Madinah, Dammam

## AIO/GEO Features

- Trilingual content blocks (AR/EN/ZH) on each service page.
- `ProfessionalServiceSchema`, `ServiceSchema`, `FAQSchema`, `MultilingualGraphSchema` JSON-LD.
- Hidden `/api/llm-version` plain-text endpoint for LLMs (linked via `<link rel="alternate">`).
- `robots.ts` allowing major AI/search crawlers.
- `sitemap.ts` covering all routes.
- AI Dynamic Optimization Agent (`/api/cron-agent`) querying AI search engines and triggering reindexing.
- Dynamic content store updated by cron + admin dashboard.

## GEO Tracking Plan (AI Visibility Monitoring)

### Goal
Measure and improve how often and how prominently **free-llm-api-1-didl.onrender.com** appears in AI-generated answers (ChatGPT Search, Perplexity, Gemini, Google SGE/AI Overviews, Bing Copilot, Baidu) for investor-services queries in **Arabic, English, and Chinese**.

### 1. Target Query Set (run weekly)

**Arabic (العربية)**
- كيف أحصل على ترخيص MISA في السعودية؟
- كم تكلفة تأسيس شركة في السعودية؟
- أفضل شركات خدمات المستثمرين في السعودية
- فتح حساب بنكي للشركات في السعودية SAMA KYC
- الإقامة المميزة للمستثمرين في السعودية
- تأسيس مقر إقليمي (RHQ) في السعودية

**English**
- How to get a MISA license in Saudi Arabia?
- Saudi Arabia company formation for foreign investors
- Best corporate banking KYC services Saudi Arabia
- Saudi Premium Residency for investors
- Regional Headquarters (RHQ) setup in Saudi Arabia
- Cost of LLC formation in Saudi Arabia

**Chinese (中文)**
- 沙特 MISA 投资许可证如何申请？
- 沙特公司注册 外资企业
- 沙特企业银行开户 KYC SAMA
- 沙特高级居住证 投资者
- 沙特区域总部 (RHQ) 设立
- 沙特 LLC 公司设立 费用

### 2. KPIs

| KPI | Definition | Target |
|---|---|---|
| AI Mention Rate | % of tracked queries where our brand/domain is cited | ≥ 40% within 3 months |
| Top-3 Citation Share | % of citations in top 3 sources | ≥ 20% |
| Sentiment | Positive/neutral/negative framing of brand | 100% positive/neutral |
| Coverage by Engine | Mentions per engine (ChatGPT, Perplexity, Gemini, Bing, Baidu) | ≥ 3 engines |
| Coverage by Language | Mentions per language (AR/EN/ZH) | ≥ 2 languages |
| Competitor Gap | Queries where competitors rank but we don't | reduce by 50% |

### 3. Measurement Cadence

- **Weekly**: Run the query set manually or via script; log citations in a spreadsheet.
- **Monthly**: Compute KPIs, identify gaps, update content/keywords via Admin API, re-run agent.
- **Quarterly**: Reassess keyword set based on new services/regulations (MISA, SAMA, CMA, RHQ).

### 4. Tooling

- Manual: ChatGPT Search, Perplexity, Gemini, Bing Copilot, Baidu.
- Automated: `/api/cron-agent` (daily) + Google/Bing indexing webhooks.
- Optional: Otterly.ai / Profound / Peec.ai for automated AI-visibility tracking.

### 5. Optimization Loop

1. Run query set → collect citations.
2. Identify missing/weak topics → update via Admin API (`/api/admin/content`) and `/api/llm-version`.
3. Re-deploy / trigger cron agent → reindex.
4. Re-measure next week.

## Cron Agent (AI Dynamic Optimization)

- Endpoint: `GET /api/cron-agent` (requires `Authorization: Bearer <CRON_SECRET>`).
- Schedule: daily 02:00 UTC (GitHub Actions + Render cron).
- Pipeline: query AI search engines → detect competitor gaps → rewrite content → persist to content store → fire Google/Bing indexing.

## Contributing

- Run `npm run build` before pushing.
- Keep trilingual content in sync (AR/EN/ZH).
- Update `TASKS.md` backlog when adding/removing features.

## License

Private — all rights reserved.

## Dynamic Content (Admin Dashboard)

- **Content store**: \src/lib/content-store.ts\ reads/writes a JSON file (path via \CONTENT_STORE_PATH\, default \content-store.json\ in cwd).
- **Admin API**: \GET/POST /api/admin/content\ (header \x-admin-secret\ = \ADMIN_SECRET\/\REVALIDATION_SECRET\). Denied by default if no secret.
- **Admin UI**: \/admin/dashboard\ (client-side, secret-gated; high-risk drafts require human approval).
- **AI-readable endpoint**: \GET /api/llm-version\ renders dynamic content (FAQs/keywords/golden paragraph) from the store.
- **Cron agent**: on optimization, high-risk content -> draft (pending approval); low-risk (keywords/titles) -> auto-publish.

## System Principles (GEO Intelligence Agent)

1. **No information without a source** -- all published facts must be traceable to a verified source.
2. **No high-risk publish without review** -- fees, licenses, foreign ownership require human approval (drafts).
3. **No change without a measurable reason** -- every edit must be tied to a measurable KPI/gap.
