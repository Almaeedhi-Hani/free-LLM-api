import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const tag = body?.tag;
  const secret = request.headers.get('x-vercel-revalidation-secret') || '';

  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }

  if (tag) {
    revalidateTag(tag);
  }

  return NextResponse.json({
    revalidated: true,
    now: Date.now(),
    tag,
  });
}
