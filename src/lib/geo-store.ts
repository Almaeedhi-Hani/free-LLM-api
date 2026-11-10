import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export interface SitePage {
  id: string;
  slug: string;
  title: string;
  content: Record<string, unknown>;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface PageVersion {
  id: string;
  page_id: string;
  version: number;
  content: Record<string, unknown>;
  created_at: string;
  created_by?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  actor?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface AgentJob {
  id: string;
  type: string;
  status: string;
  payload?: Record<string, unknown>;
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentRun {
  id: string;
  job_id?: string;
  status: string;
  started_at: string;
  finished_at?: string;
  result?: Record<string, unknown>;
  error?: string;
}

export interface ApprovalRequest {
  id: string;
  entity_type: string;
  entity_id: string;
  proposed_content: Record<string, unknown>;
  status: string;
  created_at: string;
  reviewed_at?: string;
  reviewer?: string;
}

function sbConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), key };
}

function fileDir(): string {
  const dir = path.join(process.cwd(), 'geo-store');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readFile(name: string): unknown[] {
  const p = path.join(fileDir(), name);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return [];
  }
}

function writeFile(name: string, data: unknown[]): void {
  const p = path.join(fileDir(), name);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

async function sbFetch(pathname: string, init?: RequestInit): Promise<Response> {
  const cfg = sbConfig();
  if (!cfg) throw new Error('Supabase not configured');
  return fetch(`${cfg.url}/rest/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
}

// --- Pages ---
export async function getPage(slug: string): Promise<SitePage | null> {
  const cfg = sbConfig();
  if (cfg) {
    const res = await sbFetch(`site_pages?slug=eq.${encodeURIComponent(slug)}&select=*`);
    if (!res.ok) return null;
    const rows = (await res.json()) as SitePage[];
    return rows.length ? rows[0] : null;
  }
  const pages = readFile('pages.json') as SitePage[];
  return pages.find((p) => p.slug === slug) || null;
}

export async function createPage(slug: string, title: string, content: Record<string, unknown>, actor?: string): Promise<SitePage> {
  const page: SitePage = {
    id: randomUUID(),
    slug,
    title,
    content,
    status: 'draft',
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const cfg = sbConfig();
  if (cfg) {
    const res = await sbFetch('site_pages', { method: 'POST', body: JSON.stringify(page) });
    if (!res.ok) throw new Error(`createPage failed: ${res.status}`);
    await sbFetch('page_versions', {
      method: 'POST',
      body: JSON.stringify({ page_id: page.id, version: 1, content, created_by: actor }),
    });
  } else {
    const pages = readFile('pages.json') as SitePage[];
    pages.push(page);
    writeFile('pages.json', pages);
    const versions = readFile('page_versions.json') as PageVersion[];
    versions.push({ id: randomUUID(), page_id: page.id, version: 1, content, created_at: page.created_at, created_by: actor });
    writeFile('page_versions.json', versions);
  }
  await logAudit('create_page', 'site_page', page.id, actor, { slug, title });
  return page;
}

export async function updatePage(slug: string, content: Record<string, unknown>, actor?: string): Promise<SitePage | null> {
  const page = await getPage(slug);
  if (!page) return null;
  const newVersion = page.version + 1;
  const now = new Date().toISOString();
  const cfg = sbConfig();
  if (cfg) {
    await sbFetch(`site_pages?id=eq.${page.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ content, version: newVersion, updated_at: now }),
    });
    await sbFetch('page_versions', {
      method: 'POST',
      body: JSON.stringify({ page_id: page.id, version: newVersion, content, created_by: actor }),
    });
  } else {
    const pages = readFile('pages.json') as SitePage[];
    const idx = pages.findIndex((p) => p.id === page.id);
    if (idx >= 0) {
      pages[idx] = { ...pages[idx], content, version: newVersion, updated_at: now };
      writeFile('pages.json', pages);
    }
    const versions = readFile('page_versions.json') as PageVersion[];
    versions.push({ id: randomUUID(), page_id: page.id, version: newVersion, content, created_at: now, created_by: actor });
    writeFile('page_versions.json', versions);
  }
  await logAudit('update_page', 'site_page', page.id, actor, { slug, version: newVersion });
  return { ...page, content, version: newVersion, updated_at: now };
}

export async function listVersions(slug: string): Promise<PageVersion[]> {
  const page = await getPage(slug);
  if (!page) return [];
  const cfg = sbConfig();
  if (cfg) {
    const res = await sbFetch(`page_versions?page_id=eq.${page.id}&select=*&order=version.desc`);
    if (!res.ok) return [];
    return (await res.json()) as PageVersion[];
  }
  const versions = readFile('page_versions.json') as PageVersion[];
  return versions.filter((v) => v.page_id === page.id).sort((a, b) => b.version - a.version);
}

