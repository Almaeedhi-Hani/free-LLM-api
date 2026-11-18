# GEO Direct Model Providers

This change connects four model-provider GitHub Actions repository secrets, not OpenCode Console or Render secrets.

## Fixed allowlisted providers

| GitHub Secret | Model (free-plan or developer trial) | Endpoint |
| --- | --- | --- |
| GROQ_API_KEY | openai/gpt-oss-20b | GroqCloud Chat Completions — 1,000 RPD and 200,000 tokens/day on published Free plan |
| GEMINI_API_KEY | gemini-3.1-flash-lite-preview | Google Gemini Developer API — free-tier pricing, quota per project |
| NVIDIA_API_KEY | nvidia/nvidia-nemotron-nano-9b-v2 | NVIDIA Build developer preview — variable trial credits and throttling |
| OPENROUTER_API_KEY | openrouter/free (zero-price free model router) | OpenRouter Chat Completions |

The scheduled workflow sets GEO_LLM_MODE=direct. No OpenCode CLI or Console account credential is used. Exa, Tavily and Parallel remain market SEARCH inputs, distinct from model inference.

## Guardrails and confirmation

- Static HTTPS endpoints and models only; no arbitrary provider, model, paid-model fallback or automatic spending enablement.
- Groq's current supported GPT-OSS-20B is first because its published Free-plan allowance is 1,000 requests/day (token rate remains a practical limit). Avoid deprecated Llama 3.1 8B even if stale rate-limit tables list a larger request allowance.
- The direct analysis uses a compact, evidence-grounded prompt (max 15,500 characters) to avoid exhausting the free-tier input token allowance.
- At most 3 provider calls per locale and 9 across Arabic, English and Chinese in one full cycle. Each call is bounded by a 90/60/45 second deadline. No unsafe retries.
- Groq GPT-OSS-20B uses JSON-object output mode and hides reasoning to reserve free response tokens.
- Provider errors, quota limits, missing keys and invalid JSON rotate to the next available provider; never fabricate content or turn a failed language green.
- Only provider names and model IDs are reported; no key values, model prompts, or response errors with sensitive payloads are logged.
- Four GitHub Secrets are read during the scheduled GEO job; research inputs and saved Supabase/Render credentials stay separate.
- Existing source-backed content quality gates, all six Saudi scheduled workflows, 2-hour to 4-hour Sunday switch, publication daily quota, and production settings remain unchanged.

## Pricing and production checks

Free-plan eligibility is not a guarantee of zero costs if a provider account has billing or spend enabled. NVIDIA hosted trial usage is intended for developer prototyping; it may be limited by credits. Keep all provider accounts on their free allocations and apply billing caps at the provider. No code creates a billable plan.

Offline tests cover fixed requests for four APIs, 401/402/429 failures, response quality, no-provider fail closed and fallback rotation across all three languages. A true integration requires an actual post-merge GitHub Actions job and verified saved results; successful offline tests do not prove API keys and provider quotas.
