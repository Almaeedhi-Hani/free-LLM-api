import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  StorageUnavailableError,
  asStorageError,
  getSupabaseCredentials,
  resolveStorageMode,
} from './storage-mode';
import { defaultSources, availableSources } from './market-sources';
import type { SuggestionResult, SearchResult } from './market-sources';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Language = 'ar' | 'en' | 'zh';
export type CompetitorStatus = 'active' | 'inactive' | 'disqualified';
export type CompetitorSource = 'manual' | 'search' | 'directory' | 'referral';
export type PageType = 'landing' | 'service' | 'blog' | 'faq' | 'other';
export type Intent = 'informational' | 'transactional' | 'navigational' | 'commercial';
export type OpportunityType =
  | 'content_gap'
  | 'keyword_gap'
  | 'faq_gap'
  | 'service_gap'
  | 'authority_gap';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type OpportunityStatus = 'new' | 'triaged' | 'planned' | 'done' | 'rejected';
export type Confidence = 'high' | 'medium' | 'low';
export type GoalStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
export type RunType = 'radar' | 'discovery' | 'keyword_collection' | 'gap_analysis' | 'goal_generation' | 'full';
export type RunStatus = 'running' | 'success' | 'failed' | 'partial';
export type TriggeredBy = 'manual' | 'cron' | 'github_actions' | 'admin';

export interface Evidence {
  source: string;
  url?: string;
  quote?: string;
  observed_at?: string;
  // 'keyword' = derived from keyword collection; 'competitor' = backed by a
  // competitor observation; 'manual' = entered by an operator.
  origin?: 'keyword' | 'competitor' | 'manual';
}

export interface SuccessMetric {
  metric: string;
  target: string;
  measurement: string;
}

