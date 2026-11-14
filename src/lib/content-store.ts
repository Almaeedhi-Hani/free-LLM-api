import fs from 'fs';
import path from 'path';
import {
  StorageConflictError,
  StorageUnavailableError,
  asStorageError,
  getSupabaseCredentials,
  resolveStorageMode,
} from './storage-mode';

export interface ContentFAQ {
  q: string;
  a: string;
}

export interface ContentDraft {
  q: string;
  a: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ContactInfo {
  phone: string;
  phoneDisplay: string;
  whatsapp: string;
  email: string;
}

export interface AgentStatus {
  lastRun: string;
  status: 'idle' | 'running' | 'success' | 'error';
  lastResult: string;
}

export interface CookiePolicy {
  analyticsAvailable: boolean;
  marketingAvailable: boolean;
  consentDays: number;
}

export interface SiteContent {
  goldenParagraph: string;
  faqs: ContentFAQ[];
  keywords: string[];
  drafts: ContentDraft[];
  contact: ContactInfo;
  agent: AgentStatus;
  cookiePolicy: CookiePolicy;
  updatedAt: string;
}

const DEFAULT_CONTENT: SiteContent = {
  goldenParagraph:
    'نحن نسهل ونختصر إجراءات فتح الحسابات البنكية الاستثمارية والشركات للأجانب في كبرى البنوك السعودية بامتثال كامل لمتطلبات البنك المركزي السعودي (SAMA).',
  faqs: [
    {
      q: 'هل يشترط حضور المستثمر الأجنبي لفتح الحساب؟',
      a: 'تشترط معظم البنوك حضور المدير التنفيذي أو المفوض بالتوقيع لمرة واحدة للتحقق، ونحن نجهز الملف كاملاً قبل الحضور.',
    },
  ],
  keywords: ['MISA', 'SAMA', 'KYC', 'RHQ', 'Premium Residency', 'CMA'],
  drafts: [],
  contact: {
    phone: '+966545059528',
    phoneDisplay: '+966 54 505 9528',
    whatsapp: 'https://wa.me/966545059528',
    email: 'info@investinsaudi-services.sa',
  },
  agent: {
    lastRun: '',
    status: 'idle',
    lastResult: '',
  },
  cookiePolicy: { analyticsAvailable: true, marketingAvailable: true, consentDays: 180 },
  // Stable sentinel avoids version mismatch when GET and POST use separate Next.js route bundles.
  updatedAt: '1970-01-01T00:00:00.000Z',
};

function storePath(): string {
  return process.env.CONTENT_STORE_PATH || path.join(process.cwd(), 'content-store.json');
}

function supabaseConfig(): { url: string; key: string; table: string } {
  const credentials = getSupabaseCredentials();
  if (!credentials) {
    throw new StorageUnavailableError('Supabase credentials are missing');
  }
  return { ...credentials, table: process.env.SUPABASE_TABLE || 'content_store' };
}

let lock: Promise<void> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = lock;
  let resolveLock!: () => void;
  lock = new Promise<void>((r) => (resolveLock = r));
  return prev.then(async () => {
    try {
      return await fn();
    } finally {
      resolveLock();
    }
  });
}

async function supabaseGet(cfg: { url: string; key: string; table: string }): Promise<SiteContent> {
  let res: Response;
  try {
    res = await fetch(`${cfg.url}/rest/v1/${cfg.table}?id=eq.1&select=content,updated_at`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
      cache: 'no-store',
    });
  } catch (e) {
    throw asStorageError('Supabase getContent request failed', e);
  }
  if (!res.ok) {
    throw new StorageUnavailableError(`Supabase getContent failed: HTTP ${res.status}`);
  }
  const rows = (await res.json()) as Array<{ content: SiteContent; updated_at: string }>;
  if (!rows || rows.length === 0 || !rows[0].content) {
    throw new StorageUnavailableError('Supabase content row is missing');
  }
  const parsed = rows[0].content as Partial<SiteContent>;
  return { ...DEFAULT_CONTENT, ...parsed, drafts: parsed.drafts ?? DEFAULT_CONTENT.drafts, contact: { ...DEFAULT_CONTENT.contact, ...parsed.contact }, agent: { ...DEFAULT_CONTENT.agent, ...parsed.agent }, cookiePolicy: { ...DEFAULT_CONTENT.cookiePolicy, ...parsed.cookiePolicy }, updatedAt: rows[0].updated_at ?? parsed.updatedAt ?? DEFAULT_CONTENT.updatedAt } as SiteContent;
}

