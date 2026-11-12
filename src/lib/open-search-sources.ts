import type { Language } from './market-intelligence';

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
  deprecated?: boolean;
  collectSuggestions(query: string, language: Language): Promise<{ term: string; language: Language; source: string }[]>;
  collectResults(query: string, language: Language, limit: number): Promise<SearchResult[]>;
}

const IRRELEVANT_DOMAINS = new Set([
  'finance.yahoo.com', 'investing.com', 'cnbc.com', 'bloomberg.com', 'reuters.com',
  'linkedin.com', 'instagram.com', 'youtube.com', 'wikipedia.org', 'facebook.com',
  'twitter.com', 'x.com', 'crunchbase.com', 'pitchbook.com', 'owler.com', 'similarweb.com',
  'rulebook.sama.gov.sa', 'sab.com', 'gov.sa',
]);

function isIrrelevant(domain: string): boolean {
  const d = domain.toLowerCase();
  return IRRELEVANT_DOMAINS.has(d) || Array.from(IRRELEVANT_DOMAINS).some((id) => d.endsWith('.' + id) || d === id);
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function postHtml(url: string, body: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function unwrapDuckDuckGoUrl(url: string): string {
  if (url.includes('uddg=')) {
    try {
      return decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
    } catch {
      return url;
    }
  }
  return url;
}

function parseDuckDuckGoHtml(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  const linkRegex = /class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
  const snippetRegex = /class="result__snippet"[^>]*>([^<]*)</g;

  const urls = Array.from(html.matchAll(linkRegex), (m) => m[1]);
  const titles = Array.from(html.matchAll(linkRegex), (m) => m[2]);
  const snippets = Array.from(html.matchAll(snippetRegex), (m) => m[1]);

  const count = Math.min(urls.length, titles.length, snippets.length);
  for (let i = 0; i < count; i++) {
    const realUrl = unwrapDuckDuckGoUrl(urls[i]);
    const domain = extractDomain(realUrl);
    if (!domain || seen.has(domain) || isIrrelevant(domain)) continue;
    seen.add(domain);
    results.push({
      domain,
      title: (titles[i] || '').trim(),
      snippet: (snippets[i] || '').trim(),
      url: realUrl,
      rank: results.length + 1,
      source: 'duckduckgo-html',
    });
  }
  return results;
}

export class DuckDuckGoHtmlSource implements SearchSource {
  id = 'duckduckgo-html';
  free = true;
  requiresKey = null;
  supportedLanguages: Language[] = ['ar', 'en', 'zh'];
  deprecated = false;

  async collectSuggestions(): Promise<{ term: string; language: Language; source: string }[]> {
    return [];
  }

  async collectResults(query: string, language: Language, limit: number): Promise<SearchResult[]> {
    const langParam = language === 'ar' ? 'ar' : language === 'zh' ? 'zh' : 'en';
    const body = `q=${encodeURIComponent(query)}&kl=${langParam}`;
    const html = await postHtml('https://html.duckduckgo.com/html/', body);
    if (!html) return [];
    return parseDuckDuckGoHtml(html).slice(0, limit);
  }
}

// Startpage: blocked by bot verification (HTTP 303 → /user/verify) and robots.txt Disallow: /sp/
// Marked deprecated. Not used.
export class StartpageSource implements SearchSource {
  id = 'startpage';
  free = true;
  requiresKey = null;
  supportedLanguages: Language[] = ['ar', 'en', 'zh'];
  deprecated = true;

  async collectSuggestions(): Promise<{ term: string; language: Language; source: string }[]> {
    return [];
  }

  async collectResults(): Promise<SearchResult[]> {
    return [];
  }
}

// Searx: public instances blocked by captcha/antibot or unavailable. Marked deprecated.
export class SearxSource implements SearchSource {
  id = 'searx';
  free = true;
  requiresKey = null;
  supportedLanguages: Language[] = ['ar', 'en', 'zh'];
  deprecated = true;

  async collectSuggestions(): Promise<{ term: string; language: Language; source: string }[]> {
    return [];
  }

  async collectResults(): Promise<SearchResult[]> {
    return [];
  }
}

// Public directories: official sites redirect/unreachable. Marked deprecated.
export class PublicDirectorySource implements SearchSource {
  id = 'public-directories';
  free = true;
  requiresKey = null;
  supportedLanguages: Language[] = ['ar', 'en'];
  deprecated = true;

  async collectSuggestions(): Promise<{ term: string; language: Language; source: string }[]> {
    return [];
  }

  async collectResults(): Promise<SearchResult[]> {
    return [];
  }
}

export function openSearchSources(): SearchSource[] {
  return [
    new DuckDuckGoHtmlSource(),
  ];
}

