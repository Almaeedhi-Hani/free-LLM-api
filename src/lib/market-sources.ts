import type { Language } from './market-intelligence';
import { DuckDuckGoHtmlSource, BingRssSearchSource } from './open-search-sources';

export interface SuggestionResult { term: string; language: Language; source: string; }
export interface SearchResult { domain: string; title: string; snippet: string; url: string; rank: number; source: string; }

export interface SearchSource {
  id: string;
  free: boolean;
  requiresKey: string | null;
  supportedLanguages: Language[];
  deprecated?: boolean;
  collectSuggestions(query: string, language: Language): Promise<SuggestionResult[]>;
  collectResults?(query: string, language: Language, limit: number): Promise<SearchResult[]>;
}

export class GoogleSuggestSource implements SearchSource {
  id = 'google-suggest';
  free = true;
  requiresKey = null;
  supportedLanguages: Language[] = ['ar', 'en', 'zh'];
  async collectSuggestions(query: string, language: Language): Promise<SuggestionResult[]> {
    const lang = language === 'ar' ? 'ar' : language === 'zh' ? 'zh-CN' : 'en';
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}&hl=${lang}`;
    try {
      const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
      if (!res.ok) return [];
      const data = await res.json();
      const suggestions = Array.isArray(data?.[1]) ? data[1] : [];
      return suggestions.map((s: string) => ({ term: s, language, source: this.id }));
    } catch { return []; }
  }
}

export class DuckDuckGoSuggestSource implements SearchSource {
  id = 'duckduckgo-suggest';
  free = true;
  requiresKey = null;
  supportedLanguages: Language[] = ['ar', 'en', 'zh'];
  async collectSuggestions(query: string, language: Language): Promise<SuggestionResult[]> {
    const url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return [];
      const data = await res.json();
      const suggestions = Array.isArray(data?.[1]) ? data[1] : [];
      return suggestions.map((s: string) => ({ term: s, language, source: this.id }));
    } catch { return []; }
  }
}

export class BraveSearchSource implements SearchSource {
  id = 'brave-search';
  free = false;
  requiresKey = 'BRAVE_SEARCH_API_KEY';
  supportedLanguages: Language[] = ['ar', 'en', 'zh'];
  private key(): string | null { return (process.env.BRAVE_SEARCH_API_KEY || '').trim() || null; }
  isAvailable(): boolean { return !!this.key(); }
  async collectSuggestions(_query: string, _language: Language): Promise<SuggestionResult[]> { return []; }
  async collectResults(query: string, language: Language, limit: number): Promise<SearchResult[]> {
    const key = this.key();
    if (!key) return [];
    const searchLang = language === 'ar' ? 'ar' : language === 'zh' ? 'zh-hans' : 'en';
    const country = language === 'ar' ? 'SA' : language === 'zh' ? 'CN' : 'US';
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&search_lang=${searchLang}&country=${country}&count=${Math.min(limit, 20)}`;
    try {
      const res = await fetch(url, { cache: 'no-store', headers: { 'X-Subscription-Token': key, 'Accept': 'application/json' } });
      if (!res.ok) return [];
      const data = await res.json();
      const webPages = data?.web?.results || [];
      const results: SearchResult[] = [];
      const seen = new Set<string>();
      webPages.forEach((p: any, i: number) => {
        let domain = '';
        try { domain = new URL(p.url).hostname.replace(/^www\./, ''); } catch { domain = ''; }
        if (!domain || seen.has(domain)) return;
        seen.add(domain);
        results.push({ domain, title: p.title || '', snippet: p.description || '', url: p.url, rank: i + 1, source: this.id });
      });
      return results;
    } catch { return []; }
  }
}

export class TavilySearchSource implements SearchSource {
  id = 'tavily-search';
  free = false;
  requiresKey = 'TAVILY_API_KEY';
  supportedLanguages: Language[] = ['ar', 'en', 'zh'];
  deprecated = false;
  private key(): string | null { return (process.env.TAVILY_API_KEY || '').trim() || null; }
  isAvailable(): boolean { return !!this.key(); }
  async collectSuggestions(_query: string, _language: Language): Promise<SuggestionResult[]> { return []; }
  async collectResults(query: string, language: Language, limit: number): Promise<SearchResult[]> {
    const key = this.key();
    if (!key) return [];
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ query, search_depth: 'basic', max_results: Math.min(limit, 10) }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      const results: SearchResult[] = [];
      const seen = new Set<string>();
      (data?.results || []).forEach((p: any, i: number) => {
        let domain = '';
        try { domain = new URL(p.url).hostname.replace(/^www\./, ''); } catch { domain = ''; }
        if (!domain || seen.has(domain)) return;
        seen.add(domain);
        results.push({ domain, title: p.title || '', snippet: p.content || '', url: p.url, rank: i + 1, source: this.id });
      });
      return results;
    } catch { return []; }
  }
}