export interface Competitor {
  id: string;
  name: string;
  domain: string;
  languages: Language[];
  market: string;
  status: CompetitorStatus;
  source: CompetitorSource;
  notes?: string;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface CompetitorObservation {
  id: string;
  competitor_id: string;
  observed_at: string;
  language: Language;
  query: string;
  rank?: number | null;
  title?: string;
  snippet?: string;
  url?: string;
  page_type?: PageType | null;
  strengths: string[];
  weaknesses: string[];
  raw?: Record<string, unknown> | null;
}

export interface Keyword {
  id: string;
  term: string;
  language: Language;
  intent: Intent;
  cluster?: string;
  source: string;
  search_volume?: number | null;
  volume_source?: string | null;
  volume_confidence: Confidence | 'unknown';
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  title: string;
  type: OpportunityType;
  priority: Priority;
  score: number;
  evidence: Evidence[];
  languages: Language[];
  related_keywords: string[];
  related_competitors: string[];
  status: OpportunityStatus;
  confidence: Confidence;
  estimated_impact?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentGoal {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: GoalStatus;
  evidence: Evidence[];
  success_metrics: SuccessMetric[];
  confidence: Confidence;
  related_opportunity_id?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface AnalysisRun {
  id: string;
  run_type: RunType;
  started_at: string;
  finished_at?: string | null;
  status: RunStatus;
  summary?: Record<string, unknown> | null;
  error?: string | null;
  triggered_by: TriggeredBy;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface UpsertCompetitorInput {
  name: string;
  domain: string;
  languages?: Language[];
  market?: string;
  source?: CompetitorSource;
  notes?: string;
}

export interface RecordObservationInput {
  competitor_id: string;
  language: Language;
  query: string;
  rank?: number | null;
  title?: string;
  snippet?: string;
  url?: string;
  page_type?: PageType | null;
  strengths?: string[];
  weaknesses?: string[];
  raw?: Record<string, unknown> | null;
  observed_at?: string;
}

export interface UpsertKeywordInput {
  term: string;
  language: Language;
  intent?: Intent;
  cluster?: string;
  source: string;
  search_volume?: number | null;
  volume_source?: string | null;
  volume_confidence?: Confidence | 'unknown';
}

export interface CreateOpportunityInput {
  title: string;
  type: OpportunityType;
  priority?: Priority;
  score?: number;
  evidence: Evidence[];
  languages?: Language[];
  related_keywords?: string[];
  related_competitors?: string[];
  confidence?: Confidence;
  estimated_impact?: string;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  priority?: Priority;
  evidence: Evidence[];
  success_metrics: SuccessMetric[];
  confidence?: Confidence;
  related_opportunity_id?: string | null;
}

// ---------------------------------------------------------------------------
// Pure helpers (deterministic, no external data)
// ---------------------------------------------------------------------------

export function normalizeDomain(input: string): string {
  const trimmed = (input || '').trim().toLowerCase();
  if (!trimmed) return '';
  let url = trimmed;
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '').replace(/\/+$/, '');
  } catch {
    return trimmed.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

export function detectLanguage(text: string): Language {
  const t = text || '';
  if (/[\u4e00-\u9fff]/.test(t)) return 'zh';
  if (/[\u0600-\u06ff]/.test(t)) return 'ar';
  return 'en';
}

const INTENT_PATTERNS: Array<{ intent: Intent; patterns: RegExp[] }> = [
  {
    intent: 'transactional',
    patterns: [
      /\b(buy|order|hire|register|apply|license|cost|price|quote|contact)\b/i,
      /(?:Ø´Ø±Ø§Ø¡|Ø·Ù„Ø¨|ØªØ³Ø¬ÙŠÙ„|ØªÙ‚Ø¯ÙŠÙ…|Ø±Ø®ØµØ©|ØªÙƒÙ„ÙØ©|Ø³Ø¹Ø±|Ø¹Ø±Ø¶|ØªÙˆØ§ØµÙ„)/,
      /(?:è´­ä¹°|ç”³è¯·|æ³¨å†Œ|è®¸å¯è¯|ä»·æ ¼|æŠ¥ä»·|è”ç³»)/,
    ],
  },
  {
    intent: 'commercial',
    patterns: [
      /\b(best|top|compare|vs|review|rating|alternative)\b/i,
      /(?:Ø£ÙØ¶Ù„|Ù…Ù‚Ø§Ø±Ù†Ø©|ØªÙ‚ÙŠÙŠÙ…|Ø¨Ø¯ÙŠÙ„)/,
      /(?:æœ€ä½³|å¯¹æ¯”|è¯„ä»·|æ›¿ä»£)/,
    ],
  },
  {
    intent: 'navigational',
    patterns: [
      /\b(login|portal|dashboard|official|website)\b/i,
      /(?:ØªØ³Ø¬ÙŠÙ„ Ø¯Ø®ÙˆÙ„|Ø¨ÙˆØ§Ø¨Ø©|Ù…ÙˆÙ‚Ø¹ Ø±Ø³Ù…ÙŠ)/,
      /(?:ç™»å½•|é—¨æˆ·|å®˜ç½‘)/,
    ],
  },
];

export function classifyIntent(term: string): Intent {
  const t = term || '';
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(t))) return intent;
  }
  return 'informational';
}

export function scoreOpportunity(input: {
  evidenceCount: number;
  languages: Language[];
  confidence: Confidence;
  type: OpportunityType;
}): number {
  const base = Math.min(40, input.evidenceCount * 10);
  const langBonus = Math.min(20, input.languages.length * 7);
  const confBonus = input.confidence === 'high' ? 25 : input.confidence === 'medium' ? 15 : 5;
  const typeBonus: Record<OpportunityType, number> = {
    service_gap: 15,
    content_gap: 10,
    keyword_gap: 8,
    faq_gap: 7,
    authority_gap: 5,
  };
  const raw = base + langBonus + confBonus + typeBonus[input.type];
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function priorityFromScore(score: number): Priority {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

export function prioritizeGoals<T extends { priority: Priority; confidence: Confidence }>(goals: T[]): T[] {
  const rank: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const conf: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };
  return [...goals].sort((a, b) => {
    if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
    return conf[a.confidence] - conf[b.confidence];
  });
}

// ---------------------------------------------------------------------------
// Domain exclusion (official / non-competitor sites)
// ---------------------------------------------------------------------------

const EXCLUDED_DOMAINS = new Set([
  'misa.gov.sa', 'sama.gov.sa', 'cma.gov.sa', 'mol.gov.sa', 'mci.gov.sa',
  'modon.gov.sa', 'zatca.gov.sa', 'hrsd.gov.sa', 'momah.gov.sa',
  'wikipedia.org', 'en.wikipedia.org', 'ar.wikipedia.org', 'zh.wikipedia.org',
  'youtube.com', 'linkedin.com', 'facebook.com', 'twitter.com', 'x.com',
  'reddit.com', 'quora.com', 'medium.com',
]);

const EXCLUDED_SUFFIXES = ['.gov.sa', '.edu.sa', '.gov.cn', '.gouv.fr'];

export function isExcludedDomain(domain: string): boolean {
  const d = (domain || '').toLowerCase().trim();
  if (!d) return true;
  if (EXCLUDED_DOMAINS.has(d)) return true;
  if (EXCLUDED_SUFFIXES.some((s) => d.endsWith(s))) return true;
  // Directory/news/official patterns
  if (/(directory|yellowpages|yelp|trustpilot|glassdoor|indeed)/.test(d)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Keyword clustering (topic + language + intent)
// ---------------------------------------------------------------------------

const KEYWORD_STOPWORDS = new Set([
  'in', 'saudi', 'arabia', 'ksa', 'the', 'a', 'an', 'for', 'of', 'to',
  'ÙÙŠ', 'Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ©', 'Ø³Ø¹ÙˆØ¯ÙŠ', 'Ù„', 'Ù…Ù†', 'Ø¹Ù„Ù‰',
  'åœ¨', 'æ²™ç‰¹', 'é˜¿æ‹‰ä¼¯', 'çš„',
]);

const KEYWORD_MODIFIERS = new Set([
  'fees', 'fee', 'cost', 'price', 'prices', 'requirements', 'requirement',
  'renewal', 'renew', 'check', 'verification', 'verify', 'online', 'application',
  'costs', 'procedure', 'process', 'documents', 'steps',
  'ØªÙƒÙ„ÙØ©', 'Ø±Ø³ÙˆÙ…', 'Ù…ØªØ·Ù„Ø¨Ø§Øª', 'ØªØ¬Ø¯ÙŠØ¯', 'ØªØ­Ù‚Ù‚', 'Ø§Ø¬Ø±Ø§Ø¡Ø§Øª', 'Ù…Ø³ØªÙ†Ø¯Ø§Øª',
  'è´¹ç”¨', 'è¦æ±‚', 'ç»­æœŸ', 'éªŒè¯',
]);

export function normalizeKeywordCore(term: string): string {
  const t = (term || '').toLowerCase().trim();
  if (!t) return '';
  const tokens = t.split(/\s+/).filter(Boolean);
  const core = tokens.filter((tok) => !KEYWORD_STOPWORDS.has(tok) && !KEYWORD_MODIFIERS.has(tok));
  return (core.length ? core : tokens).join(' ');
}

export function clusterKeywords<T extends { id: string; term: string; language: string; intent: string }>(
  keywords: T[]
): Array<{ core: string; language: string; intent: string; representative: T; members: T[] }> {
  const groups = new Map<string, T[]>();
  for (const k of keywords) {
    const core = normalizeKeywordCore(k.term);
    const key = `${k.language}|${k.intent}|${core}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(k);
  }
  const clusters = [];
  for (const entry of Array.from(groups.entries())) {
    const key = entry[0];
    const members = entry[1];
    const [language, intent, core] = key.split('|', 3);
    // representative: shortest term (most general)
    const representative = members.reduce((a, b) => (a.term.length <= b.term.length ? a : b));
    clusters.push({ core, language, intent, representative, members });
  }
  return clusters;
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
  const dir = process.env.MARKET_INTEL_PATH || path.join(process.cwd(), 'market-intel');
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
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(temp, target);
}

// ---------------------------------------------------------------------------
// Supabase REST helpers
// ---------------------------------------------------------------------------

async function sbFetch(pathname: string, init?: RequestInit): Promise<Response> {
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

function isSupabase(): boolean {
  return resolveStorageMode() === 'supabase';
}

function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Competitors
// ---------------------------------------------------------------------------

export async function listCompetitors(filters?: {
  status?: CompetitorStatus;
  market?: string;
}): Promise<Competitor[]> {
  if (isSupabase()) {
    const params: string[] = ['select=*', 'order=last_seen_at.desc'];
    if (filters?.status) params.push(`status=eq.${encodeURIComponent(filters.status)}`);
    if (filters?.market) params.push(`market=eq.${encodeURIComponent(filters.market)}`);
    const res = await sbFetch(`competitors?${params.join('&')}`);
    return sbJson<Competitor[]>(res, 'listCompetitors');
  }
  let rows = readFile<Competitor>('competitors.json');
  if (filters?.status) rows = rows.filter((c) => c.status === filters.status);
  if (filters?.market) rows = rows.filter((c) => c.market === filters.market);
  return rows.sort((a, b) => b.last_seen_at.localeCompare(a.last_seen_at));
}

export async function getCompetitor(idOrDomain: string): Promise<Competitor | null> {
  const key = idOrDomain.trim();
  if (!key) return null;
  if (isSupabase()) {
    // Try by id first, then domain.
    let res = await sbFetch(`competitors?id=eq.${encodeURIComponent(key)}&select=*&limit=1`);
    let rows = await sbJson<Competitor[]>(res, 'getCompetitor');
    if (!rows.length) {
      res = await sbFetch(`competitors?domain=eq.${encodeURIComponent(normalizeDomain(key))}&select=*&limit=1`);
      rows = await sbJson<Competitor[]>(res, 'getCompetitor');
    }
    return rows.length ? rows[0] : null;
  }
  const rows = readFile<Competitor>('competitors.json');
  return (
    rows.find((c) => c.id === key || c.domain === normalizeDomain(key)) || null
  );
}

export async function upsertCompetitor(input: UpsertCompetitorInput): Promise<Competitor> {
  const domain = normalizeDomain(input.domain);
  if (!domain) throw new Error('Competitor domain is required');
  const name = input.name.trim();
  if (!name) throw new Error('Competitor name is required');

  if (isSupabase()) {
    const existing = await getCompetitor(domain);
    const now = nowIso();
    if (existing) {
      const res = await sbFetch(`competitors?id=eq.${existing.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          name,
          languages: input.languages ?? existing.languages,
          market: input.market ?? existing.market,
          source: input.source ?? existing.source,
          notes: input.notes ?? existing.notes,
          last_seen_at: now,
        }),
      });
      const rows = await sbJson<Competitor[]>(res, 'upsertCompetitor');
      return rows[0];
    }
    const res = await sbFetch('competitors', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        name,
        domain,
        languages: input.languages ?? [],
        market: input.market ?? 'saudi-company-formation',
        source: input.source ?? 'manual',
        notes: input.notes ?? null,
        first_seen_at: now,
        last_seen_at: now,
      }),
    });
    const rows = await sbJson<Competitor[]>(res, 'upsertCompetitor');
    return rows[0];
  }

  return withFileLock(() => {
    const rows = readFile<Competitor>('competitors.json');
    const idx = rows.findIndex((c) => c.domain === domain);
    const now = nowIso();
    if (idx >= 0) {
      rows[idx] = {
        ...rows[idx],
        name,
        languages: input.languages ?? rows[idx].languages,
        market: input.market ?? rows[idx].market,
        source: input.source ?? rows[idx].source,
        notes: input.notes ?? rows[idx].notes,
        last_seen_at: now,
        updated_at: now,
      };
      writeFile('competitors.json', rows);
      return rows[idx];
    }
    const created: Competitor = {
      id: randomUUID(),
      name,
      domain,
      languages: input.languages ?? [],
      market: input.market ?? 'saudi-company-formation',
      status: 'active',
      source: input.source ?? 'manual',
      notes: input.notes,
      first_seen_at: now,
      last_seen_at: now,
      created_at: now,
      updated_at: now,
    };
    rows.push(created);
    writeFile('competitors.json', rows);
    return created;
  });
}

