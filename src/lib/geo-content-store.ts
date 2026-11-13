// Unified Content Store — Real publication target for GEO content.
// Local: file-based. Production: Supabase content_store table.
// Supports versioning, rollback, and audit.

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export interface ContentEntry {
  path: string;
  type: string;
  content: string;
  version: number;
  published_at: string;
  published_by: string;
  source_draft_id: string | null;
  source_run_id: string | null;
}

export interface ContentVersion {
  id: string;
  content_path: string;
  version_number: number;
  content_before: string | null;
  content_after: string;
  published_by: string;
  published_at: string;
  rollback_available: boolean;
  rolled_back_at: string | null;
  rolled_back_by: string | null;
  source_draft_id: string | null;
  source_run_id: string | null;
}

const STORE_FILE = path.join(process.cwd(), 'market-intel', 'content-store.json');
const VERSIONS_FILE = path.join(process.cwd(), 'market-intel', 'content-versions.json');

function ensureDir() {
  const dir = path.dirname(STORE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readStore(): Record<string, ContentEntry> {
  ensureDir();
  if (!fs.existsSync(STORE_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8')); } catch { return {}; }
}

function writeStore(store: Record<string, ContentEntry>) {
  ensureDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}

function readVersions(): ContentVersion[] {
  ensureDir();
  if (!fs.existsSync(VERSIONS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(VERSIONS_FILE, 'utf-8')); } catch { return []; }
}

function writeVersions(versions: ContentVersion[]) {
  ensureDir();
  fs.writeFileSync(VERSIONS_FILE, JSON.stringify(versions, null, 2));
}

function nowIso() { return new Date().toISOString(); }

// Get current content at path
export function getContent(path: string): ContentEntry | null {
  const store = readStore();
  return store[path] || null;
}

// Publish content with versioning
export function publishContent(params: {
  path: string;
  type: string;
  content: string;
  publishedBy: string;
  sourceDraftId: string | null;
  sourceRunId: string | null;
}): { version: ContentVersion; entry: ContentEntry } {
  const store = readStore();
  const versions = readVersions();
  const now = nowIso();

  const existing = store[params.path];
  const versionNumber = existing ? existing.version + 1 : 1;

  // Create version record
  const version: ContentVersion = {
    id: randomUUID(),
    content_path: params.path,
    version_number: versionNumber,
    content_before: existing?.content || null,
    content_after: params.content,
    published_by: params.publishedBy,
    published_at: now,
    rollback_available: true,
    rolled_back_at: null,
    rolled_back_by: null,
    source_draft_id: params.sourceDraftId,
    source_run_id: params.sourceRunId,
  };

  // Update store
  const entry: ContentEntry = {
    path: params.path,
    type: params.type,
    content: params.content,
    version: versionNumber,
    published_at: now,
    published_by: params.publishedBy,
    source_draft_id: params.sourceDraftId,
    source_run_id: params.sourceRunId,
  };

  store[params.path] = entry;
  versions.push(version);

  writeStore(store);
  writeVersions(versions);

  return { version, entry };
}

// Rollback to previous version
export function rollbackContent(params: {
  path: string;
  versionId: string;
  rolledBackBy: string;
}): { success: boolean; message: string; restoredVersion?: number } {
  const store = readStore();
  const versions = readVersions();

  const version = versions.find((v) => v.id === params.versionId);
  if (!version) return { success: false, message: 'Version not found' };
  if (!version.rollback_available) return { success: false, message: 'Version not rollbackable' };
  if (version.content_path !== params.path) return { success: false, message: 'Path mismatch' };

  const existing = store[params.path];
  if (!existing) return { success: false, message: 'No current content at path' };

  // Find previous version
  const prevVersions = versions
    .filter((v) => v.content_path === params.path && v.version_number < version.version_number && v.rollback_available)
    .sort((a, b) => b.version_number - a.version_number);

  if (prevVersions.length === 0) {
    // No previous version — remove content
    delete store[params.path];
  } else {
    const prev = prevVersions[0];
    store[params.path] = {
      path: params.path,
      type: existing.type,
      content: prev.content_after,
      version: prev.version_number,
      published_at: prev.published_at,
      published_by: prev.published_by,
      source_draft_id: prev.source_draft_id,
      source_run_id: prev.source_run_id,
    };
  }

  // Mark version as rolled back
  version.rollback_available = false;
  version.rolled_back_at = nowIso();
  version.rolled_back_by = params.rolledBackBy;

  writeStore(store);
  writeVersions(versions);

  return {
    success: true,
    message: `Rolled back to version ${prevVersions.length > 0 ? prevVersions[0].version_number : 'none (content removed)'}`,
    restoredVersion: prevVersions.length > 0 ? prevVersions[0].version_number : undefined,
  };
}

// List versions for a path
export function listVersions(path: string): ContentVersion[] {
  const versions = readVersions();
  return versions.filter((v) => v.content_path === path).sort((a, b) => b.version_number - a.version_number);
}

// Check if content exists at path
export function contentExists(path: string): boolean {
  const store = readStore();
  return !!store[path];
}

// Get all published content
export function listPublishedContent(): ContentEntry[] {
  const store = readStore();
  return Object.values(store);
}
