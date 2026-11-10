import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { listKeywords, upsertKeyword } from '@/lib/market-intelligence';

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
  const language = searchParams.get('language') as any;
  const intent = searchParams.get('intent') as any;
  const cluster = searchParams.get('cluster') || undefined;
  const keywords = await listKeywords({ language, intent, cluster });
  return NextResponse.json({ keywords });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const keyword = await upsertKeyword(body);
    return NextResponse.json({ keyword });
  } catch (e) {
    return NextResponse.json({ status: 'error', message: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
