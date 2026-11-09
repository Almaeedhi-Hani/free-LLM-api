import { NextRequest, NextResponse } from 'next/server';
import { getContent, setContent } from '@/lib/content-store';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET || process.env.REVALIDATION_SECRET || '';
  const provided = req.headers.get('x-admin-secret') || req.headers.get('x-vercel-revalidation-secret') || '';
  if (!secret) return true; // allow in dev if no secret set
  return provided === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json(getContent());
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const updated = setContent(body);
  return NextResponse.json({ status: 'updated', content: updated });
}
