import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { runDiscovery, listAvailableSources, startRun, finishRun, listRuns } from '@/lib/market-intelligence';

export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  const provided = (req.headers.get('x-admin-secret') || '').trim();
  if (!provided) return false;
  const candidates = [process.env.ADMIN_SECRET, process.env.CRON_SECRET, process.env.REVALIDATION_SECRET]
    .map((v) => (v || '').trim())
    .filter(Boolean);
  const b = Buffer.from(provided);
  return candidates.some((expected) => {
    const a = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ sources: listAvailableSources() });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  // DB-based lock (works across Render instances)
  try {
    const recentRuns = await listRuns(5);
    const isRunning = recentRuns.some((r: any) => r.run_type === 'radar' && r.status === 'running' && r.triggered_by === 'admin');
    if (isRunning) {
      return NextResponse.json({ status: 'busy', message: 'Discovery already running' }, { status: 429 });
    }
  } catch { /* ignore lock check errors */ }

  let runId: string | null = null;
  try {
    const run = await startRun('radar', 'admin');
    runId = run.id;
    const body = await req.json().catch(() => ({}));
    const maxCompetitors = Math.min(Number(body?.max_competitors) || 10, 20);
    const summary = await runDiscovery({
      maxCompetitors,
      maxSuggestionsPerSeed: 5,
      triggeredBy: 'admin',
    });
    const hasErrors = (summary.errors?.length || 0) > 0;
    const isPartial = summary.success && hasErrors;
    if (!summary.success) {
      if (runId) await finishRun(runId, 'failed', summary as any, 'Discovery did not find competitors or encountered errors');
      return NextResponse.json(
        { ok: false, status: 'failed', summary, message: 'Discovery did not find competitors or encountered errors' },
        { status: 500 }
      );
    }
    const finalStatus = isPartial ? 'partial' : 'success';
    if (runId) await finishRun(runId, finalStatus, summary as any);
    return NextResponse.json({ ok: true, status: finalStatus, summary, hasErrors });
  } catch (e) {
    if (runId) await finishRun(runId, 'failed', undefined, e instanceof Error ? e.message : String(e));
    return NextResponse.json(
      { ok: false, status: 'error', message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}