export async function updateCompetitor(id: string, patch: Partial<Competitor>): Promise<Competitor | null> {
  if (isSupabase()) {
    const res = await sbFetch(`competitors?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(patch),
    });
    const rows = await sbJson<Competitor[]>(res, 'updateCompetitor');
    return rows.length ? rows[0] : null;
  }
  return withFileLock(() => {
    const rows = readFile<Competitor>('competitors.json');
    const idx = rows.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    rows[idx] = { ...rows[idx], ...patch, updated_at: nowIso() };
    writeFile('competitors.json', rows);
    return rows[idx];
  });
}

export async function disqualifyCompetitor(id: string, reason: string): Promise<Competitor | null> {
  return updateCompetitor(id, { status: 'disqualified', notes: reason });
}

// ---------------------------------------------------------------------------
// Observations
// ---------------------------------------------------------------------------

export async function recordObservation(input: RecordObservationInput): Promise<CompetitorObservation> {
  const observed_at = input.observed_at || nowIso();
  const payload: CompetitorObservation = {
    id: randomUUID(),
    competitor_id: input.competitor_id,
    observed_at,
    language: input.language,
    query: input.query.trim(),
    rank: input.rank ?? null,
    title: input.title,
    snippet: input.snippet,
    url: input.url,
    page_type: input.page_type ?? null,
    strengths: input.strengths ?? [],
    weaknesses: input.weaknesses ?? [],
    raw: input.raw ?? null,
  };

  if (isSupabase()) {
    const res = await sbFetch('competitor_observations', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (res.status === 409) {
      // Duplicate observation; return the existing one.
      const existing = await sbFetch(
        `competitor_observations?competitor_id=eq.${encodeURIComponent(input.competitor_id)}` +
          `&language=eq.${encodeURIComponent(input.language)}` +
          `&query=eq.${encodeURIComponent(input.query.trim())}` +
          '&select=*&order=observed_at.desc&limit=1'
      );
      const rows = await sbJson<CompetitorObservation[]>(existing, 'recordObservation');
      if (rows.length) return rows[0];
    }
    const rows = await sbJson<CompetitorObservation[]>(res, 'recordObservation');
    return rows[0];
  }

  return withFileLock(() => {
    const rows = readFile<CompetitorObservation>('competitor_observations.json');
    const dup = rows.find(
      (o) =>
        o.competitor_id === input.competitor_id &&
        o.language === input.language &&
        o.query === input.query.trim() &&
        o.observed_at === observed_at
    );
    if (dup) return dup;
    rows.push(payload);
    writeFile('competitor_observations.json', rows);
    return payload;
  });
}

export async function listObservations(competitorId: string, limit = 50): Promise<CompetitorObservation[]> {
  if (isSupabase()) {
    const res = await sbFetch(
      `competitor_observations?competitor_id=eq.${encodeURIComponent(competitorId)}` +
        `&select=*&order=observed_at.desc&limit=${limit}`
    );
    return sbJson<CompetitorObservation[]>(res, 'listObservations');
  }
  return readFile<CompetitorObservation>('competitor_observations.json')
    .filter((o) => o.competitor_id === competitorId)
    .sort((a, b) => b.observed_at.localeCompare(a.observed_at))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Keywords
// ---------------------------------------------------------------------------

export async function upsertKeyword(input: UpsertKeywordInput): Promise<Keyword> {
  const term = input.term.trim();
  if (!term) throw new Error('Keyword term is required');

  if (isSupabase()) {
    const existingRes = await sbFetch(
      `keywords?term=eq.${encodeURIComponent(term)}&language=eq.${encodeURIComponent(input.language)}&select=*&limit=1`
    );
    const existingRows = await sbJson<Keyword[]>(existingRes, 'upsertKeyword');
    const now = nowIso();
    if (existingRows.length) {
      const existing = existingRows[0];
      const res = await sbFetch(`keywords?id=eq.${existing.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          intent: input.intent ?? existing.intent,
          cluster: input.cluster ?? existing.cluster,
          source: input.source || existing.source,
          search_volume:
            input.search_volume !== undefined ? input.search_volume : existing.search_volume,
          volume_source:
            input.volume_source !== undefined ? input.volume_source : existing.volume_source,
          volume_confidence: input.volume_confidence ?? existing.volume_confidence,
          last_seen_at: now,
        }),
      });
      const rows = await sbJson<Keyword[]>(res, 'upsertKeyword');
      return rows[0];
    }
    const res = await sbFetch('keywords', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        term,
        language: input.language,
        intent: input.intent ?? classifyIntent(term),
        cluster: input.cluster ?? null,
        source: input.source,
        search_volume: input.search_volume ?? null,
        volume_source: input.volume_source ?? null,
        volume_confidence: input.volume_confidence ?? 'unknown',
        first_seen_at: now,
        last_seen_at: now,
      }),
    });
    const rows = await sbJson<Keyword[]>(res, 'upsertKeyword');
    return rows[0];
  }

  return withFileLock(() => {
    const rows = readFile<Keyword>('keywords.json');
    const idx = rows.findIndex((k) => k.term === term && k.language === input.language);
    const now = nowIso();
    if (idx >= 0) {
      rows[idx] = {
        ...rows[idx],
        intent: input.intent ?? rows[idx].intent,
        cluster: input.cluster ?? rows[idx].cluster,
        source: input.source || rows[idx].source,
        search_volume:
          input.search_volume !== undefined ? input.search_volume : rows[idx].search_volume,
        volume_source:
          input.volume_source !== undefined ? input.volume_source : rows[idx].volume_source,
        volume_confidence: input.volume_confidence ?? rows[idx].volume_confidence,
        last_seen_at: now,
        updated_at: now,
      };
      writeFile('keywords.json', rows);
      return rows[idx];
    }
    const created: Keyword = {
      id: randomUUID(),
      term,
      language: input.language,
      intent: input.intent ?? classifyIntent(term),
      cluster: input.cluster,
      source: input.source,
      search_volume: input.search_volume ?? null,
      volume_source: input.volume_source ?? null,
      volume_confidence: input.volume_confidence ?? 'unknown',
      first_seen_at: now,
      last_seen_at: now,
      created_at: now,
      updated_at: now,
    };
    rows.push(created);
    writeFile('keywords.json', rows);
    return created;
  });
}

