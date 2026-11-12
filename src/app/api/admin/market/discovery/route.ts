import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { runDiscovery, listAvailableSources } from '@/lib/market-intelligence';

export const dynamic = 'force-dynamic';

let running = false;

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
  if (running) {
    return NextResponse.json({ status: 'busy', message: 'Discovery already running' }, { status: 429 });
  }
  running = true;
  try {
    const body = await req.json().catch(() => ({}));
    const maxCompetitors = Math.min(Number(body?.max_competitors) || 10, 20);
    const summary = await runDiscovery({
      maxCompetitors,
      maxSuggestionsPerSeed: 5,
      triggeredBy: 'admin',
    });
    if (!summary.success) {
      return NextResponse.json(
        { ok: false, status: 'failed', summary, message: 'Discovery did not find competitors or encountered errors' },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, status: 'success', summary });
  } catch (e) {
    return NextResponse.json(
      { ok: false, status: 'error', message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  } finally {
    running = false;
  }
}
