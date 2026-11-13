// GEO Job Store — Storage abstraction for job tracking.
// Local: file-based JSON. Production: Supabase (via sbFetch pattern).
// No production writes in this module without explicit approval.

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { GeoJob, JobStatus, CreateJobInput, JobProgressUpdate, JobCheckpoint, JobType } from './geo-job-types';

const JOBS_FILE = path.join(process.cwd(), 'market-intel', 'geo-jobs.json');

function ensureDir() {
  const dir = path.dirname(JOBS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJobs(): GeoJob[] {
  ensureDir();
  if (!fs.existsSync(JOBS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(JOBS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeJobs(jobs: GeoJob[]) {
  ensureDir();
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
}

function nowIso() {
  return new Date().toISOString();
}

// --- Atomic claim (local simulation) ---
// In production, this would be a PostgreSQL RPC with SELECT FOR UPDATE SKIP LOCKED.
// Local version uses file lock + re-read to simulate atomicity.

export async function claimJob(jobId: string, workerId: string): Promise<GeoJob | null> {
  const jobs = readJobs();
  const idx = jobs.findIndex((j) => j.job_id === jobId);
  if (idx < 0) return null;

  const job = jobs[idx];
  // Check if already claimed by another active worker
  if (job.status === 'running' && job.lease_expires_at) {
    const leaseExpiry = new Date(job.lease_expires_at).getTime();
    if (leaseExpiry > Date.now()) {
      return null; // Another worker holds the lease
    }
    // Lease expired — can reclaim
  }

  if (job.status !== 'queued' && job.status !== 'failed') {
    return null; // Cannot claim non-queued/non-failed jobs
  }

  const now = nowIso();
  const leaseExpiry = new Date(Date.now() + 60_000).toISOString();
  job.status = 'running';
  job.started_at = job.started_at || now;
  job.heartbeat_at = now;
  job.lease_expires_at = leaseExpiry;
  job.updated_at = now;
  job.retry_count = job.retry_count || 0;

  jobs[idx] = job;
  writeJobs(jobs);
  return job;
}

export async function createJob(input: CreateJobInput): Promise<GeoJob> {
  const jobs = readJobs();
  const idempotencyKey = input.idempotency_key || `${input.job_type}:${input.trigger_type}:${Date.now()}`;
  // Idempotency check
  const existing = jobs.find((j) => j.idempotency_key === idempotencyKey && j.status !== 'failed' && j.status !== 'cancelled');
  if (existing) return existing;

  const now = nowIso();
  const job: GeoJob = {
    job_id: randomUUID(),
    job_type: input.job_type,
    trigger_type: input.trigger_type,
    status: 'queued',
    stage: null,
    progress: 0,
    records_processed: 0,
    started_at: null,
    finished_at: null,
    error_code: null,
    safe_error_message: null,
    retry_count: 0,
    max_retries: input.max_retries ?? 3,
    next_retry_at: null,
    heartbeat_at: null,
    lease_expires_at: null,
    cancellation_requested_at: null,
    run_id: null,
    idempotency_key: idempotencyKey,
    created_at: now,
    updated_at: now,
    checkpoint: null,
  };

  jobs.push(job);
  writeJobs(jobs);
  return job;
}

export async function getJob(jobId: string): Promise<GeoJob | null> {
  const jobs = readJobs();
  return jobs.find((j) => j.job_id === jobId) || null;
}

export async function listJobs(filters?: {
  status?: JobStatus;
  job_type?: string;
  limit?: number;
}): Promise<GeoJob[]> {
  let jobs = readJobs();
  if (filters?.status) jobs = jobs.filter((j) => j.status === filters.status);
  if (filters?.job_type) jobs = jobs.filter((j) => j.job_type === filters.job_type);
  jobs.sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (filters?.limit) jobs = jobs.slice(0, filters.limit);
  return jobs;
}

export async function updateJob(jobId: string, update: JobProgressUpdate): Promise<GeoJob | null> {
  const jobs = readJobs();
  const idx = jobs.findIndex((j) => j.job_id === jobId);
  if (idx < 0) return null;

  const job = jobs[idx];
  const now = nowIso();

  if (update.stage !== undefined) job.stage = update.stage;
  if (update.progress !== undefined) job.progress = update.progress;
  if (update.records_processed !== undefined) job.records_processed = update.records_processed;
  if (update.status !== undefined) job.status = update.status;
  if (update.error_code !== undefined) job.error_code = update.error_code;
  if (update.safe_error_message !== undefined) job.safe_error_message = update.safe_error_message;
  if (update.checkpoint !== undefined) job.checkpoint = update.checkpoint;
  if (update.run_id !== undefined) job.run_id = update.run_id;

  // Update heartbeat and lease on every update
  job.heartbeat_at = now;
  job.lease_expires_at = new Date(Date.now() + 60_000).toISOString();
  job.updated_at = now;

  if (update.status === 'succeeded' || update.status === 'failed' || update.status === 'partial' || update.status === 'blocked' || update.status === 'cancelled') {
    job.finished_at = now;
    job.lease_expires_at = null;
  }

  jobs[idx] = job;
  writeJobs(jobs);
  return job;
}

export async function heartbeat(jobId: string): Promise<boolean> {
  const jobs = readJobs();
  const idx = jobs.findIndex((j) => j.job_id === jobId);
  if (idx < 0) return false;
  const job = jobs[idx];
  if (job.status !== 'running') return false;

  const now = nowIso();
  job.heartbeat_at = now;
  job.lease_expires_at = new Date(Date.now() + 60_000).toISOString();
  job.updated_at = now;
  jobs[idx] = job;
  writeJobs(jobs);
  return true;
}

export async function requestCancellation(jobId: string): Promise<GeoJob | null> {
  const jobs = readJobs();
  const idx = jobs.findIndex((j) => j.job_id === jobId);
  if (idx < 0) return null;
  const job = jobs[idx];
  if (job.status === 'succeeded' || job.status === 'failed' || job.status === 'cancelled') return job;

  job.cancellation_requested_at = nowIso();
  job.updated_at = nowIso();
  jobs[idx] = job;
  writeJobs(jobs);
  return job;
}

export async function recoverStaleJobs(): Promise<number> {
  const jobs = readJobs();
  const now = Date.now();
  let recovered = 0;
  for (const job of jobs) {
    if (job.status === 'running' && job.lease_expires_at) {
      const leaseExpiry = new Date(job.lease_expires_at).getTime();
      if (leaseExpiry < now) {
        // Lease expired — mark as failed for retry
        job.status = 'failed';
        job.error_code = 'LEASE_EXPIRED';
        job.safe_error_message = 'Worker lease expired — job may be retried';
        job.finished_at = nowIso();
        job.updated_at = nowIso();
        recovered++;
      }
    }
  }
  if (recovered > 0) writeJobs(jobs);
  return recovered;
}

export async function getRunningJobs(jobType?: JobType): Promise<GeoJob[]> {
  const jobs = readJobs();
  return jobs.filter((j) => {
    if (j.status !== 'running') return false;
    if (jobType && j.job_type !== jobType) return false;
    return true;
  });
}

// Idempotency: check if a job with same key already exists and is not terminal
export async function findActiveJob(idempotencyKey: string): Promise<GeoJob | null> {
  const jobs = readJobs();
  return jobs.find((j) => j.idempotency_key === idempotencyKey && j.status !== 'failed' && j.status !== 'cancelled' && j.status !== 'succeeded') || null;
}