async function supabaseSet(cfg: { url: string; key: string; table: string }, next: SiteContent, expectedUpdatedAt: string): Promise<boolean> {
  let res: Response;
  try {
    res = await fetch(`${cfg.url}/rest/v1/${cfg.table}?id=eq.1&updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}`, {
      method: 'PATCH',
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      cache: 'no-store',
      body: JSON.stringify({ content: next, updated_at: next.updatedAt }),
    });
  } catch (e) {
    throw asStorageError('Supabase setContent request failed', e);
  }
  if (res.status === 409) return false;
  if (!res.ok) {
    throw new StorageUnavailableError(`Supabase setContent failed: HTTP ${res.status}`);
  }
  const rows = (await res.json()) as Array<unknown>;
  return Array.isArray(rows) && rows.length > 0;
}

export async function getContent(): Promise<SiteContent> {
  if (resolveStorageMode() === 'supabase') {
    return supabaseGet(supabaseConfig());
  }
  try {
    const raw = fs.readFileSync(storePath(), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<SiteContent>;
    return { ...DEFAULT_CONTENT, ...parsed, drafts: parsed.drafts ?? DEFAULT_CONTENT.drafts, contact: { ...DEFAULT_CONTENT.contact, ...parsed.contact }, agent: { ...DEFAULT_CONTENT.agent, ...parsed.agent }, cookiePolicy: { ...DEFAULT_CONTENT.cookiePolicy, ...parsed.cookiePolicy } } as SiteContent;
  } catch {
    return DEFAULT_CONTENT;
  }
}

export interface ContentWriteOptions {
  /** Admin dashboard replaces explicitly submitted arrays, enabling real delete/edit. */
  replaceArrays?: boolean;
  /** Optimistic locking token from the last data GET; reject stale admin edits. */
  expectedUpdatedAt?: string;
}

function buildNext(current: SiteContent, patch: Partial<SiteContent>, options: ContentWriteOptions = {}): SiteContent {
  const next: SiteContent = {
    ...current,
    ...patch,
    contact: { ...current.contact, ...patch.contact },
    agent: { ...current.agent, ...patch.agent },
    cookiePolicy: { ...current.cookiePolicy, ...patch.cookiePolicy },
    updatedAt: new Date(Math.max(Date.now(), (Date.parse(current.updatedAt) || 0) + 1)).toISOString(),
  };
  if (options.replaceArrays) {
    // Dashboard sends the complete array: removal and editing must be authoritative.
    if (patch.faqs) next.faqs = patch.faqs;
    if (patch.keywords) next.keywords = Array.from(new Set(patch.keywords));
    if (patch.drafts) next.drafts = patch.drafts;
  } else {
    // Preserve append/merge semantics for existing automated-agent writes.
    if (patch.faqs) {
      const map = new Map(current.faqs.map((f) => [f.q, f]));
      for (const f of patch.faqs) map.set(f.q, f);
      next.faqs = Array.from(map.values());
    }
    if (patch.keywords) next.keywords = Array.from(new Set([...current.keywords, ...patch.keywords]));
    if (patch.drafts) {
      const map = new Map(current.drafts.map((d) => [d.q, d]));
      for (const d of patch.drafts) map.set(d.q, d);
      next.drafts = Array.from(map.values());
    }
  }
  return next;
}

function writeLocalContent(data: SiteContent): SiteContent {
  try {
    fs.writeFileSync(storePath(), JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    throw asStorageError('Failed to write content store', e);
  }
  return data;
}

export async function setContent(patch: Partial<SiteContent>, options: ContentWriteOptions = {}): Promise<SiteContent> {
  const mode = resolveStorageMode();

  if (mode === 'file') {
    // Read-modify-write inside the lock, otherwise two concurrent saves can
    // both read the same snapshot and the last writer silently loses data.
    return withLock(async () => {
      const current = await getContent();
      if (options.expectedUpdatedAt && options.expectedUpdatedAt !== current.updatedAt) throw new StorageConflictError();
      return writeLocalContent(buildNext(current, patch, options));
    });
  }

  const cfg = supabaseConfig();
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await supabaseGet(cfg);
    if (options.expectedUpdatedAt && options.expectedUpdatedAt !== current.updatedAt) throw new StorageConflictError();
    const next = buildNext(current, patch, options);
    const ok = await supabaseSet(cfg, next, current.updatedAt);
    if (ok) return next;
  }
  throw new StorageConflictError('Supabase content update failed after 3 attempts due to concurrent modification');
}
