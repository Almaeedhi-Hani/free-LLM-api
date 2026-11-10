import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { runRadar, listAvailableSources } from '@/lib/market-intelligence';

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
  const body = await req.json().catch(() => ({}));
  const triggeredBy = (body?.triggered_by as 'manual' | 'cron' | 'github_actions' | 'admin') || 'admin';
  try {
    const { run_id, discovery, analysis } = await runRadar({ triggeredBy });
    return NextResponse.json({ ok: true, run_id, discovery, analysis });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
