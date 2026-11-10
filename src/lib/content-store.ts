import fs from 'fs';
import path from 'path';

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

export interface SiteContent {
  goldenParagraph: string;
  faqs: ContentFAQ[];
  keywords: string[];
  drafts: ContentDraft[];
  version: number;
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
  version: 1,
  updatedAt: new Date().toISOString(),
};

function storePath(): string {
  return process.env.CONTENT_STORE_PATH || path.join(process.cwd(), 'content-store.json');
}

function supabaseConfig(): { url: string; key: string; table: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), key, table: process.env.SUPABASE_TABLE || 'content_store' };
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
  try {
    const res = await fetch(`${cfg.url}/rest/v1/${cfg.table}?id=eq.1&select=content`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
    });
    if (res.ok) {
      const rows = (await res.json()) as Array<{ content: SiteContent }>;
      if (rows && rows.length > 0 && rows[0].content) {
        const parsed = rows[0].content as Partial<SiteContent>;
        return { ...DEFAULT_CONTENT, ...parsed, version: parsed.version ?? DEFAULT_CONTENT.version, drafts: parsed.drafts ?? DEFAULT_CONTENT.drafts } as SiteContent;
      }
    }
  } catch (e) {
    console.error('Supabase getContent error:', e);
  }
  return DEFAULT_CONTENT;
}

async function supabaseSet(cfg: { url: string; key: string; table: string }, next: SiteContent, expectedVersion: number): Promise<boolean> {
  try {
    const res = await fetch(`${cfg.url}/rest/v1/${cfg.table}?id=eq.1&version=eq.${expectedVersion}`, {
      method: 'PATCH',
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ content: next, version: next.version, updated_at: next.updatedAt }),
    });
    if (!res.ok) return false;
    const rows = (await res.json()) as Array<unknown>;
    return Array.isArray(rows) && rows.length > 0;
  } catch (e) {
    console.error('Supabase setContent error:', e);
    return false;
  }
}

export async function getContent(): Promise<SiteContent> {
  const cfg = supabaseConfig();
  if (cfg) return supabaseGet(cfg);
  try {
    const raw = fs.readFileSync(storePath(), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<SiteContent>;
    return { ...DEFAULT_CONTENT, ...parsed, version: parsed.version ?? DEFAULT_CONTENT.version, drafts: parsed.drafts ?? DEFAULT_CONTENT.drafts } as SiteContent;
  } catch {
    return DEFAULT_CONTENT;
  }
}

export async function setContent(patch: Partial<SiteContent>): Promise<SiteContent> {
  const cfg = supabaseConfig();
  // Retry loop for optimistic concurrency
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await getContent();
    const next: SiteContent = {
      ...current,
      ...patch,
      version: (current.version || 1) + 1,
      updatedAt: new Date().toISOString(),
    };
    if (patch.faqs) {
      const map = new Map(current.faqs.map((f) => [f.q, f]));
      for (const f of patch.faqs) if (!map.has(f.q)) map.set(f.q, f);
      next.faqs = Array.from(map.values());
    }
    if (patch.keywords) {
      next.keywords = Array.from(new Set([...current.keywords, ...patch.keywords]));
    }
    if (patch.drafts) {
      const map = new Map(current.drafts.map((d) => [d.q, d]));
      for (const d of patch.drafts) if (!map.has(d.q)) map.set(d.q, d);
      next.drafts = Array.from(map.values());
    }

    if (cfg) {
      const ok = await supabaseSet(cfg, next, current.version || 1);
      if (ok) return next;
      // conflict: retry
      continue;
    }
    // File fallback with lock
    return withLock(async () => {
      try {
        fs.writeFileSync(storePath(), JSON.stringify(next, null, 2), 'utf-8');
      } catch (e) {
        console.error('Failed to write content store:', e);
      }
      return next;
    });
  }
  // If all retries failed, return current content
  return getContent();
}
