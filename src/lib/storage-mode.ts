/**
 * Single source of truth for storage mode selection.
 *
 * Rules (fail closed):
 * 1. If SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are both present -> Supabase only.
 *    Any Supabase failure is surfaced; there is NO fallback to local files.
 * 2. A partial Supabase configuration is a hard error in every environment.
 * 3. Without Supabase credentials, local JSON file storage is allowed only in
 *    development, tests, or the Next.js production *build* phase (static
 *    generation). At production runtime the request fails instead of writing
 *    to an ephemeral filesystem.
 */

export class StorageUnavailableError extends Error {
  readonly code = 'STORAGE_UNAVAILABLE';

  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}

/** Thrown when an optimistic-concurrency write could not be applied. */
export class StorageConflictError extends Error {
  readonly code = 'STORAGE_CONFLICT';

  constructor(message = 'The record changed concurrently; reload and retry.') {
    super(message);
    this.name = 'StorageConflictError';
  }
}

export interface SupabaseCredentials {
  url: string;
  key: string;
}

export type StorageMode = 'supabase' | 'file';

function clean(value: string | undefined): string {
  return (value || '').trim();
}

export function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

export function getSupabaseCredentials(): SupabaseCredentials | null {
  const url = clean(process.env.SUPABASE_URL);
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (url && key) {
    return { url: url.replace(/\/+$/, ''), key };
  }

  if (url || key) {
    throw new StorageUnavailableError(
      'Supabase configuration is incomplete: both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.'
    );
  }

  return null;
}

export function resolveStorageMode(): StorageMode {
  if (getSupabaseCredentials()) return 'supabase';

  if (process.env.NODE_ENV === 'production' && !isBuildPhase()) {
    throw new StorageUnavailableError(
      'Supabase is not configured. Local JSON fallback is disabled at production runtime.'
    );
  }

  return 'file';
}

/** Wraps a thrown value as StorageUnavailableError without double-wrapping. */
export function asStorageError(context: string, error: unknown): StorageUnavailableError {
  if (error instanceof StorageUnavailableError) return error;
  const detail = error instanceof Error ? error.message : String(error);
  return new StorageUnavailableError(`${context}: ${detail}`, error);
}
