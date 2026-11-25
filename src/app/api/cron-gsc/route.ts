import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import {runGscSync} from '@/lib/gsc/sync-service';

export const dynamic = 'force-dynamic';
function authorized(req: NextRequest) {
 const expected = process.env.CRON_SECRET || '';
 const given = (req.headers.get('authorization') || '').replace(/^Bearer /i, '');
 const a = Buffer.from(expected), b = Buffer.from(given);
 return !!expected && a.length === b.length && timingSafeEqual(a, b);
}
export async function GET(req: NextRequest) {
 if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
 return runGscSync();
}
