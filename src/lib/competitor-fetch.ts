// ToS-safe competitor page analysis: fetch only <title> + meta description.
// Respects robots.txt. No body content stored.

import { FLAGS, BUDGET } from './feature-flags';

export interface FetchedPageMeta {
  url: string;
  title: string | null;
  description: string | null;
  fetched_at: string;
  allowed: boolean;
  error?: string;
}

async function robotsAllowed(url: string): Promise<boolean> {
  try {
    const u = new URL(url);
    const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;
    const res = await fetch(robotsUrl, { cache: 'no-store' });
    if (!res.ok) return true; // no robots.txt â†’ allow
    const text = await res.text();
    // Simple check: if "Disallow: /" present for User-agent: *, block
    const lines = text.split('\n').map((l) => l.trim());
    let inStar = false;
    for (const line of lines) {
      if (/^User-agent:\s*\*/i.test(line)) { inStar = true; continue; }
      if (/^User-agent:/i.test(line)) { inStar = false; continue; }
      if (inStar && /^Disallow:\s*\/\s*$/i.test(line)) return false;
    }
    return true;
  } catch {
    return true;
  }
}

export async function fetchPageMeta(url: string): Promise<FetchedPageMeta> {
  const result: FetchedPageMeta = {
    url,
    title: null,
    description: null,
    fetched_at: new Date().toISOString(),
    allowed: false,
  };
  if (!FLAGS.ENABLE_COMPETITOR_FETCH) {
    result.error = 'ENABLE_COMPETITOR_FETCH is false';
    return result;
  }
  const allowed = await robotsAllowed(url);
  result.allowed = allowed;
  if (!allowed) {
    result.error = 'disallowed by robots.txt';
    return result;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timeout);
    if (!res.ok) { result.error = `HTTP ${res.status}`; return result; }
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    result.title = titleMatch ? titleMatch[1].trim().slice(0, 200) : null;
    result.description = descMatch ? descMatch[1].trim().slice(0, 300) : null;
    return result;
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
    return result;
  }
}

export async function fetchPagesMeta(urls: string[]): Promise<FetchedPageMeta[]> {
  const out: FetchedPageMeta[] = [];
  const limit = Math.min(urls.length, BUDGET.maxCompetitorFetches);
  for (let i = 0; i < limit; i++) {
    out.push(await fetchPageMeta(urls[i]));
    await new Promise((r) => setTimeout(r, 1000)); // 1 req/sec
  }
  return out;
}
