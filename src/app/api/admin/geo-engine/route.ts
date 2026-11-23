import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getContent } from '@/lib/content-store';

export const dynamic = 'force-dynamic';
const repo = 'Almaeedhi-Hani/free-LLM-api';
const workflow = 'geo-analysis.yml';
const unifiedWorkflow = 'v3-production-orchestrator.yml';
const llmWorkflow = 'llm-feed-optimization.yml';
function authorized(req: NextRequest) {
  const supplied = Buffer.from((req.headers.get('x-admin-secret') || '').trim());
  const expected = (process.env.ADMIN_SECRET || '').trim();
  const secret = Buffer.from(expected);
  return !!expected && supplied.length === secret.length && timingSafeEqual(supplied, secret);
}
function githubToken() { return (process.env.GEO_GITHUB_TOKEN || '').trim(); }
async function github(path: string, init: RequestInit = {}) {
  return fetch('https://api.github.com/repos/' + repo + path, {
    ...init, cache: 'no-store',
    headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + githubToken(), 'X-GitHub-Api-Version': '2022-11-28', ...init.headers },
    signal: AbortSignal.timeout(12000),
  });
}
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  if (!githubToken()) return NextResponse.json({ configured: false, message: 'GEO_GITHUB_TOKEN is not configured' });
  try {
    const [response, detailsResponse, indexResponse] = await Promise.all([
      github('/actions/workflows/' + unifiedWorkflow + '/runs?per_page=5'),
      github('/actions/workflows/' + unifiedWorkflow),
      github('/actions/workflows/' + llmWorkflow + '/runs?per_page=3'),
    ]);
    if (!response.ok) return NextResponse.json({ configured: true, message: 'GitHub status unavailable' }, { status: 502 });
    const data = await response.json();
    const details = detailsResponse.ok ? await detailsResponse.json() : null;
    const state = typeof details?.state === 'string' ? details.state : 'unknown';
    const indexStatus = indexResponse.ok ? await indexResponse.json() : null;
    // The single automated schedule is an isolated 5-minute test loop; GEO's
    // direct full pipeline remains a separate explicit manual dispatch.
    // The authenticated dashboard gets persisted locale statuses without
    // parsing model logs, disclosing any LLM prompts or exposing credentials.
    const stored=await getContent().catch(()=>null);
    const lastResult=stored?.agent?.lastResult||'';
    const localeChunk=lastResult.match(/(?:^|\s\|\s)locales=([^|]+)/)?.[1]||'';
    const fields=Object.fromEntries(localeChunk.split(',').map(value=>value.split(':'))
      .filter(pair=>pair.length===2&&['ar','en','zh'].includes(pair[0])));
    const allowed=new Set(['analyzed','model_unavailable','missing_evidence','not_run']);
    const languages=Object.fromEntries(['ar','en','zh'].map(lang=>
      [lang,allowed.has(fields[lang])?fields[lang]:'not_run']));
    return NextResponse.json({ configured: true,
      schedule: { cadence: 'every_10_minutes_production',
        cron_utc: '7-57/10 * * * *',
        saudi_time: 'كل 10 دقائق',
        transitionSaudi: '2026-11-23T00:00:00+03:00',
        time_zone: 'Asia/Riyadh',
        state, active: state === 'unknown' ? null : state === 'active' },
      llmIndex: { available: Boolean(indexStatus),
        url: '/llms.txt',
        runs: (indexStatus?.workflow_runs || []).slice(0,3).map((run:any)=>({
          id:run.id,status:run.status,conclusion:run.conclusion,html_url:run.html_url
        })) },
      lastAnalysis: { lastRun: stored?.agent?.lastRun||null,
        status: stored?.agent?.status||'unknown', languages,
        available: Boolean(localeChunk) },
      runs: (data.workflow_runs || []).map((run: any) => ({
      id: run.id, status: run.status, conclusion: run.conclusion, created_at: run.created_at, html_url: run.html_url
    })) });
  } catch { return NextResponse.json({ message: 'GitHub connection unavailable' }, { status: 502 }); }
}
export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  if (!githubToken()) return NextResponse.json({ message: 'GEO_GITHUB_TOKEN is not configured' }, { status: 503 });
  try {
    const runsResponse = await github('/actions/workflows/' + workflow + '/runs?per_page=20');
    if (!runsResponse.ok) return NextResponse.json({ message: 'Cannot verify active runs' }, { status: 503 });
    const data = await runsResponse.json();
    if ((data.workflow_runs || []).some((run: any) => ['queued','in_progress','waiting','pending','requested'].includes(run.status)))
      return NextResponse.json({ message: 'GEO workflow is already active' }, { status: 409 });
    const response = await github('/actions/workflows/' + workflow + '/dispatches', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: 'main' })
    });
    if (response.status !== 204) return NextResponse.json({ message: 'GitHub rejected dispatch' }, { status: 502 });
    return NextResponse.json({ accepted: true, message: 'Workflow dispatch accepted; execution not yet confirmed' }, { status: 202 });
  } catch { return NextResponse.json({ message: 'GitHub connection unavailable' }, { status: 502 }); }
}
