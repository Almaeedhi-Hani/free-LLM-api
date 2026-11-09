# Invest in Saudi — Investor Services AIO/GEO Platform

A Next.js 14 (App Router) platform providing end-to-end services for foreign investors entering Saudi Arabia: MISA licensing, company formation, corporate banking, contract drafting, premium residency, and investment funds. Built for **AIO/GEO** (AI Optimization / Generative Engine Optimization) with trilingual content (Arabic, English, Chinese) and structured data.

## Tech Stack

- **Framework**: Next.js 14 (App Router) · React 18 · TypeScript (strict)
- **Styling**: Tailwind CSS 3 (custom `primary` / `gold` palette)
- **SEO/AIO**: Schema.org JSON-LD, `robots.ts`, `sitemap.ts`, AI-readable endpoint
- **Dynamic optimization**: `/api/cron-agent` (Perplexity/OpenAI + Google/Bing indexing)
- **Hosting**: Render (web service + cron) / GitHub Actions (daily cron)

## Project Structure

```
investor/
├── .claude/skills/          # Agent skills (ui-audit, rtl-responsive, ...)
├── .github/workflows/       # Daily AI optimization cron
├── src/
│   ├── app/
│   │   ├── page.tsx         # Home
│   │   ├── ai-readable/     # LLM-readable text version
│   │   ├── api/cron-agent/  # AI dynamic optimization agent
│   │   ├── api/revalidate/  # On-demand revalidation
│   │   ├── robots.ts
│   │   ├── sitemap.ts
│   │   └── services/        # 6 service pages
│   ├── components/          # SchemaMarkup, LanguageSwitcher
│   └── lib/keep-alive.ts
├── render.yaml              # Render IaC (web + cron)
├── .env.example
└── TASKS.md                 # Backlog
```

## Getting Started

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env.local
# fill in FREELLM_API_URL, FREELLM_API_KEY, CRON_SECRET, etc.

# 3. Run dev server
npm run dev

# 4. Build
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
| `REVALIDATION_SECRET` | Protects `/api/revalidate` |
| `SITE_URL` | Canonical site URL |

## Deployment (Render)

1. Create a Web Service from this repo.
2. Build command: `npm install && npm run build`
3. Start command: `npm start`
4. Add all env vars in the Render dashboard (or via `render.yaml`).
5. (Optional) The `render.yaml` also defines a daily cron job that pings `/api/cron-agent`.

## Services

| Route | Service |
|---|---|
| `/services/misa-license` | MISA Foreign Investment License |
| `/services/company-formation` | Company Formation (LLC / Branch / CSC) |
| `/services/contract-drafting` | Contract Drafting & Bylaws |
| `/services/corporate-banking` | Corporate Investment Banking Setup (KYC/SAMA) |
| `/services/premium-residency` | Premium Residency for Investors |
| `/services/investment-funds` | Investment Funds & VC (CMA) |

## AIO/GEO Features

- Trilingual content blocks (AR/EN/ZH) on each service page.
- `ProfessionalServiceSchema`, `ServiceSchema`, `FAQSchema`, `MultilingualGraphSchema` JSON-LD.
- `/api/llm-version` plain-text endpoint for LLMs (hidden from UI, linked via `<link rel="alternate">`).
- `robots.ts` allowing major AI/search crawlers (GPTBot, PerplexityBot, ClaudeBot, Google-Extended, Baiduspider, Yandex, etc.).
- `sitemap.ts` covering all routes.
- AI Dynamic Optimization Agent (`/api/cron-agent`) querying AI search engines and triggering reindexing.

## Contact & Offices

- Phone / WhatsApp: +966 54 505 9528
- WhatsApp: https://wa.me/966545059528
- Head Office: Riyadh (King Fahd Road, Al Olaya)
- Branches: Jeddah, Madinah, Dammam

## GEO Tracking Plan (AI Visibility Monitoring)

### Goal
Measure and improve how often and how prominently **investinsaudi-services.sa** appears in AI-generated answers (ChatGPT Search, Perplexity, Gemini, Google SGE/AI Overviews, Bing Copilot, Baidu) for investor-services queries in **Arabic, English, and Chinese**.

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
- **Monthly**: Compute KPIs, identify gaps, update content/keywords, re-run agent.
- **Quarterly**: Reassess keyword set based on new services/regulations (MISA, SAMA, CMA, RHQ).

### 4. Tooling

- Manual: ChatGPT Search, Perplexity, Gemini, Bing Copilot, Baidu.
- Automated: `/api/cron-agent` (daily) + Google/Bing indexing webhooks.
- Optional: Otterly.ai / Profound / Peec.ai for automated AI-visibility tracking.

### 5. Optimization Loop

1. Run query set → collect citations.
2. Identify missing/weak topics → add keywords to service pages + `/ai-readable`.
3. Update FAQ/golden paragraphs to fill knowledge gaps (use agent rewrite).
4. Re-deploy → trigger `/api/cron-agent` → reindex.
5. Re-measure next week.

## Cron Agent (AI Dynamic Optimization)

- Endpoint: `GET /api/cron-agent` (requires `Authorization: Bearer <CRON_SECRET>`).
- Schedule: daily 02:00 UTC (GitHub Actions + Render cron).
- Pipeline: query AI search engines → detect competitor gaps → rewrite content → persist to content store → fire Google/Bing indexing.

## Dynamic Content (Admin Dashboard)

- Content store: `src/lib/content-store.ts` (JSON file, path via `CONTENT_STORE_PATH`).
- Admin API: `GET/POST /api/admin/content` (header `x-admin-secret` = `ADMIN_SECRET`/`REVALIDATION_SECRET`).
- `/api/llm-version` renders dynamic FAQs/keywords/golden paragraph from the store.
- Cron agent writes optimized content into the store (no static defaults in production).

## Contributing

- Run `npm run build` before pushing.
- Keep trilingual content in sync (AR/EN/ZH).
- Update `TASKS.md` backlog when adding/removing features.

## License

Private — all rights reserved.