export async function rollbackPage(slug: string, version: number, actor?: string): Promise<SitePage | null> {
  const page = await getPage(slug);
  if (!page) return null;
  const versions = await listVersions(slug);
  const target = versions.find((v) => v.version === version);
  if (!target) return null;
  return updatePage(slug, target.content, actor);
}

// --- Audit ---
export async function logAudit(action: string, entityType: string, entityId?: string, actor?: string, metadata?: Record<string, unknown>): Promise<void> {
  const entry: AuditLog = {
    id: randomUUID(),
    action,
    entity_type: entityType,
    entity_id: entityId,
    actor,
    metadata,
    created_at: new Date().toISOString(),
  };
  const cfg = sbConfig();
  if (cfg) {
    await sbFetch('audit_logs', { method: 'POST', body: JSON.stringify(entry) });
  } else {
    const logs = readFile('audit_logs.json') as AuditLog[];
    logs.push(entry);
    writeFile('audit_logs.json', logs);
  }
}

// --- Jobs ---
export async function createJob(type: string, payload?: Record<string, unknown>, scheduledAt?: string): Promise<AgentJob> {
  const job: AgentJob = {
    id: randomUUID(),
    type,
    status: 'pending',
    payload,
    scheduled_at: scheduledAt,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const cfg = sbConfig();
  if (cfg) {
    const res = await sbFetch('agent_jobs', { method: 'POST', body: JSON.stringify(job) });
    if (!res.ok) throw new Error(`createJob failed: ${res.status}`);
  } else {
    const jobs = readFile('agent_jobs.json') as AgentJob[];
    jobs.push(job);
    writeFile('agent_jobs.json', jobs);
  }
  await logAudit('create_job', 'agent_job', job.id, 'system', { type });
  return job;
}

export async function updateJob(id: string, status: string): Promise<void> {
  const now = new Date().toISOString();
  const cfg = sbConfig();
  if (cfg) {
    await sbFetch(`agent_jobs?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status, updated_at: now }) });
  } else {
    const jobs = readFile('agent_jobs.json') as AgentJob[];
    const idx = jobs.findIndex((j) => j.id === id);
    if (idx >= 0) {
      jobs[idx].status = status;
      jobs[idx].updated_at = now;
      writeFile('agent_jobs.json', jobs);
    }
  }
}

// --- Runs ---
export async function createRun(jobId?: string): Promise<AgentRun> {
  const run: AgentRun = {
    id: randomUUID(),
    job_id: jobId,
    status: 'running',
    started_at: new Date().toISOString(),
  };
  const cfg = sbConfig();
  if (cfg) {
    await sbFetch('agent_runs', { method: 'POST', body: JSON.stringify(run) });
  } else {
    const runs = readFile('agent_runs.json') as AgentRun[];
    runs.push(run);
    writeFile('agent_runs.json', runs);
  }
  return run;
}

export async function finishRun(id: string, status: string, result?: Record<string, unknown>, error?: string): Promise<void> {
  const now = new Date().toISOString();
  const cfg = sbConfig();
  if (cfg) {
    await sbFetch(`agent_runs?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, finished_at: now, result, error }),
    });
  } else {
    const runs = readFile('agent_runs.json') as AgentRun[];
    const idx = runs.findIndex((r) => r.id === id);
    if (idx >= 0) {
      runs[idx].status = status;
      runs[idx].finished_at = now;
      runs[idx].result = result;
      runs[idx].error = error;
      writeFile('agent_runs.json', runs);
    }
  }
}

// --- Approvals ---
export async function createApproval(entityType: string, entityId: string, proposedContent: Record<string, unknown>): Promise<ApprovalRequest> {
  const req: ApprovalRequest = {
    id: randomUUID(),
    entity_type: entityType,
    entity_id: entityId,
    proposed_content: proposedContent,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  const cfg = sbConfig();
  if (cfg) {
    await sbFetch('approval_requests', { method: 'POST', body: JSON.stringify(req) });
  } else {
    const reqs = readFile('approval_requests.json') as ApprovalRequest[];
    reqs.push(req);
    writeFile('approval_requests.json', reqs);
  }
  await logAudit('create_approval', entityType, entityId, 'system', { status: 'pending' });
  return req;
}

export async function reviewApproval(id: string, status: 'approved' | 'rejected', reviewer: string): Promise<void> {
  const now = new Date().toISOString();
  const cfg = sbConfig();
  if (cfg) {
    await sbFetch(`approval_requests?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewed_at: now, reviewer }),
    });
  } else {
    const reqs = readFile('approval_requests.json') as ApprovalRequest[];
    const idx = reqs.findIndex((r) => r.id === id);
    if (idx >= 0) {
      reqs[idx].status = status;
      reqs[idx].reviewed_at = now;
      reqs[idx].reviewer = reviewer;
      writeFile('approval_requests.json', reqs);
    }
  }
  await logAudit('review_approval', 'approval_request', id, reviewer, { status });
}