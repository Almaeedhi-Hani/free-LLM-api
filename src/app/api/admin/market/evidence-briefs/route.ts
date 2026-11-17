import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { listCompetitors, listObservations } from '@/lib/market-intelligence';
import { buildCompetitorPageEvidenceBriefs } from '@/lib/competitor-page-evidence';

export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  const provided = (req.headers.get('x-admin-secret') || '').trim();
  if (!provided) return false;
  const candidates = [process.env.ADMIN_SECRET, process.env.CRON_SECRET, process.env.REVALIDATION_SECRET]
    .map(v => (v || '').trim()).filter(Boolean);
  const b = Buffer.from(provided);
  return candidates.some(expected => {
    const a = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

/** Bounded, authenticated, read-only evidence snapshots for explicit editorial review. */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  try {
    const competitors = (await listCompetitors({})).slice(0, 50);
    const batches = await Promise.all(competitors.map(c => listObservations(c.id, 20)));
    const briefs = buildCompetitorPageEvidenceBriefs(batches.flat(), 100);
    return NextResponse.json({ briefs, source: 'recorded_competitor_observations', sampled_competitors: competitors.length });
  } catch {
    return NextResponse.json({ status: 'error', message: 'Evidence could not be loaded' }, { status: 500 });
  }
}