// Deprecated: Bing Search API retired Aug 11, 2025. Kept for existing key holders only.
export class BingSearchSource implements SearchSource {
  id = 'bing-web-search';
  free = false;
  requiresKey = 'BING_SEARCH_API_KEY';
  deprecated = true;
  supportedLanguages: Language[] = ['ar', 'en', 'zh'];
  private key(): string | null { return (process.env.BING_SEARCH_API_KEY || '').trim() || null; }
  isAvailable(): boolean { return !!this.key(); }
  async collectSuggestions(_query: string, _language: Language): Promise<SuggestionResult[]> { return []; }
  async collectResults(query: string, language: Language, limit: number): Promise<SearchResult[]> {
    const key = this.key();
    if (!key) return [];
    const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${Math.min(limit, 20)}&mkt=${language === 'ar' ? 'ar-SA' : language === 'zh' ? 'zh-CN' : 'en-US'}`;
    try {
      const res = await fetch(url, { cache: 'no-store', headers: { 'Ocp-Apim-Subscription-Key': key } });
      if (!res.ok) return [];
      const data = await res.json();
      const webPages = data?.webPages?.value || [];
      const results: SearchResult[] = [];
      const seen = new Set<string>();
      webPages.forEach((p: any, i: number) => {
        let domain = '';
        try { domain = new URL(p.url).hostname.replace(/^www\./, ''); } catch { domain = ''; }
        if (!domain || seen.has(domain)) return;
        seen.add(domain);
        results.push({ domain, title: p.title || '', snippet: p.snippet || '', url: p.url, rank: i + 1, source: this.id });
      });
      return results;
    } catch { return []; }
  }
}

// Uses the same credential-gated search engine as OpenCode and respects a bounded
// 2-call budget per language. Source evidence is a candidate, not a Google ranking.
export class MultiProviderSearchSource implements SearchSource {
  id = 'multi-provider-search';
  free = false;
  requiresKey = null;
  supportedLanguages: Language[] = ['ar', 'en', 'zh'];
  lastDiagnostic = {http_status: 0, duration_ms: 0, response_received: false,
    results_parsed: 0, blocked_detected: false, failure_reason: ''};
  isAvailable(): boolean {
    const adapter = require('./provider-search.cjs');
    return adapter.configured().length > 0;
  }
  async collectSuggestions(): Promise<SuggestionResult[]> {return [];}
  async collectResults(query: string, language: Language, limit: number): Promise<SearchResult[]> {
    const adapter = require('./provider-search.cjs');
    const started = Date.now();
    const out = await adapter.search({queries:[{query,language}],maxCalls:2,maxResults:Math.min(limit,8)});
    this.lastDiagnostic = {
      http_status: out.results.length ? 200 : 0,
      duration_ms: Date.now()-started, response_received:out.diagnostics.some((d: {http_status:number})=>d.http_status>0),
      results_parsed:out.results.length,blocked_detected:false,
      failure_reason:out.results.length?'':out.diagnostics.map((d: {status:string})=>d.status).join(',')||'no_configured_providers'
    };
    return out.results.map((r: SearchResult, i: number)=>({
      domain:r.domain,url:r.url,title:r.title,snippet:r.snippet,source:r.source,
      // This is an internal display order, not the Google SERP rank.
      rank:i+1
    }));
  }
}

export function defaultSources(): SearchSource[] {
  const sources:SearchSource[]=[new GoogleSuggestSource()];
  const multi=new MultiProviderSearchSource();
  if(multi.isAvailable()) {
    // Use the integrated providers first; do not spend additional calls on
    // a second set of independent providers during the same discovery cycle.
    sources.push(multi);
  } else {
    const brave=new BraveSearchSource();
    const tavily=new TavilySearchSource();
    if(brave.isAvailable())sources.push(brave);
    if(tavily.isAvailable())sources.push(tavily);
    sources.push(new BingRssSearchSource());
    // DuckDuckGo frequently returns HTTP 202/captcha; no default retries.
  }
  return sources;
}

export function availableSources(): { id: string; free: boolean; requiresKey: string | null; available: boolean }[] {
  return defaultSources().map((s) => ({
    id: s.id,
    free: s.free,
    requiresKey: s.requiresKey,
    available: s.requiresKey ? !!(process.env[s.requiresKey] || '').trim() : true,
  }));
}


