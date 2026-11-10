import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  StorageUnavailableError,
  asStorageError,
  getSupabaseCredentials,
  resolveStorageMode,
} from './storage-mode';

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

export interface UpdatePageOptions {
  /** Version the caller last read. Required for safe concurrent updates in practice. */
  expectedVersion?: number;
  title?: string;
  status?: string;
}

/** Thrown when a write is based on a stale page version. */
export class VersionConflictError extends Error {
  readonly code = 'VERSION_CONFLICT';

  constructor(readonly expectedVersion: number, readonly currentVersion: number | null) {
    super(
      `Version conflict: expected version ${expectedVersion}, ` +
        (currentVersion === null ? 'but the page no longer exists' : `current version is ${currentVersion}`)
    );
    this.name = 'VersionConflictError';
  }
}

export class PageAlreadyExistsError extends Error {
  readonly code = 'PAGE_EXISTS';

  constructor(readonly slug: string) {
    super(`Page with slug "${slug}" already exists`);
    this.name = 'PageAlreadyExistsError';
  }
}

export class InvalidStateError extends Error {
  readonly code = 'INVALID_STATE';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidStateError';
  }
}

// ---------------------------------------------------------------------------
// Local file storage (development / tests / build phase only)
// ---------------------------------------------------------------------------

let fileLock: Promise<void> = Promise.resolve();

function withFileLock<T>(fn: () => T | Promise<T>): Promise<T> {
  const run = fileLock.then(fn);
  fileLock = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function fileDir(): string {
  const dir = process.env.GEO_STORE_PATH || path.join(process.cwd(), 'geo-store');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function filePath(name: string): string {
  return path.join(fileDir(), name);
}

function readFile<T>(name: string): T[] {
  try {
    const raw = fs.readFileSync(filePath(name), 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw asStorageError(`Failed to read ${name}`, e);
  }
}

function writeFile(name: string, data: unknown[]): void {
  const target = filePath(name);
  const temp = `${target}.${randomUUID()}.tmp`;
  // Atomic replace prevents a crash mid-write from corrupting the store.
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(temp, target);
}

// ---------------------------------------------------------------------------
// Supabase REST helpers
// ---------------------------------------------------------------------------

async function sbFetch(pathname: string, init?: RequestInit): Promise<Response> {
  const cfg = getSupabaseCredentials();
  if (!cfg) throw new StorageUnavailableError('Supabase is not configured');

  try {
    return await fetch(`${cfg.url}/rest/v1/${pathname}`, {
      ...init,
      cache: 'no-store',
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  } catch (e) {
    throw asStorageError('Supabase request failed', e);
  }
}

async function assertOk(res: Response, operation: string): Promise<void> {
  if (res.ok) return;
  let body = '';
  try {
    body = (await res.text()).slice(0, 300);
  } catch {
    body = '';
  }
  throw new StorageUnavailableError(
    `Supabase ${operation} failed: HTTP ${res.status}${body ? ` - ${body}` : ''}`
  );
}

async function sbJson<T>(res: Response, operation: string): Promise<T> {
  await assertOk(res, operation);
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export async function getPage(slug: string): Promise<SitePage | null> {
  const encoded = encodeURIComponent(slug);

  if (resolveStorageMode() === 'supabase') {
    const res = await sbFetch(`site_pages?slug=eq.${encoded}&select=*&limit=1`);
    const rows = await sbJson<SitePage[]>(res, 'getPage');
    return rows.length ? rows[0] : null;
  }

  const pages = readFile<SitePage>('pages.json');
  return pages.find((p) => p.slug === slug) || null;
}

export async function createPage(
  slug: string,
  title: string,
  content: Record<string, unknown>,
  actor?: string
): Promise<SitePage> {
  const cleanSlug = slug.trim();
  if (!cleanSlug) throw new Error('Page slug is required');

  let page: SitePage;

  if (resolveStorageMode() === 'supabase') {
    const res = await sbFetch('site_pages', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ slug: cleanSlug, title, content, status: 'draft', version: 1 }),
    });

    if (res.status === 409) throw new PageAlreadyExistsError(cleanSlug);
    const rows = await sbJson<SitePage[]>(res, 'createPage');
    page = rows[0];

    const versionRes = await sbFetch('page_versions', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        page_id: page.id,
        version: 1,
        content,
        created_by: actor ?? null,
      }),
    });
    if (!versionRes.ok) {
      // Do not leave a page without its initial snapshot behind.
      await sbFetch(`site_pages?id=eq.${page.id}`, { method: 'DELETE' }).catch(() => undefined);
      if (versionRes.status === 409) throw new VersionConflictError(1, 1);
      await assertOk(versionRes, 'createPageVersion');
    }
  } else {
    page = await withFileLock(() => {
      const pages = readFile<SitePage>('pages.json');
      if (pages.some((p) => p.slug === cleanSlug)) {
        throw new PageAlreadyExistsError(cleanSlug);
      }

      const now = new Date().toISOString();
      const created: SitePage = {
        id: randomUUID(),
        slug: cleanSlug,
        title,
        content,
        status: 'draft',
        version: 1,
        created_at: now,
        updated_at: now,
      };

      pages.push(created);
      writeFile('pages.json', pages);

      try {
        const versions = readFile<PageVersion>('page_versions.json');
        versions.push({
          id: randomUUID(),
          page_id: created.id,
          version: 1,
          content,
          created_at: now,
          created_by: actor,
        });
        writeFile('page_versions.json', versions);
      } catch (error) {
        // Do not leave a page without its initial snapshot behind.
        writeFile('pages.json', pages.filter((p) => p.id !== created.id));
        throw error;
      }

      return created;
    });
  }

  await logAudit('create_page', 'site_page', page.id, actor, { slug: cleanSlug, title });
  return page;
}

