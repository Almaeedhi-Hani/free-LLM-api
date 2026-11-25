import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { StorageUnavailableError, asStorageError, getSupabaseCredentials, resolveStorageMode } from '../storage-mode';

let fileLock: Promise<void> = Promise.resolve();

export function withFileLock<T>(fn: () => T | Promise<T>): Promise<T> {
  const run = fileLock.then(fn);
  fileLock = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function fileDir(): string {
  const dir = process.env.MARKET_INTEL_PATH || path.join(process.cwd(), 'market-intel');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function filePath(name: string): string {
  return path.join(fileDir(), name);
}

export function readFile<T>(name: string): T[] {
  try {
    const raw = fs.readFileSync(filePath(name), 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw asStorageError(`Failed to read ${name}`, e);
  }
}

export function writeFile(name: string, data: unknown[]): void {
  const target = filePath(name);
  const temp = `${target}.${randomUUID()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(temp, target);
}

// ---------------------------------------------------------------------------
// Supabase REST helpers
// ---------------------------------------------------------------------------

export async function sbFetch(pathname: string, init?: RequestInit): Promise<Response> {
  const cfg = getSupabaseCredentials();
  if (!cfg) throw new StorageUnavailableError('Supabase is not configured');

  // 25s timeout to stay under Render's 30s limit
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25_000);

  try {
    return await fetch(`${cfg.url}/rest/v1/${pathname}`, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  } catch (e) {
    throw asStorageError('Supabase request failed', e);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function assertOk(res: Response, operation: string): Promise<void> {
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

export async function sbJson<T>(res: Response, operation: string): Promise<T> {
  await assertOk(res, operation);
  return (await res.json()) as T;
}

export function isSupabase(): boolean {
  return resolveStorageMode() === 'supabase';
}

export function nowIso(): string {
  return new Date().toISOString();
}
