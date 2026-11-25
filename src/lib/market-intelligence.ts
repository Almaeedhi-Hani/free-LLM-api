/** Stable public market API. Internal modules are server-side; storage credentials never enter client UI. */
export type { Language, CompetitorStatus, CompetitorSource, PageType, Intent, OpportunityType, Priority, OpportunityStatus, Confidence, GoalStatus, RunType, RunStatus, TriggeredBy, Evidence, SuccessMetric, Competitor, CompetitorObservation, Keyword, Opportunity, AgentGoal, AnalysisRun, UpsertCompetitorInput, RecordObservationInput, UpsertKeywordInput, CreateOpportunityInput, CreateGoalInput } from './market/types';
export { normalizeDomain, detectLanguage, classifyIntent } from './market/classification';
export { scoreOpportunity, priorityFromScore, prioritizeGoals } from './market/scoring';
export { isExcludedDomain } from './market/domain-exclusions';
export { normalizeKeywordCore, clusterKeywords } from './market/keyword-clustering';
export { listCompetitors, getCompetitor, upsertCompetitor, updateCompetitor, disqualifyCompetitor, recordObservation, findVerifiedSerpObservation, listObservations } from './market/competitors';
export { upsertKeyword, listKeywords, updateKeyword, deleteKeyword } from './market/keywords';
export { createOpportunity, updateOpportunity, listOpportunities } from './market/opportunities';
export { createGoal, updateGoal, listGoals } from './market/goals';
export { startRun, finishRun, listRuns } from './market/runs';
export { runMarketAnalysis } from './market/analysis';
export type { DiscoveryConfig, DiscoverySummary } from './market/discovery';
export { runDiscovery } from './market/discovery';
export { runRadar, listAvailableSources } from './market/radar';
