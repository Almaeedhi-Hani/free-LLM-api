/**
 * GEO discovery results are unverified market research candidates, not ranked SERP evidence.
 * Normalize an explicitly bounded batch before any database write. No DB/network dependency.
 */
export type GeoDiscoveryLanguage = 'ar' | 'en' | 'zh';
export type GeoDiscoverySource = 'exa' | 'tavily' | 'parallel' | 'firecrawl' | 'bing-rss';
export type GeoDiscoveryCandidate = {
  url: string; title: string; snippet: string; query: string;
  language: GeoDiscoveryLanguage; source: GeoDiscoverySource; collected_at: string;
};
export type GeoDiscoverySuggestion = {
  term: string; query: string; language: GeoDiscoveryLanguage;
  source: 'google-suggest'; collected_at: string;
};
export type GeoDiscoveryBatch = {
  candidates: GeoDiscoveryCandidate[];
  suggestions: GeoDiscoverySuggestion[];
};
export type GeoDiscoveryOutcome = {
  ok: boolean;
  requested: { candidates: number; keywords: number };
  confirmed: { candidates: number; keywords: number };
  errors: string[];
};
export type GeoDiscoveryActions = {
  saveCandidate: (item: GeoDiscoveryCandidate) => Promise<void>;
  saveKeyword: (item: GeoDiscoverySuggestion) => Promise<void>;
};

const languages = new Set(['ar','en','zh']);
const sources = new Set(['exa','tavily','parallel','firecrawl','bing-rss']);
const stringField = (value: unknown, min: number, max: number): string => {
  if (typeof value !== 'string') throw new Error('Invalid discovery text');
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  if (normalized.length < min || normalized.length > max || normalized.includes('\uFFFD'))
    throw new Error('Invalid discovery text');
  return normalized;
};
const dateField = (value: unknown): string => {
  const text = stringField(value, 10, 64);
  const millis = Date.parse(text);
  if (!Number.isFinite(millis)) throw new Error('Invalid discovery timestamp');
  if (millis > Date.now() + 5 * 60 * 1000) throw new Error('Future discovery timestamp');
  return new Date(millis).toISOString();
};
const languageField = (value: unknown): GeoDiscoveryLanguage => {
  if (!languages.has(String(value))) throw new Error('Unsupported discovery language');
  return value as GeoDiscoveryLanguage;
};
function sourceUrl(value: unknown): string {
  const text = stringField(value, 12, 1800);
  let parsed: URL;
  try { parsed = new URL(text); } catch { throw new Error('Invalid discovery URL'); }
  if (!['https:','http:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password || parsed.port)
    throw new Error('Unsafe discovery URL');
  // No network request is made to these URLs. Exclude private or synthetic hosts.
  const host = parsed.hostname.toLowerCase();
  if (!/^[a-z0-9.-]+$/.test(host) || !host.includes('.') ||
      host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      host.endsWith('.internal') || host.endsWith('.invalid') ||
      /^(?:10|127|0|169\.254|192\.168)\./.test(host) ||
      /^172\.(?:1[6-9]|2\d|3[01])\./.test(host))
    throw new Error('Unsafe discovery host');
  parsed.hash = '';
  return parsed.toString();
}
const objectField = (raw: unknown): Record<string,unknown> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid discovery record');
  return raw as Record<string,unknown>;
};
export function normalizeGeoDiscoveryBatch(raw: unknown): GeoDiscoveryBatch {
  const body = objectField(raw);
  if (!Array.isArray(body.candidates) || body.candidates.length > 15 ||
      !Array.isArray(body.suggestions) || body.suggestions.length > 30)
    throw new Error('Discovery batch exceeds bounded collection');
  const candidates = body.candidates.map((value): GeoDiscoveryCandidate => {
    const item = objectField(value);
    // Provider result order is not an observed Google organic rank.
    if (item.rank !== undefined && item.rank !== null) throw new Error('Candidate rank must be null');
    if (item.verification !== undefined && item.verification !== 'candidate')
      throw new Error('Discovery candidates cannot be verified');
    if (item.rank_status !== undefined && item.rank_status !== 'unverified_provider_order')
      throw new Error('Unverified candidate provenance required');
    if (!sources.has(String(item.source))) throw new Error('Untrusted discovery provider');
    return {
      url: sourceUrl(item.url),
      title: stringField(item.title, 2, 250),
      snippet: typeof item.snippet === 'string' ? stringField(item.snippet || ' ', 0, 500) : '',
      query: stringField(item.query, 3, 220),
      language: languageField(item.language),
      source: item.source as GeoDiscoverySource,
      collected_at: dateField(item.collected_at)
    };
  });
  const suggestions = body.suggestions.map((value): GeoDiscoverySuggestion => {
    const item = objectField(value);
    if (item.source !== 'google-suggest' ||
        item.rank !== undefined || item.position !== undefined ||
        item.search_volume !== undefined)
      throw new Error('Keyword suggestions must not assert ranks or volume');
    return {
      term: stringField(item.term, 2, 160),
      query: stringField(item.query, 3, 220),
      language: languageField(item.language),
      source: 'google-suggest',
      collected_at: dateField(item.collected_at)
    };
  });
  if (!candidates.length && !suggestions.length) throw new Error('Empty discovery batch');
  return {candidates,suggestions};
}
/** Confirm each record individually. Partial writes must not be reported as a complete run. */
export async function persistGeoDiscoveryBatch(batch: GeoDiscoveryBatch, actions: GeoDiscoveryActions): Promise<GeoDiscoveryOutcome> {
  const result: GeoDiscoveryOutcome = {
    ok: false,
    requested: {candidates:batch.candidates.length,keywords:batch.suggestions.length},
    confirmed: {candidates:0,keywords:0},
    errors: []
  };
  for (const item of batch.suggestions) {
    try { await actions.saveKeyword(item); result.confirmed.keywords++; }
    catch (error) { result.errors.push('keyword: ' + (error instanceof Error ? error.message : 'storage unavailable')); }
  }
  for (const item of batch.candidates) {
    try { await actions.saveCandidate(item); result.confirmed.candidates++; }
    catch (error) { result.errors.push('candidate: ' + (error instanceof Error ? error.message : 'storage unavailable')); }
  }
  result.ok = result.errors.length === 0;
  return result;
}
