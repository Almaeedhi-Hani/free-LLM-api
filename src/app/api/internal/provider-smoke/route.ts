import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

export const dynamic = 'force-dynamic';

// Temporary read-only check. No secrets or response bodies are logged or returned.
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET || '';
  const supplied = request.headers.get('x-smoke-secret') || '';
  const a = Buffer.from(secret), b = Buffer.from(supplied);
  if (!a.length || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }
  const engine = require('../../../../lib/provider-search.cjs');
  const query = 'Saudi Arabia company formation and investor services';
  const output: Array<{ provider: string; status: string; http_status?: number; results?: number }> = [];

  for (const provider of engine.ORDER as string[]) {
    const key = (process.env[engine.KEYS[provider]] || '').trim();
    if (!key) { output.push({ provider, status: 'missing_key' }); continue; }
    try {
      const spec = engine.providerRequest(provider, key, query, 2);
      const response = await fetch(spec.url, {
        method: 'POST', headers: spec.headers,
        body: JSON.stringify(spec.body), cache: 'no-store', signal: AbortSignal.timeout(10000),
      });
      let data: any = null;
      try { data = await response.json(); } catch {}
      const list = provider === 'firecrawl'
        ? (Array.isArray(data?.data) ? data.data : data?.data?.web || [])
        : data?.results || [];
      const valid = engine.safeResults(list, provider, query, 'en');
      output.push({ provider, http_status: response.status, results: valid.length,
        status: response.ok ? (valid.length > 0 ? 'ok' : 'no_results') :
          response.status === 429 ? 'rate_limited' :
          [401, 403].includes(response.status) ? 'authentication_failed' : 'http_error' });
    } catch (e: any) {
      output.push({ provider, status: e?.name === 'TimeoutError' ? 'timeout' : 'network_error' });
    }
  }
  return NextResponse.json({ status: 'complete', environment: 'render', readonly: true, database_writes: 0,
    auto_publications: 0, providers: output, passed: output.filter(x => x.status === 'ok').length });
}