export async function listKeywords(filters?: {
  language?: Language;
  intent?: Intent;
  cluster?: string;
}): Promise<Keyword[]> {
  if (isSupabase()) {
    const params: string[] = ['select=*', 'order=last_seen_at.desc'];
    if (filters?.language) params.push(`language=eq.${encodeURIComponent(filters.language)}`);
    if (filters?.intent) params.push(`intent=eq.${encodeURIComponent(filters.intent)}`);
    if (filters?.cluster) params.push(`cluster=eq.${encodeURIComponent(filters.cluster)}`);
    const res = await sbFetch(`keywords?${params.join('&')}`);
    return sbJson<Keyword[]>(res, 'listKeywords');
  }
  let rows = readFile<Keyword>('keywords.json');
  if (filters?.language) rows = rows.filter((k) => k.language === filters.language);
  if (filters?.intent) rows = rows.filter((k) => k.intent === filters.intent);
  if (filters?.cluster) rows = rows.filter((k) => k.cluster === filters.cluster);
  return rows.sort((a, b) => b.last_seen_at.localeCompare(a.last_seen_at));
}

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------

export async function createOpportunity(input: CreateOpportunityInput): Promise<Opportunity> {
  const title = input.title.trim();
  if (!title) throw new Error('Opportunity title is required');

  if (isSupabase()) {
    const existingRes = await sbFetch(
      `opportunities?title=eq.${encodeURIComponent(title)}&type=eq.${encodeURIComponent(input.type)}&select=*&limit=1`
    );
    const existingRows = await sbJson<Opportunity[]>(existingRes, 'createOpportunity');
    if (existingRows.length) return existingRows[0];

    const score = input.score ?? scoreOpportunity({
      evidenceCount: input.evidence.length,
      languages: input.languages ?? [],
      confidence: input.confidence ?? 'low',
      type: input.type,
    });
    const res = await sbFetch('opportunities', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        title,
        type: input.type,
        priority: input.priority ?? priorityFromScore(score),
        score,
        evidence: input.evidence,
        languages: input.languages ?? [],
        related_keywords: input.related_keywords ?? [],
        related_competitors: input.related_competitors ?? [],
        confidence: input.confidence ?? 'low',
        estimated_impact: input.estimated_impact ?? null,
      }),
    });
    const rows = await sbJson<Opportunity[]>(res, 'createOpportunity');
    return rows[0];
  }

  return withFileLock(() => {
    const rows = readFile<Opportunity>('opportunities.json');
    const dup = rows.find((o) => o.title === title && o.type === input.type);
    if (dup) return dup;
    const now = nowIso();
    const score = input.score ?? scoreOpportunity({
      evidenceCount: input.evidence.length,
      languages: input.languages ?? [],
      confidence: input.confidence ?? 'low',
      type: input.type,
    });
    const created: Opportunity = {
      id: randomUUID(),
      title,
      type: input.type,
      priority: input.priority ?? priorityFromScore(score),
      score,
      evidence: input.evidence,
      languages: input.languages ?? [],
      related_keywords: input.related_keywords ?? [],
      related_competitors: input.related_competitors ?? [],
      status: 'new',
      confidence: input.confidence ?? 'low',
      estimated_impact: input.estimated_impact,
      created_at: now,
      updated_at: now,
    };
    rows.push(created);
    writeFile('opportunities.json', rows);
    return created;
  });
}

