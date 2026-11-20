import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getContent } from '@/lib/content-store';
import { getSupabaseCredentials } from '@/lib/storage-mode';

export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  const expected = Buffer.from((process.env.GEO_API_KEY || '').trim());
  const supplied = Buffer.from((req.headers.get('x-geo-api-key') || '').trim());
  return expected.length > 0 && expected.length === supplied.length &&
    timingSafeEqual(expected, supplied);
}

type LastRow = Record<string, unknown>;
async function latestRow(table: string, columns: string, filters: Record<string,string> = {}): Promise<LastRow | null> {
  const credentials = getSupabaseCredentials();
  if (!credentials) throw new Error('Storage unavailable');
  // Strict static table/column allowlist: no user-controlled SQL or arbitrary REST requests.
  const allowed: Record<string,string> = {
    analysis_runs: 'finished_at,status,run_type',
    gsc_sync_day_outcomes: 'checked_at,metric_date,status,rows_fetched',
    audit_logs: 'created_at,action',
  };
  if (allowed[table] !== columns) throw new Error('Unsupported audit query');
  const url = new URL(credentials.url + '/rest/v1/' + table);
  url.searchParams.set('select', columns);
  url.searchParams.set('limit', '1');
  url.searchParams.set('order', (table === 'analysis_runs' ? 'finished_at' :
    table === 'gsc_sync_day_outcomes' ? 'checked_at' : 'created_at') + '.desc');
  for (const [key,value] of Object.entries(filters)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: { apikey: credentials.key, Authorization: 'Bearer ' + credentials.key },
    cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('read_only_aggregate_failed_' + table);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('invalid_aggregate_' + table);
  return rows[0] || null;
}
function asTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}
/**
 * Authenticated, read-only, aggregate-only storage truth for the GitHub watchdog.
 * No client identifiers, document text, SEO queries, secrets or full Supabase rows.
 * W05/W06 intentionally do not persist database records on no_change.
 */
export async function GET(req: NextRequest) {
  if (!authorized(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const [content, radar, gsc, publication] = await Promise.all([
      getContent(),
      latestRow('analysis_runs','finished_at,status,run_type',{run_type:'eq.radar'}),
      latestRow('gsc_sync_day_outcomes','checked_at,metric_date,status,rows_fetched'),
      latestRow('audit_logs','created_at,action',{'metadata->>source_workflow':'eq.W03'}),
    ]);
    return NextResponse.json({
      source: 'supabase', observed_at: new Date().toISOString(),
      persistence: {
        W01: { at: asTimestamp(content.agent?.lastRun), status: content.agent?.status || 'unknown',
          evidence: 'persisted_agent_run' },
        W02: { at: asTimestamp(radar?.finished_at),
          status: radar?.status === 'success' ? 'success' : 'unknown',
          evidence: 'analysis_runs_radar' },
        W03: { at: asTimestamp(publication?.created_at),
          status: publication ? 'observed' : 'unknown', evidence: 'audit_logs_w03' },
        W04: { at: asTimestamp(gsc?.checked_at),
          status: typeof gsc?.status === 'string' ? gsc.status : 'unknown',
          evidence: 'gsc_sync_day_outcomes' },
        W05: { at: null, status: 'not_applicable', evidence: 'git_index_or_no_change' },
        W06: { at: null, status: 'not_applicable', evidence: 'git_maintenance_or_no_change' },
      },
      gsc: { latest_metric_date: typeof gsc?.metric_date === 'string' ? gsc.metric_date : null,
        latest_outcome: typeof gsc?.status === 'string' ? gsc.status : 'unknown',
        rows_fetched: typeof gsc?.rows_fetched === 'number' ? gsc.rows_fetched : null },
    }, { headers: { 'Cache-Control':'no-store' }});
  } catch {
    return NextResponse.json({ error: 'Read-only persistence evidence unavailable' }, { status: 503 });
  }
}
