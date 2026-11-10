import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { listRuns, startRun, finishRun } from '@/lib/market-intelligence';

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
  const limit = Number(req.nextUrl.searchParams.get('limit') || '20');
  const runs = await listRuns(Number.isFinite(limit) ? limit : 20);
  return NextResponse.json({ runs });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const run = await startRun(body?.run_type || 'full', body?.triggered_by || 'admin');
    return NextResponse.json({ run });
  } catch (e) {
    return NextResponse.json({ status: 'error', message: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const { id, status, summary, error } = body || {};
    if (!id) return NextResponse.json({ status: 'error', message: 'id is required' }, { status: 400 });
    await finishRun(id, status || 'success', summary, error);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ status: 'error', message: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
