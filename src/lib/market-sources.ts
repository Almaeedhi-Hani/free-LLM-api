import type { Language } from './market-intelligence';

export interface SuggestionResult {
  term: string;
  source: string;
}

export interface SearchResult {
  domain: string;
  title: string;
  snippet: string;
  url: string;
  rank: number;
  source: string;
}

export interface SearchSource {
  id: string;
  free: boolean;
  requiresKey: string | null;
  supportedLanguages: Language[];
  collectSuggestions(query: string, language: Language): Promise<SuggestionResult[]>;
  collectResults?(query: string, language: Language, limit: number): Promise<SearchResult[]>;
}

function safeJson(text: string): any {
  try { return JSON.parse(text); } catch { return null; }
}

// Google Suggest (free, no key). Unofficial endpoint; light use only.
export class GoogleSuggestSource implements SearchSource {
  id = 'google-suggest';
  free = true;
  requiresKey = null;
  supportedLanguages: Language[] = ['ar', 'en', 'zh'];

  async collectSuggestions(query: string, language: Language): Promise<SuggestionResult[]> {
    const hl = language === 'zh' ? 'zh-CN' : language === 'ar' ? 'ar' : 'en';
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}&hl=${hl}`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return [];
      const data = await res.json();
      const terms: string[] = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
      return terms.map((t) => ({ term: String(t), source: this.id }));
    } catch {
      return [];
    }
  }
}

// DuckDuckGo autocomplete (free, no key).
export class DuckDuckGoSuggestSource implements SearchSource {
  id = 'duckduckgo-suggest';
  free = true;
  requiresKey = null;
  supportedLanguages: Language[] = ['ar', 'en', 'zh'];

  async collectSuggestions(query: string, language: Language): Promise<SuggestionResult[]> {
    const kl = language === 'ar' ? 'xa-ar' : language === 'zh' ? 'cn-zh' : 'us-en';
    const url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&kl=${kl}`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((d: any) => ({ term: String(d.phrase || d), source: this.id }));
    } catch {
      return [];
    }
  }
}

// Bing Web Search (key-gated; free tier available but requires approval/key).
export class BingSearchSource implements SearchSource {
  id = 'bing-web-search';
  free = false;
  requiresKey = 'BING_SEARCH_API_KEY';
  supportedLanguages: Language[] = ['ar', 'en', 'zh'];

  private key(): string | null {
    return (process.env.BING_SEARCH_API_KEY || '').trim() || null;
  }

  isAvailable(): boolean {
    return !!this.key();
  }

  async collectSuggestions(_query: string, _language: Language): Promise<SuggestionResult[]> {
    return [];
  }

  async collectResults(query: string, language: Language, limit: number): Promise<SearchResult[]> {
    const key = this.key();
    if (!key) return [];
    const mkt = language === 'ar' ? 'ar-SA' : language === 'zh' ? 'zh-CN' : 'en-US';
    const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&mkt=${mkt}&count=${limit}`;
    try {
      const res = await fetch(url, {
        cache: 'no-store',
        headers: { 'Ocp-Apim-Subscription-Key': key },
      });
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
        results.push({
          domain,
          title: p.name || '',
          snippet: p.snippet || '',
          url: p.url,
          rank: i + 1,
          source: this.id,
        });
      });
      return results;
    } catch {
      return [];
    }
  }
}

export function defaultSources(): SearchSource[] {
  const sources: SearchSource[] = [new GoogleSuggestSource(), new DuckDuckGoSuggestSource()];
  const bing = new BingSearchSource();
  if (bing.isAvailable()) sources.push(bing);
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
