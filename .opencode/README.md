# OpenCode GEO Intelligence Skill Catalog

Ten repo-local, self-contained OpenCode skills are installed under `.opencode/skills/<id>/SKILL.md`.

| ID | Purpose |
| --- | --- |
| `saudi-investment-expert` | Verify Saudi investor-services requirements, MISA registration, company formation, licensing, banking and residence eligibility against official sources. |
| `competitor-intelligence` | Discover real competing investor-service providers, collect verifiable URLs, classify competitors, and identify evidence-backed service gaps. |
| `keyword-research` | Research high-intent Arabic, English and Chinese keyword opportunities using transparent, dated volumes or explicitly unverified estimates. |
| `technical-seo` | Audit Next.js SEO discoverability, indexing, structured data, canonical URLs, multilingual hreflang and crawl correctness without invented search rankings. |
| `geo-ai-visibility` | Improve evidence-based citation eligibility and monitor actual AI-generated answer mentions across Arabic, English and Chinese queries. |
| `content-strategy` | Create original multilingual investor service content briefs with official references, user intent, accuracy and human approval for sensitive claims. |
| `conversion-optimization` | Improve real investor lead conversion via clear service offers, accessible CTAs and privacy-conscious attribution, not manipulative claims. |
| `evidence-verification` | Validate every factual GEO/SEO claim and competitor finding using traceable sources, freshness, provenance and safety gates. |
| `performance-analytics` | Track trustworthy SEO and GEO growth, qualified leads and attribution with dated baselines, sources, and no invented success claims. |
| `skill-improvement` | Propose and evaluate GEO agent skill improvements via evidence, isolated tests and human-approved GitHub review only. |

OpenCode discovers skills using their descriptions and loads them on demand via the `skill` tool (or explicit `@skill-id` prompt). The project-wide `AGENTS.md` supplies high-level rules and directs selection. Existing `.claude/skills` UI skills are preserved.

**Important:** a repository commit confirms installation, not use during an existing historical GitHub Actions run. The current workflow runs OpenCode from `.opencode-work/`; confirm via a new bounded test that its installed version discovers the ancestor project `AGENTS.md` and exact skill IDs. Do not trigger workflows or modify the runner without owner approval.

**Safety:** the skill-improvement skill proposes changes only. No scheduled runtime gets permission to edit these files.
