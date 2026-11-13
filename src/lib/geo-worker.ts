// Independent GEO Worker — Replaces setImmediate dispatch.
// Polls Supabase for queued jobs, claims them atomically, executes stages.
// Can run as separate process (node src/lib/geo-worker.js) or Edge Function.

import { getJob, listJobs, updateJob, claimJob, recoverStaleJobs } from './geo-job-store';
import { runJobPipeline } from './geo-job-worker';
import { registerRealStageHandlers } from './geo-stage-handlers';
import { getSettings } from './geo-settings';

const POLL_INTERVAL_MS = 5000; // 5s
const WORKER_ID = `worker-${process.pid}-${Date.now()}`;

let running = true;
let currentJobId: string | null = null;

export async function startWorker() {
  console.log(`[Worker ${WORKER_ID}] Starting...`);
  registerRealStageHandlers();

  // Recovery on startup
  const recovered = await recoverStaleJobs();
  if (recovered > 0) console.log(`[Worker] Recovered ${recovered} stale jobs`);

  while (running) {
    try {
      // Check emergency stop
      const settings = getSettings();
      if (settings.emergency_stop_publication && settings.pause_all_jobs) {
        await sleep(10000);
        continue;
      }

      // Find queued jobs
      const queuedJobs = await listJobs({ status: 'queued' as any });
      if (queuedJobs.length === 0) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      // Try to claim the oldest job
      const jobToClaim = queuedJobs.sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
      const claimed = await claimJob(jobToClaim.job_id, WORKER_ID);
      if (!claimed) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      currentJobId = claimed.job_id;
      console.log(`[Worker] Claimed job ${claimed.job_id} (${claimed.job_type})`);

      try {
        await runJobPipeline(claimed);
        console.log(`[Worker] Job ${claimed.job_id} completed`);
      } catch (e) {
        console.error(`[Worker] Job ${claimed.job_id} failed:`, e instanceof Error ? e.message : String(e));
        await updateJob(claimed.job_id, {
          status: 'failed',
          error_code: 'WORKER_EXCEPTION',
          safe_error_message: e instanceof Error ? e.message : String(e),
        });
      }

      currentJobId = null;
    } catch (e) {
      console.error('[Worker] Poll error:', e instanceof Error ? e.message : String(e));
      await sleep(POLL_INTERVAL_MS);
    }
  }

  console.log(`[Worker ${WORKER_ID}] Stopped`);
}

export function stopWorker() {
  running = false;
  if (currentJobId) {
    console.log(`[Worker] Stopping — current job ${currentJobId} will be recovered on next start`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => { console.log('[Worker] SIGTERM received'); stopWorker(); });
  process.on('SIGINT', () => { console.log('[Worker] SIGINT received'); stopWorker(); });
}
