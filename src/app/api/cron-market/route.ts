import { NextRequest, NextResponse } from 'next/server';
import { runRadar } from '@/lib/market-intelligence';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }
  try {
    const { run_id, discovery, analysis } = await runRadar({ triggeredBy: 'cron' });
    return NextResponse.json({ status: 'completed', run_id, discovery, analysis });
  } catch (e) {
    return NextResponse.json({ status: 'error', message: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
