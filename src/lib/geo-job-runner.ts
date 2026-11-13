// GEO Job Runner — Creates jobs, validates, and dispatches to worker.
// Separated from worker (execution) and scheduler (triggering).
// No production writes. Local file storage only.

import { createJob, claimJob, findActiveJob, getJob, listJobs, recoverStaleJobs } from './geo-job-store';
import { runJobPipeline } from './geo-job-worker';
import { STAGE_PIPELINES } from './geo-job-worker';
import type { CreateJobInput, GeoJob, JobType } from './geo-job-types';

export interface RunJobResult {
  job: GeoJob;
  dispatched: boolean;
  message: string;
}

// Create a new job and optionally dispatch it
export async function submitJob(input: CreateJobInput, dispatch: boolean = true): Promise<RunJobResult> {
  // Idempotency check — don't create duplicate active jobs
  const idempotencyKey = input.idempotency_key || `${input.job_type}:${input.trigger_type}:${Date.now()}`;
  const activeJob = await findActiveJob(idempotencyKey);
  if (activeJob) {
    return {
      job: activeJob,
      dispatched: false,
      message: `Active job already exists: ${activeJob.job_id} (status: ${activeJob.status})`,
    };
  }

  // Concurrency check — no two jobs of same type running
  const runningJobs = await listJobs({ status: 'running' });
  const sameTypeRunning = runningJobs.find((j) => j.job_type === input.job_type);
  if (sameTypeRunning) {
    return {
      job: sameTypeRunning,
      dispatched: false,
      message: `Another ${input.job_type} job is already running: ${sameTypeRunning.job_id}`,
    };
  }

  // Recover stale jobs first
  await recoverStaleJobs();

  // Create the job
  const job = await createJob({ ...input, idempotency_key: idempotencyKey });

  if (dispatch) {
    // Dispatch asynchronously (fire-and-forget, but tracked)
    // In production, this would be a queue (BullMQ, etc.) or edge function
    // For local testing, we use setImmediate to avoid blocking HTTP response
    setImmediate(() => {
      dispatchJob(job.job_id).catch((e) => {
        console.error(`[JobRunner] Failed to dispatch job ${job.job_id}:`, e.message);
      });
    });
  }

  return {
    job,
    dispatched: dispatch,
    message: dispatch ? `Job created and dispatched: ${job.job_id}` : `Job created (queued): ${job.job_id}`,
  };
}

// Dispatch a job to the worker (claim + execute)
export async function dispatchJob(jobId: string): Promise<void> {
  const workerId = `worker-${process.pid}-${Date.now()}`;
  const claimed = await claimJob(jobId, workerId);
  if (!claimed) {
    console.warn(`[JobRunner] Could not claim job ${jobId} — already claimed or not claimable`);
    return;
  }

  try {
    await runJobPipeline(claimed);
  } catch (e) {
    console.error(`[JobRunner] Job ${jobId} pipeline failed:`, e instanceof Error ? e.message : String(e));
    // Mark as failed
    const { updateJob } = await import('./geo-job-store');
    await updateJob(jobId, {
      status: 'failed',
      error_code: 'PIPELINE_EXCEPTION',
      safe_error_message: e instanceof Error ? e.message : String(e),
    });
  }
}

// Get job status
export async function getJobStatus(jobId: string): Promise<GeoJob | null> {
  return getJob(jobId);
}

// List jobs with filters
export async function listAllJobs(filters?: {
  status?: string;
  job_type?: string;
  limit?: number;
}): Promise<GeoJob[]> {
  return listJobs(filters as any);
}

// Request cancellation
export async function cancelJob(jobId: string): Promise<GeoJob | null> {
  const { requestCancellation } = await import('./geo-job-store');
  return requestCancellation(jobId);
}

// Retry a failed job
export async function retryJob(jobId: string): Promise<RunJobResult> {
  const job = await getJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  if (job.status !== 'failed' && job.status !== 'partial' && job.status !== 'blocked') {
    throw new Error(`Cannot retry job in status: ${job.status}`);
  }
  if (job.retry_count >= job.max_retries) {
    throw new Error(`Max retries exceeded (${job.retry_count}/${job.max_retries})`);
  }

  // Create a new job with same params (idempotency via new key)
  const newKey = `${job.job_type}:${job.trigger_type}:retry:${job.retry_count + 1}:${Date.now()}`;
  const result = await submitJob(
    {
      job_type: job.job_type as JobType,
      trigger_type: job.trigger_type as any,
      idempotency_key: newKey,
      max_retries: job.max_retries,
    },
    true
  );

  // Increment retry count on original
  const { updateJob } = await import('./geo-job-store');
  await updateJob(jobId, {
    retry_count: job.retry_count + 1,
  });

  return result;
}

// Register default stage handlers (stubs for now — real implementation in Phase 2)
export function registerDefaultStages() {
  const { registerStage } = require('./geo-job-worker');

  // Discovery stage (stub — calls existing runDiscovery)
  registerStage('discovery', async (ctx: any) => {
    const { runDiscovery } = await import('./market-intelligence');
    const result = await runDiscovery({ triggeredBy: ctx.triggerType as any });
    return {
      records_processed: (result as any)?.competitors_found || 0,
      checkpoint_data: { discovery_result: result },
      next_stage: null,
      status: 'success',
    };
  });

  // Evidence update stage (stub)
  registerStage('evidence_update', async (ctx: any) => {
    // In production: refresh competitor observations, update keywords
    // For now: no-op (data already in Supabase)
    return {
      records_processed: 0,
      checkpoint_data: { evidence_updated: true },
      next_stage: null,
      status: 'success',
    };
  });

  // GEO analysis stage (stub — LLM may be unavailable)
  registerStage('geo_analysis', async (ctx: any) => {
    // Check if LLM is available
    const base = process.env.FREELLMAPI_BASE_URL;
    if (!base) {
      return {
        records_processed: 0,
        checkpoint_data: {},
        next_stage: null,
        status: 'blocked',
        error_code: 'LLM_UNAVAILABLE',
        safe_error_message: 'FREELLMAPI_BASE_URL not configured — LLM analysis blocked',
      };
    }
    // In production: call analyzeEvidence with evidence bundle
    // For now: stub
    return {
      records_processed: 0,
      checkpoint_data: { geo_analysis: 'stub' },
      next_stage: null,
      status: 'partial',
      safe_error_message: 'GEO analysis stage is a stub — implement in Phase 2',
    };
  });

  // Opportunities stage (stub)
  registerStage('opportunities', async (ctx: any) => {
    return {
      records_processed: 0,
      checkpoint_data: { opportunities_created: 0 },
      next_stage: null,
      status: 'success',
    };
  });

  // Goals stage (stub)
  registerStage('goals', async (ctx: any) => {
    return {
      records_processed: 0,
      checkpoint_data: { goals_created: 0 },
      next_stage: null,
      status: 'success',
    };
  });

  // Drafts stage (stub)
  registerStage('drafts', async (ctx: any) => {
    return {
      records_processed: 0,
      checkpoint_data: { drafts_created: 0 },
      next_stage: null,
      status: 'success',
    };
  });
}

