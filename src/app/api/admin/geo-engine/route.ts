import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';
const repo = 'Almaeedhi-Hani/free-LLM-api';
const workflow = 'geo-analysis.yml';
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
    const response = await github('/actions/workflows/' + workflow + '/runs?per_page=5');
    if (!response.ok) return NextResponse.json({ configured: true, message: 'GitHub status unavailable' }, { status: 502 });
    const data = await response.json();
    return NextResponse.json({ configured: true, runs: (data.workflow_runs || []).map((run: any) => ({
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