export async function updateOpportunity(id: string, patch: Partial<Opportunity>): Promise<Opportunity | null> {
  if (isSupabase()) {
    const res = await sbFetch(`opportunities?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(patch),
    });
    const rows = await sbJson<Opportunity[]>(res, 'updateOpportunity');
    return rows.length ? rows[0] : null;
  }
  return withFileLock(() => {
    const rows = readFile<Opportunity>('opportunities.json');
    const idx = rows.findIndex((o) => o.id === id);
    if (idx < 0) return null;
    rows[idx] = { ...rows[idx], ...patch, updated_at: nowIso() };
    writeFile('opportunities.json', rows);
    return rows[idx];
  });
}

export async function listOpportunities(filters?: {
  status?: OpportunityStatus;
  priority?: Priority;
  type?: OpportunityType;
}): Promise<Opportunity[]> {
  if (isSupabase()) {
    const params: string[] = ['select=*', 'order=score.desc'];
    if (filters?.status) params.push(`status=eq.${encodeURIComponent(filters.status)}`);
    if (filters?.priority) params.push(`priority=eq.${encodeURIComponent(filters.priority)}`);
    if (filters?.type) params.push(`type=eq.${encodeURIComponent(filters.type)}`);
    const res = await sbFetch(`opportunities?${params.join('&')}`);
    return sbJson<Opportunity[]>(res, 'listOpportunities');
  }
  let rows = readFile<Opportunity>('opportunities.json');
  if (filters?.status) rows = rows.filter((o) => o.status === filters.status);
  if (filters?.priority) rows = rows.filter((o) => o.priority === filters.priority);
  if (filters?.type) rows = rows.filter((o) => o.type === filters.type);
  return rows.sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export async function createGoal(input: CreateGoalInput): Promise<AgentGoal> {
  const title = input.title.trim();
  if (!title) throw new Error('Goal title is required');

  if (isSupabase()) {
    const existingRes = await sbFetch(
      `agent_goals?title=eq.${encodeURIComponent(title)}` +
        `&related_opportunity_id=${input.related_opportunity_id ? `eq.${encodeURIComponent(input.related_opportunity_id)}` : 'is.null'}` +
        '&select=*&limit=1'
    );
    const existingRows = await sbJson<AgentGoal[]>(existingRes, 'createGoal');
    if (existingRows.length) return existingRows[0];

    const res = await sbFetch('agent_goals', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        title,
        description: input.description ?? null,
        priority: input.priority ?? 'medium',
        evidence: input.evidence,
        success_metrics: input.success_metrics,
        confidence: input.confidence ?? 'low',
        related_opportunity_id: input.related_opportunity_id ?? null,
      }),
    });
    const rows = await sbJson<AgentGoal[]>(res, 'createGoal');
    return rows[0];
  }

  return withFileLock(() => {
    const rows = readFile<AgentGoal>('agent_goals.json');
    const dup = rows.find(
      (g) =>
        g.title === title &&
        (g.related_opportunity_id ?? null) === (input.related_opportunity_id ?? null)
    );
    if (dup) return dup;
    const now = nowIso();
    const created: AgentGoal = {
      id: randomUUID(),
      title,
      description: input.description,
      priority: input.priority ?? 'medium',
      status: 'open',
      evidence: input.evidence,
      success_metrics: input.success_metrics,
      confidence: input.confidence ?? 'low',
      related_opportunity_id: input.related_opportunity_id ?? null,
      created_at: now,
      updated_at: now,
      completed_at: null,
    };
    rows.push(created);
    writeFile('agent_goals.json', rows);
    return created;
  });
}

export async function updateGoal(id: string, patch: Partial<AgentGoal>): Promise<AgentGoal | null> {
  if (isSupabase()) {
    const res = await sbFetch(`agent_goals?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(patch),
    });
    const rows = await sbJson<AgentGoal[]>(res, 'updateGoal');
    return rows.length ? rows[0] : null;
  }
  return withFileLock(() => {
    const rows = readFile<AgentGoal>('agent_goals.json');
    const idx = rows.findIndex((g) => g.id === id);
    if (idx < 0) return null;
    rows[idx] = { ...rows[idx], ...patch, updated_at: nowIso() };
    writeFile('agent_goals.json', rows);
    return rows[idx];
  });
}

