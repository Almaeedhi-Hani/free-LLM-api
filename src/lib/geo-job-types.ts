// GEO Job Types — Unified job runner for automated + manual execution.
// All new feature flags default OFF. No auto-publish.

export type JobType =
  | 'discovery'
  | 'evidence_update'
  | 'geo_analysis'
  | 'full_pipeline';

export type TriggerType = 'manual' | 'scheduled';

export type JobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'partial'
  | 'blocked'
  | 'cancelled';

export type JobStage =
  | 'discovery'
  | 'evidence_update'
  | 'geo_analysis'
  | 'opportunities'
  | 'goals'
  | 'drafts'
  | 'completed';

export interface GeoJob {
  job_id: string;
  job_type: JobType;
  trigger_type: TriggerType;
  status: JobStatus;
  stage: JobStage | null;
  progress: number; // 0-100
  records_processed: number;
  started_at: string | null;
  finished_at: string | null;
  error_code: string | null;
  safe_error_message: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  heartbeat_at: string | null;
  lease_expires_at: string | null;
  cancellation_requested_at: string | null;
  run_id: string | null; // links to analysis_runs
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  // Checkpoint data for resumability
  checkpoint: JobCheckpoint | null;
}

export interface JobCheckpoint {
  completed_stages: JobStage[];
  stage_data: Record<string, unknown>;
  last_successful_stage: JobStage | null;
}

export interface CreateJobInput {
  job_type: JobType;
  trigger_type: TriggerType;
  idempotency_key?: string;
  max_retries?: number;
}

export interface JobProgressUpdate {
  stage?: JobStage;
  progress?: number;
  records_processed?: number;
  status?: JobStatus;
  error_code?: string | null;
  safe_error_message?: string | null;
  checkpoint?: JobCheckpoint;
  run_id?: string | null;
  retry_count?: number;
}

// Lease duration in ms (worker must heartbeat within this window)
export const LEASE_DURATION_MS = 60_000; // 60s
export const HEARTBEAT_INTERVAL_MS = 15_000; // 15s
export const MAX_RETRIES_DEFAULT = 3;
export const RETRY_BACKOFF_BASE_MS = 5_000; // 5s base