export async function updatePage(
  slug: string,
  content: Record<string, unknown>,
  actor?: string,
  options: UpdatePageOptions = {}
): Promise<SitePage | null> {
  if (resolveStorageMode() === 'supabase') {
    const current = await getPage(slug);
    if (!current) return null;

    const base = options.expectedVersion ?? current.version;
    if (base !== current.version) throw new VersionConflictError(base, current.version);

    const newVersion = base + 1;
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { content, version: newVersion, updated_at: now };
    if (options.title !== undefined) patch.title = options.title;
    if (options.status !== undefined) patch.status = options.status;

    // Write the immutable snapshot first. The unique (page_id, version)
    // constraint serialises concurrent writers: only one can claim newVersion.
    // If the page CAS then fails, the orphan snapshot is removed.
    const versionRes = await sbFetch('page_versions', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        page_id: current.id,
        version: newVersion,
        content,
        created_by: actor ?? null,
      }),
    });
    if (versionRes.status === 409) {
      const latest = await getPage(slug);
      throw new VersionConflictError(base, latest?.version ?? null);
    }
    await assertOk(versionRes, 'updatePageVersion');

    // Compare-and-swap on the version column: only a caller holding the
    // current version can advance the page.
    let rows: SitePage[];
    try {
      const res = await sbFetch(`site_pages?id=eq.${current.id}&version=eq.${base}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      });
      rows = await sbJson<SitePage[]>(res, 'updatePage');
    } catch (error) {
      await sbFetch(`page_versions?page_id=eq.${current.id}&version=eq.${newVersion}`, {
        method: 'DELETE',
      }).catch(() => undefined);
      throw error;
    }

    if (rows.length === 0) {
      await sbFetch(`page_versions?page_id=eq.${current.id}&version=eq.${newVersion}`, {
        method: 'DELETE',
      }).catch(() => undefined);
      const latest = await getPage(slug);
      throw new VersionConflictError(base, latest?.version ?? null);
    }

    await logAudit('update_page', 'site_page', current.id, actor, {
      slug,
      fromVersion: base,
      toVersion: newVersion,
    });
    return rows[0];
  }

  const updated = await withFileLock(() => {
    const pages = readFile<SitePage>('pages.json');
    const index = pages.findIndex((p) => p.slug === slug);
    if (index < 0) return null;

    const current = pages[index];
    const base = options.expectedVersion ?? current.version;
    if (base !== current.version) throw new VersionConflictError(base, current.version);

    const newVersion = base + 1;
    const now = new Date().toISOString();
    const next: SitePage = {
      ...current,
      content,
      version: newVersion,
      updated_at: now,
      title: options.title ?? current.title,
      status: options.status ?? current.status,
    };
    const versions = readFile<PageVersion>('page_versions.json');
    if (versions.some((v) => v.page_id === current.id && v.version === newVersion)) {
      throw new VersionConflictError(base, newVersion);
    }

    // Persist the snapshot before advancing the page pointer. A crash can then
    // leave an orphan snapshot (harmless) but never a page version with no
    // history.
    versions.push({
      id: randomUUID(),
      page_id: current.id,
      version: newVersion,
      content,
      created_at: now,
      created_by: actor,
    });
    writeFile('page_versions.json', versions);

    pages[index] = next;
    writeFile('pages.json', pages);

    return next;
  });

  if (updated) {
    await logAudit('update_page', 'site_page', updated.id, actor, {
      slug,
      fromVersion: updated.version - 1,
      toVersion: updated.version,
    });
  }
  return updated;
}

export async function listVersions(slug: string): Promise<PageVersion[]> {
  const page = await getPage(slug);
  if (!page) return [];

  if (resolveStorageMode() === 'supabase') {
    const res = await sbFetch(
      `page_versions?page_id=eq.${page.id}&select=*&order=version.desc`
    );
    return sbJson<PageVersion[]>(res, 'listVersions');
  }

  return readFile<PageVersion>('page_versions.json')
    .filter((v) => v.page_id === page.id)
    .sort((a, b) => b.version - a.version);
}

export async function rollbackPage(
  slug: string,
  version: number,
  actor?: string,
  expectedVersion?: number
): Promise<SitePage | null> {
  const page = await getPage(slug);
  if (!page) return null;

  const versions = await listVersions(slug);
  const target = versions.find((v) => v.version === version);
  if (!target) return null;

  // A rollback is a normal forward write, so it creates a new version and is
  // protected by the same optimistic lock.
  return updatePage(slug, target.content, actor, {
    expectedVersion: expectedVersion ?? page.version,
  });
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

/**
 * Records a change. Audit failures are logged but never trick the caller into
 * believing a data write was rolled back (there is no distributed transaction
 * here). Callers that need strict audit guarantees should check the boolean.
 */
export async function logAudit(
  action: string,
  entityType: string,
  entityId?: string,
  actor?: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  const entry: AuditLog = {
    id: randomUUID(),
    action,
    entity_type: entityType,
    entity_id: entityId,
    actor,
    metadata,
    created_at: new Date().toISOString(),
  };

  try {
    if (resolveStorageMode() === 'supabase') {
      const res = await sbFetch('audit_logs', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(entry),
      });
      if (!res.ok) {
        console.error('logAudit failed:', await res.text().catch(() => res.status));
        return false;
      }
      return true;
    }

    return await withFileLock(() => {
      const logs = readFile<AuditLog>('audit_logs.json');
      logs.push(entry);
      writeFile('audit_logs.json', logs);
      return true;
    });
  } catch (e) {
    console.error('logAudit failed:', e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export async function createJob(
  type: string,
  payload?: Record<string, unknown>,
  scheduledAt?: string
): Promise<AgentJob> {
  let job: AgentJob;

  if (resolveStorageMode() === 'supabase') {
    const res = await sbFetch('agent_jobs', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        type,
        status: 'pending',
        payload: payload ?? null,
        scheduled_at: scheduledAt ?? null,
      }),
    });
    const rows = await sbJson<AgentJob[]>(res, 'createJob');
    job = rows[0];
  } else {
    job = await withFileLock(() => {
      const now = new Date().toISOString();
      const created: AgentJob = {
        id: randomUUID(),
        type,
        status: 'pending',
        payload,
        scheduled_at: scheduledAt,
        created_at: now,
        updated_at: now,
      };
      const jobs = readFile<AgentJob>('agent_jobs.json');
      jobs.push(created);
      writeFile('agent_jobs.json', jobs);
      return created;
    });
  }

  await logAudit('create_job', 'agent_job', job.id, 'system', { type });
  return job;
}

export async function updateJob(id: string, status: string): Promise<void> {
  const now = new Date().toISOString();

  if (resolveStorageMode() === 'supabase') {
    const res = await sbFetch(`agent_jobs?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status, updated_at: now }),
    });
    await assertOk(res, 'updateJob');
    return;
  }

  await withFileLock(() => {
    const jobs = readFile<AgentJob>('agent_jobs.json');
    const index = jobs.findIndex((j) => j.id === id);
    if (index >= 0) {
      jobs[index] = { ...jobs[index], status, updated_at: now };
      writeFile('agent_jobs.json', jobs);
    }
  });
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export async function createRun(jobId?: string): Promise<AgentRun> {
  if (resolveStorageMode() === 'supabase') {
    const res = await sbFetch('agent_runs', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        job_id: jobId ?? null,
        status: 'running',
        started_at: new Date().toISOString(),
      }),
    });
    const rows = await sbJson<AgentRun[]>(res, 'createRun');
    return rows[0];
  }

  return withFileLock(() => {
    const run: AgentRun = {
      id: randomUUID(),
      job_id: jobId,
      status: 'running',
      started_at: new Date().toISOString(),
    };
    const runs = readFile<AgentRun>('agent_runs.json');
    runs.push(run);
    writeFile('agent_runs.json', runs);
    return run;
  });
}

