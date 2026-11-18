# GEO Direct Model Providers

This change connects four model-provider GitHub Actions repository secrets, not OpenCode Console or Render secrets.

## Fixed allowlisted providers

| GitHub Secret | Model (free-plan or developer trial) | Endpoint |
| --- | --- | --- |
| GEMINI_API_KEY | gemini-2.5-flash-lite | Gemini Developer API |
| GROQ_API_KEY | openai/gpt-oss-20b | GroqCloud Chat Completions |
| NVIDIA_API_KEY | meta/llama-3.1-8b-instruct | NVIDIA Build hosted NIM |
| OPENROUTER_API_KEY | openrouter/free (zero-price free model router) | OpenRouter Chat Completions |

The scheduled workflow sets GEO_LLM_MODE=direct. No OpenCode CLI or Console account credential is used. Exa, Tavily and Parallel remain market SEARCH inputs, distinct from model inference.

## Guardrails and confirmation

- Static HTTPS endpoints and models only; no arbitrary provider, model, paid-model fallback or automatic spending enablement.
- At most 3 provider calls per locale and 9 across Arabic, English and Chinese in one full cycle. Each call is bounded by a 90/60/45 second deadline. No unsafe retries.
- Provider errors, quota limits, missing keys and invalid JSON rotate to the next available provider; never fabricate content or turn a failed language green.
- Only provider names and model IDs are reported; no key values, model prompts, or response errors with sensitive payloads are logged.
- Four GitHub Secrets are read during the scheduled GEO job; research inputs and saved Supabase/Render credentials stay separate.
- Existing source-backed content quality gates, all six Saudi scheduled workflows, 2-hour to 4-hour Sunday switch, publication daily quota, and production settings remain unchanged.

## Pricing and production checks

Free-plan eligibility is not a guarantee of zero costs if a provider account has billing or spend enabled. NVIDIA hosted trial usage is intended for developer prototyping; it may be limited by credits. Keep all provider accounts on their free allocations and apply billing caps at the provider. No code creates a billable plan.

Offline tests cover fixed requests for four APIs, 401/402/429 failures, response quality, no-provider fail closed and fallback rotation across all three languages. A true integration requires an actual post-merge GitHub Actions job and verified saved results; successful offline tests do not prove API keys and provider quotas.
