import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { listGoals, createGoal, updateGoal } from '@/lib/market-intelligence';

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
  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status') as any;
  const priority = searchParams.get('priority') as any;
  const goals = await listGoals({ status, priority });
  return NextResponse.json({ goals });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const goal = await createGoal(body);
    return NextResponse.json({ goal });
  } catch (e) {
    return NextResponse.json({ status: 'error', message: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const { id, ...patch } = body || {};
    if (!id) return NextResponse.json({ status: 'error', message: 'id is required' }, { status: 400 });
    const goal = await updateGoal(id, patch);
    if (!goal) return NextResponse.json({ status: 'not_found' }, { status: 404 });
    return NextResponse.json({ goal });
  } catch (e) {
    return NextResponse.json({ status: 'error', message: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