export async function finishRun(
  id: string,
  status: string,
  result?: Record<string, unknown>,
  error?: string
): Promise<void> {
  const now = new Date().toISOString();

  if (resolveStorageMode() === 'supabase') {
    const res = await sbFetch(`agent_runs?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status, finished_at: now, result: result ?? null, error: error ?? null }),
    });
    await assertOk(res, 'finishRun');
    return;
  }

  await withFileLock(() => {
    const runs = readFile<AgentRun>('agent_runs.json');
    const index = runs.findIndex((r) => r.id === id);
    if (index >= 0) {
      runs[index] = {
        ...runs[index],
        status,
        finished_at: now,
        result,
        error,
      };
      writeFile('agent_runs.json', runs);
    }
  });
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export async function createApproval(
  entityType: string,
  entityId: string,
  proposedContent: Record<string, unknown>
): Promise<ApprovalRequest> {
  let request: ApprovalRequest;

  if (resolveStorageMode() === 'supabase') {
    const res = await sbFetch('approval_requests', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        entity_type: entityType,
        entity_id: entityId,
        proposed_content: proposedContent,
        status: 'pending',
      }),
    });
    const rows = await sbJson<ApprovalRequest[]>(res, 'createApproval');
    request = rows[0];
  } else {
    request = await withFileLock(() => {
      const created: ApprovalRequest = {
        id: randomUUID(),
        entity_type: entityType,
        entity_id: entityId,
        proposed_content: proposedContent,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      const requests = readFile<ApprovalRequest>('approval_requests.json');
      requests.push(created);
      writeFile('approval_requests.json', requests);
      return created;
    });
  }

  await logAudit('create_approval', entityType, entityId, 'system', { status: 'pending' });
  return request;
}

export async function reviewApproval(
  id: string,
  status: 'approved' | 'rejected',
  reviewer: string
): Promise<void> {
  const now = new Date().toISOString();

  if (resolveStorageMode() === 'supabase') {
    const lookup = await sbFetch(
      `approval_requests?id=eq.${encodeURIComponent(id)}&select=status&limit=1`
    );
    const rows = await sbJson<Array<{ status: string }>>(lookup, 'reviewApprovalLookup');
    if (!rows.length) throw new Error(`Approval request ${id} not found`);
    if (rows[0].status !== 'pending') {
      throw new InvalidStateError(`Approval request ${id} was already ${rows[0].status}`);
    }

    // Guard against a concurrent reviewer: only pending rows can transition.
    const res = await sbFetch(
      `approval_requests?id=eq.${encodeURIComponent(id)}&status=eq.pending`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status, reviewed_at: now, reviewer }),
      }
    );
    const updated = await sbJson<ApprovalRequest[]>(res, 'reviewApproval');
    if (!updated.length) {
      throw new InvalidStateError(`Approval request ${id} was reviewed concurrently`);
    }
  } else {
    await withFileLock(() => {
      const requests = readFile<ApprovalRequest>('approval_requests.json');
      const index = requests.findIndex((r) => r.id === id);
      if (index < 0) throw new Error(`Approval request ${id} not found`);
      if (requests[index].status !== 'pending') {
        throw new InvalidStateError(
          `Approval request ${id} was already ${requests[index].status}`
        );
      }
      requests[index] = {
        ...requests[index],
        status,
        reviewed_at: now,
        reviewer,
      };
      writeFile('approval_requests.json', requests);
    });
  }

  await logAudit('review_approval', 'approval_request', id, reviewer, { status });
}