export async function listGoals(filters?: {
  status?: GoalStatus;
  priority?: Priority;
}): Promise<AgentGoal[]> {
  if (isSupabase()) {
    const params: string[] = ['select=*', 'order=created_at.desc'];
    if (filters?.status) params.push(`status=eq.${encodeURIComponent(filters.status)}`);
    if (filters?.priority) params.push(`priority=eq.${encodeURIComponent(filters.priority)}`);
    const res = await sbFetch(`agent_goals?${params.join('&')}`);
    return sbJson<AgentGoal[]>(res, 'listGoals');
  }
  let rows = readFile<AgentGoal>('agent_goals.json');
  if (filters?.status) rows = rows.filter((g) => g.status === filters.status);
  if (filters?.priority) rows = rows.filter((g) => g.priority === filters.priority);
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ---------------------------------------------------------------------------
// Analysis runs
// ---------------------------------------------------------------------------

export async function startRun(runType: RunType, triggeredBy: TriggeredBy = 'manual'): Promise<AnalysisRun> {
  if (isSupabase()) {
    const res = await sbFetch('analysis_runs', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ run_type: runType, status: 'running', triggered_by: triggeredBy }),
    });
    const rows = await sbJson<AnalysisRun[]>(res, 'startRun');
    return rows[0];
  }
  const now = nowIso();
  const run: AnalysisRun = {
    id: randomUUID(),
    run_type: runType,
    started_at: now,
    finished_at: null,
    status: 'running',
    summary: null,
    error: null,
    triggered_by: triggeredBy,
    created_at: now,
    updated_at: now,
  };
  const rows = readFile<AnalysisRun>('analysis_runs.json');
  rows.push(run);
  writeFile('analysis_runs.json', rows);
  return run;
}

