import { NextRequest, NextResponse } from 'next/server';
import { runUnifiedOrchestrator } from '@/lib/geo-agent-orchestrator';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }
  const result = await runUnifiedOrchestrator({ triggeredBy: 'cron-unified' });
  return NextResponse.json(result);
}
