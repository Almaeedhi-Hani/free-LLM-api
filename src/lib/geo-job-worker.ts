// GEO Job Worker — Executes job stages with progress tracking.
// Separated from runner (which creates jobs) and scheduler (which triggers them).
// No production writes. Local file storage only.

import type { GeoJob, JobProgressUpdate, JobCheckpoint, JobStage } from './geo-job-types';
import { updateJob, heartbeat, requestCancellation, getJob as getJobById } from './geo-job-store';

export interface WorkerContext {
  jobId: string;
  jobType: string;
  triggerType: string;
  checkpoint: JobCheckpoint | null;
  isCancelled: () => boolean;
  reportProgress: (update: JobProgressUpdate) => Promise<void>;
  reportHeartbeat: () => Promise<boolean>;
}

export type StageHandler = (ctx: WorkerContext) => Promise<{
  records_processed: number;
  checkpoint_data: Record<string, unknown>;
  next_stage: JobStage | null;
  status: 'success' | 'partial' | 'blocked' | 'failed';
  error_code?: string;
  safe_error_message?: string;
}>;

// Stage registry — each stage is independently executable and resumable
const stageHandlers: Record<string, StageHandler> = {};

export function registerStage(stage: string, handler: StageHandler) {
  stageHandlers[stage] = handler;
}

export function getStageHandler(stage: string): StageHandler | undefined {
  return stageHandlers[stage];
}

// Stage pipeline definitions
export const STAGE_PIPELINES: Record<string, JobStage[]> = {
  discovery: ['discovery'],
  evidence_update: ['evidence_update'],
  geo_analysis: ['geo_analysis'],
  full_pipeline: ['discovery', 'evidence_update', 'geo_analysis', 'opportunities', 'goals', 'drafts'],
};

// Execute a single stage with heartbeat and cancellation support
export async function executeStage(
  ctx: WorkerContext,
  stage: string
): Promise<{
  records_processed: number;
  checkpoint_data: Record<string, unknown>;
  status: 'success' | 'partial' | 'blocked' | 'failed';
  error_code?: string;
  safe_error_message?: string;
}> {
  const handler = stageHandlers[stage];
  if (!handler) {
    return {
      records_processed: 0,
      checkpoint_data: {},
      status: 'failed',
      error_code: 'UNKNOWN_STAGE',
      safe_error_message: `No handler registered for stage: ${stage}`,
    };
  }

  // Heartbeat interval
  const heartbeatTimer = setInterval(async () => {
    await ctx.reportHeartbeat();
  }, 15_000);

  try {
    const result = await handler(ctx);
    return result;
  } catch (e) {
    return {
      records_processed: 0,
      checkpoint_data: {},
      status: 'failed',
      error_code: 'STAGE_EXCEPTION',
      safe_error_message: e instanceof Error ? e.message : String(e),
    };
  } finally {
    clearInterval(heartbeatTimer);
  }
}

// Run full job pipeline with checkpoint/resume support
export async function runJobPipeline(job: GeoJob): Promise<void> {
  const stages = STAGE_PIPELINES[job.job_type] || [];
  const completedStages = job.checkpoint?.completed_stages || [];
  const stageData = job.checkpoint?.stage_data || {};

  let currentStageIndex = 0;
  // Find where to resume
  for (let i = 0; i < stages.length; i++) {
    if (!completedStages.includes(stages[i])) {
      currentStageIndex = i;
      break;
    }
    currentStageIndex = i + 1;
  }

  const ctx: WorkerContext = {
    jobId: job.job_id,
    jobType: job.job_type,
    triggerType: job.trigger_type,
    checkpoint: job.checkpoint,
    isCancelled: () => false, // Will be checked via job state
    reportProgress: async (update) => {
      await updateJob(job.job_id, update);
    },
    reportHeartbeat: async () => {
      return await heartbeat(job.job_id);
    },
  };

  for (let i = currentStageIndex; i < stages.length; i++) {
    const stage = stages[i];

    // Check cancellation
    const currentJob = await getJobById(job.job_id);
    if (currentJob?.cancellation_requested_at) {
      await updateJob(job.job_id, {
        status: 'cancelled',
        stage,
        progress: Math.round((i / stages.length) * 100),
      });
      return;
    }

    // Check if stage already completed (idempotency)
    if (completedStages.includes(stage)) {
      continue;
    }

    const progress = Math.round((i / stages.length) * 100);
    await updateJob(job.job_id, {
      stage,
      progress,
      status: 'running',
    });

    const result = await executeStage(ctx, stage);

    if (result.status === 'failed') {
      await updateJob(job.job_id, {
        status: 'failed',
        stage,
        progress,
        error_code: result.error_code || null,
        safe_error_message: result.safe_error_message || null,
        checkpoint: {
          completed_stages: completedStages,
          stage_data: { ...stageData, [stage]: result.checkpoint_data },
          last_successful_stage: completedStages.length > 0 ? completedStages[completedStages.length - 1] : null,
        },
      });
      return;
    }

    // Stage succeeded or partial
    completedStages.push(stage);
    stageData[stage] = result.checkpoint_data;

    const newProgress = Math.round(((i + 1) / stages.length) * 100);
    await updateJob(job.job_id, {
      stage,
      progress: newProgress,
      records_processed: (job.records_processed || 0) + result.records_processed,
      status: result.status === 'blocked' ? 'blocked' : (result.status === 'partial' ? 'partial' : 'running'),
      checkpoint: {
        completed_stages: completedStages,
        stage_data: stageData,
        last_successful_stage: stage,
      },
    });

    if (result.status === 'blocked') {
      // LLM unavailable — stop pipeline but don't mark as failed
      await updateJob(job.job_id, {
        status: 'blocked',
        stage,
        progress: newProgress,
        error_code: 'LLM_UNAVAILABLE',
        safe_error_message: result.safe_error_message || 'LLM provider unavailable — manual trigger required',
      });
      return;
    }
  }

  // All stages completed
  await updateJob(job.job_id, {
    status: 'succeeded',
    stage: 'completed',
    progress: 100,
  });
}


