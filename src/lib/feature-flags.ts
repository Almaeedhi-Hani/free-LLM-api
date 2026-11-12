// Feature flags for Phase 3 Unified GEO Agent.
// All default OFF until explicitly validated. Enable via env vars.

export const FLAGS = {
  ENABLE_LLM_ANALYSIS: process.env.ENABLE_LLM_ANALYSIS === 'true',
  ENABLE_AUTO_PUBLISH: process.env.ENABLE_AUTO_PUBLISH === 'true',
  ENABLE_COMPETITOR_FETCH: process.env.ENABLE_COMPETITOR_FETCH === 'true',
  ENABLE_UNIFIED_ORCHESTRATOR: process.env.ENABLE_UNIFIED_ORCHESTRATOR === 'true',
} as const;

export function flag(name: keyof typeof FLAGS): boolean {
  return FLAGS[name];
}

// Budget guard (per run)
export const BUDGET = {
  maxLlmCallsPerRun: Number(process.env.GEO_MAX_LLM_CALLS || 1),
  maxTokensPerRun: Number(process.env.GEO_MAX_TOKENS || 4000),
  maxCompetitorFetches: Number(process.env.GEO_MAX_COMPETITOR_FETCHES || 20),
} as const;
