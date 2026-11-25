

export type Language = 'ar' | 'en' | 'zh';
export type CompetitorStatus = 'active' | 'inactive' | 'disqualified';
export type CompetitorSource = 'manual' | 'search' | 'directory' | 'referral';
export type PageType = 'landing' | 'service' | 'blog' | 'faq' | 'other';
export type Intent = 'informational' | 'transactional' | 'navigational' | 'commercial';
export type OpportunityType =
  | 'content_gap'
  | 'keyword_gap'
  | 'faq_gap'
  | 'service_gap'
  | 'authority_gap';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type OpportunityStatus = 'new' | 'triaged' | 'planned' | 'done' | 'rejected';
export type Confidence = 'high' | 'medium' | 'low';
export type GoalStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
export type RunType = 'radar' | 'discovery' | 'keyword_collection' | 'gap_analysis' | 'goal_generation' | 'full';
export type RunStatus = 'running' | 'success' | 'failed' | 'partial';
export type TriggeredBy = 'manual' | 'cron' | 'github_actions' | 'admin';

export interface Evidence {
  source: string;
  url?: string;
  quote?: string;
  observed_at?: string;
  // 'keyword' = derived from keyword collection; 'competitor' = backed by a
  // competitor observation; 'manual' = entered by an operator.
  origin?: 'keyword' | 'competitor' | 'manual';
}

export interface SuccessMetric {
  metric: string;
  target: string;
  measurement: string;
}

export interface Competitor {
  id: string;
  name: string;
  domain: string;
  languages: Language[];
  market: string;
  status: CompetitorStatus;
  source: CompetitorSource;
  notes?: string;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface CompetitorObservation {
  id: string;
  competitor_id: string;
  observed_at: string;
  language: Language;
  query: string;
  rank?: number | null;
  title?: string;
  snippet?: string;
  url?: string;
  page_type?: PageType | null;
  strengths: string[];
  weaknesses: string[];
  raw?: Record<string, unknown> | null;
}

export interface Keyword {
  id: string;
  term: string;
  language: Language;
  intent: Intent;
  cluster?: string;
  source: string;
  search_volume?: number | null;
  volume_source?: string | null;
  volume_confidence: Confidence | 'unknown';
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  title: string;
  type: OpportunityType;
  priority: Priority;
  score: number;
  evidence: Evidence[];
  languages: Language[];
  related_keywords: string[];
  related_competitors: string[];
  status: OpportunityStatus;
  confidence: Confidence;
  estimated_impact?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentGoal {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: GoalStatus;
  evidence: Evidence[];
  success_metrics: SuccessMetric[];
  confidence: Confidence;
  related_opportunity_id?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface AnalysisRun {
  id: string;
  run_type: RunType;
  started_at: string;
  finished_at?: string | null;
  status: RunStatus;
  summary?: Record<string, unknown> | null;
  error?: string | null;
  triggered_by: TriggeredBy;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface UpsertCompetitorInput {
  name: string;
  domain: string;
  languages?: Language[];
  market?: string;
  source?: CompetitorSource;
  notes?: string;
}

export interface RecordObservationInput {
  competitor_id: string;
  language: Language;
  query: string;
  rank?: number | null;
  title?: string;
  snippet?: string;
  url?: string;
  page_type?: PageType | null;
  strengths?: string[];
  weaknesses?: string[];
  raw?: Record<string, unknown> | null;
  observed_at?: string;
}

export interface UpsertKeywordInput {
  term: string;
  language: Language;
  intent?: Intent;
  cluster?: string;
  source: string;
  search_volume?: number | null;
  volume_source?: string | null;
  volume_confidence?: Confidence | 'unknown';
}

export interface CreateOpportunityInput {
  title: string;
  type: OpportunityType;
  priority?: Priority;
  score?: number;
  evidence: Evidence[];
  languages?: Language[];
  related_keywords?: string[];
  related_competitors?: string[];
  confidence?: Confidence;
  estimated_impact?: string;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  priority?: Priority;
  evidence: Evidence[];
  success_metrics: SuccessMetric[];
  confidence?: Confidence;
  related_opportunity_id?: string | null;
}