export async function finishRun(
  id: string,
  status: RunStatus,
  summary?: Record<string, unknown>,
  error?: string
): Promise<void> {
  const now = nowIso();
  if (isSupabase()) {
    const res = await sbFetch(`analysis_runs?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status, finished_at: now, summary: summary ?? null, error: error ?? null }),
    });
    await assertOk(res, 'finishRun');
    return;
  }
  const rows = readFile<AnalysisRun>('analysis_runs.json');
  const idx = rows.findIndex((r) => r.id === id);
  if (idx >= 0) {
    rows[idx] = { ...rows[idx], status, finished_at: now, summary: summary ?? null, error: error ?? null, updated_at: now };
    writeFile('analysis_runs.json', rows);
  }
}

export async function listRuns(limit = 20): Promise<AnalysisRun[]> {
  if (isSupabase()) {
    const res = await sbFetch(`analysis_runs?select=*&order=started_at.desc&limit=${limit}`);
    return sbJson<AnalysisRun[]>(res, 'listRuns');
  }
  return readFile<AnalysisRun>('analysis_runs.json')
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Bounded market analysis (no external data sources; deterministic)
// ---------------------------------------------------------------------------

const MAX_COMPETITORS_PER_RUN = 50;
const MAX_KEYWORDS_PER_RUN = 200;

export async function runMarketAnalysis(triggeredBy: TriggeredBy = 'manual'): Promise<{
  run_id: string;
  summary: Record<string, unknown>;
}> {
  const run = await startRun('full', triggeredBy);
  try {
    const competitors = (await listCompetitors({ status: 'active' })).slice(0, MAX_COMPETITORS_PER_RUN);
    const keywords = (await listKeywords()).slice(0, MAX_KEYWORDS_PER_RUN);

    let opportunitiesCreated = 0;
    let goalsCreated = 0;

    for (const c of competitors) {
      const obs = await listObservations(c.id, 20);
      const weaknesses = obs.flatMap((o) => o.weaknesses || []).filter(Boolean);
      if (weaknesses.length === 0) continue;
      const langs = Array.from(new Set(obs.map((o) => o.language))) as Language[];
      const evidence = obs.slice(0, 5).map((o) => ({
        source: 'competitor_observation',
        observed_at: o.observed_at,
        origin: 'competitor' as const,
      }));
      const score = scoreOpportunity({
        evidenceCount: evidence.length,
        languages: langs,
        confidence: 'medium',
        type: 'content_gap',
      });
      const opp = await createOpportunity({
        title: `Address competitor gap: ${c.domain}`,
        type: 'content_gap',
        priority: priorityFromScore(score),
        score,
        evidence,
        languages: langs,
        related_competitors: [c.id],
        confidence: 'medium',
        estimated_impact: 'Improve coverage of topics where competitors show weaknesses',
      });
      opportunitiesCreated += 1;
      await createGoal({
        title: `Close content gap vs ${c.domain}`,
        description: `Produce original, evidence-backed content addressing: ${weaknesses.slice(0, 3).join(', ')}`,
        priority: opp.priority,
        evidence,
        success_metrics: [
          { metric: 'page_published', target: '1', measurement: 'count of published pages covering the gap' },
          { metric: 'version_created', target: '>=1', measurement: 'page_versions rows for the new page' },
        ],
        confidence: 'medium',
        related_opportunity_id: opp.id,
      });
      goalsCreated += 1;
    }

    const MAX_NEW_OPPORTUNITIES = 10;
    const GOAL_SCORE_THRESHOLD = 50;
    const existingOpps = await listOpportunities();
    const txKeywords = keywords.filter((k) => k.intent === 'transactional' || k.intent === 'commercial');
    const clusters = clusterKeywords(txKeywords);
    let newOppsThisRun = 0;
    for (const cluster of clusters) {
      if (newOppsThisRun >= MAX_NEW_OPPORTUNITIES) break;
      const rep = cluster.representative;
      const clusterTitle = `Target cluster: ${cluster.core} (${cluster.language})`;
      const already = existingOpps.some((o) => o.title === clusterTitle);
      if (already) continue;
      const score = scoreOpportunity({
        evidenceCount: cluster.members.length,
        languages: [cluster.language as 'ar' | 'en' | 'zh'],
        confidence: cluster.members.some((m) => (m as Keyword).volume_confidence === 'high') ? 'high' : 'low',
        type: 'keyword_gap',
      });
      const opp = await createOpportunity({
        title: clusterTitle,
        type: 'keyword_gap',
        priority: priorityFromScore(score),
        score,
        evidence: cluster.members.map((m) => ({
          source: (m as Keyword).source,
          observed_at: (m as Keyword).last_seen_at,
          origin: 'keyword',
        })),
        languages: [cluster.language as 'ar' | 'en' | 'zh'],
        related_keywords: cluster.members.map((m) => m.id),
        confidence: cluster.members.some((m) => (m as Keyword).volume_confidence === 'high') ? 'high' : 'low',
        estimated_impact: `Cluster of ${cluster.members.length} related search terms`,
      });
      opportunitiesCreated += 1;
      newOppsThisRun += 1;
      // Only auto-create goals for sufficiently strong opportunities.
      if (score >= GOAL_SCORE_THRESHOLD) {
        await createGoal({
          title: `Build page for cluster: ${cluster.core}`,
          description: `Create an original, source-backed page targeting the cluster: ${cluster.members.map((m) => (m as Keyword).term).join(', ')}.`,
          priority: opp.priority,
          evidence: cluster.members.map((m) => ({
            source: (m as Keyword).source,
            observed_at: (m as Keyword).last_seen_at,
            origin: 'keyword' as const,
          })),
          success_metrics: [
            { metric: 'page_created', target: '1', measurement: 'site_pages row with matching slug' },
            { metric: 'indexed', target: 'true', measurement: 'search engine index status' },
          ],
          confidence: opp.confidence,
          related_opportunity_id: opp.id,
        });
        goalsCreated += 1;
      }
    }

    const summary = {
      competitors_analyzed: competitors.length,
      keywords_analyzed: keywords.length,
      opportunities_created: opportunitiesCreated,
      goals_created: goalsCreated,
      limits: { max_competitors: MAX_COMPETITORS_PER_RUN, max_keywords: MAX_KEYWORDS_PER_RUN },
    };
    await finishRun(run.id, 'success', summary);
    return { run_id: run.id, summary };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finishRun(run.id, 'failed', undefined, msg);
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Real discovery (free sources) + radar orchestration
// ---------------------------------------------------------------------------

export interface DiscoveryConfig {
  seeds?: Record<Language, string[]>;
  allowedSourceIds?: string[];
  maxSuggestionsPerSeed?: number;
  maxCompetitors?: number;
  triggeredBy?: TriggeredBy;
}

export interface DiscoverySummary {
  sources_used: string[];
  sources_unavailable: string[];
  suggestions_collected: number;
  keywords_upserted: number;
  competitors_discovered: number;
  observations_recorded: number;
  unique_domains: number;
  success: boolean;
  search_diagnostics: { source_id: string; language: string; http_status: number; duration_ms: number; response_received: boolean; results_parsed: number; results_accepted: number; blocked_detected: boolean; failure_reason: string; }[];
  errors: string[];
}

const DEFAULT_SEEDS: Record<Language, string[]> = {
  ar: ['تأسيس شركة في السعودية', 'رخصة مستثمر أجنبي', 'MISA license'],
  en: ['company formation Saudi Arabia', 'MISA license', 'foreign investment Saudi'],
  zh: ['沙特公司注册', 'MISA许可证', '沙特企业银行'],
};

export async function runDiscovery(config?: Partial<DiscoveryConfig>): Promise<DiscoverySummary> {
  const seeds = config?.seeds || DEFAULT_SEEDS;
  const maxSug = config?.maxSuggestionsPerSeed ?? 10;
  const maxComp = config?.maxCompetitors ?? 20;

  const allSources = defaultSources();
  const sources = config?.allowedSourceIds ? allSources.filter((s) => config.allowedSourceIds!.includes(s.id)) : allSources;
  const summary: DiscoverySummary = {
    sources_used: [],
    sources_unavailable: availableSources().filter((s) => !s.available).map((s) => s.id),
    suggestions_collected: 0,
    keywords_upserted: 0,
    competitors_discovered: 0,
    observations_recorded: 0,
    unique_domains: 0,
    success: false,
    search_diagnostics: [],
    errors: [],
  };

  const collectedTerms = new Set<string>();
  const discoveredDomains = new Set<string>();
  const searchDiagnostics: DiscoverySummary['search_diagnostics'] = [];
  const observedKeys = new Set<string>();





  // 1) Keyword/question discovery via suggest sources
  for (const source of sources) {
    if (!source.collectSuggestions) continue;
    summary.sources_used.push(source.id);
    for (const lang of ['ar', 'en', 'zh'] as Language[]) {
      const seedList = seeds[lang] || [];
      for (const seed of seedList) {
        try {
          const res = await source.collectSuggestions(seed, lang);
          const limited = res.slice(0, maxSug);
          summary.suggestions_collected += limited.length;
          for (const r of limited) {
            const term = r.term.trim();
            if (!term || collectedTerms.has(`${term}|${lang}`)) continue;
            collectedTerms.add(`${term}|${lang}`);
            try {
              await upsertKeyword({
                term,
                language: lang,
                intent: classifyIntent(term),
                source: r.source,
                volume_confidence: 'unknown',
              });
              summary.keywords_upserted += 1;
            } catch (e) {
              summary.errors.push(`keyword upsert failed: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
        } catch (e) {
          summary.errors.push(`${source.id} suggest failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  }

  // 2) Competitor discovery via search sources (key-gated)
  for (const source of sources) {
    if (!source.collectResults) continue;
    if (source.requiresKey && !(process.env[source.requiresKey] || '').trim()) continue;
    for (const lang of ['ar', 'en', 'zh'] as Language[]) {
      const seedList = seeds[lang] || [];
      for (const seed of seedList.slice(0, 3)) {
        const diag = { source_id: source.id, language: lang, http_status: 0, duration_ms: 0, response_received: false, results_parsed: 0, results_accepted: 0, blocked_detected: false, failure_reason: '' };
        try {
          const results = await source.collectResults!(seed, lang, maxComp);
           const srcDiag = (source as any).lastDiagnostic;
           if (srcDiag) { diag.http_status = srcDiag.http_status; diag.duration_ms = srcDiag.duration_ms; diag.response_received = srcDiag.response_received; diag.blocked_detected = srcDiag.blocked_detected; if (srcDiag.failure_reason) diag.failure_reason = srcDiag.failure_reason; }
          diag.results_parsed = results.length;
          for (const r of results) {
            if (discoveredDomains.size >= maxComp) break;
            if (!r.domain) continue;
            if (isExcludedDomain(r.domain)) continue;
            try {
              const comp = await upsertCompetitor({
                name: r.title || r.domain,
                domain: r.domain,
                languages: [lang],
                source: 'search',
                notes: `Discovered via ${source.id} for query "${seed}"`,
              });
               if (discoveredDomains.has(r.domain)) continue;
               discoveredDomains.add(r.domain);
               summary.competitors_discovered += 1;
               diag.results_accepted += 1;
              await recordObservation({
                competitor_id: comp.id,
                language: lang,
                 query: seed,
                 rank: source.requiresKey ? null : r.rank,
                 title: source.requiresKey ? undefined : r.title,
                 snippet: source.requiresKey ? undefined : r.snippet,
                 url: source.requiresKey ? undefined : r.url,
                observed_at: new Date().toISOString(),
                strengths: [],
                weaknesses: [],
              });
              summary.observations_recorded += 1;
            } catch (e) {
              summary.errors.push(`competitor upsert failed: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
          searchDiagnostics.push(diag);
        } catch (e) {
          diag.failure_reason = e instanceof Error ? e.message : String(e);
          searchDiagnostics.push(diag);
          summary.errors.push(`${source.id} search failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  }

  summary.search_diagnostics = searchDiagnostics;
  summary.search_diagnostics = searchDiagnostics;
  summary.unique_domains = discoveredDomains.size;
  summary.success = summary.competitors_discovered > 0;
  return summary;
}

export async function runRadar(config?: Partial<DiscoveryConfig>): Promise<{
  run_id: string;
  discovery: DiscoverySummary;
  analysis: { run_id: string; summary: Record<string, unknown> };
}> {
  const run = await startRun('radar', config?.triggeredBy || 'manual');
  try {
    const discovery = await runDiscovery(config);
    const analysis = await runMarketAnalysis(config?.triggeredBy || 'manual');
    const summary = { discovery, analysis: analysis.summary };
    await finishRun(run.id, 'success', summary);
    return { run_id: run.id, discovery, analysis };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finishRun(run.id, 'failed', undefined, msg);
    throw e;
  }
}

export function listAvailableSources() {
  return availableSources();
}








