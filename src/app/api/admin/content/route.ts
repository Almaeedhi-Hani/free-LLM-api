import { NextRequest, NextResponse } from 'next/server';
import { getContent, setContent } from '@/lib/content-store';
import { StorageConflictError, StorageUnavailableError } from '@/lib/storage-mode';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET || process.env.REVALIDATION_SECRET || '';
  const provided = req.headers.get('x-admin-secret') || req.headers.get('x-vercel-revalidation-secret') || '';
  if (!secret) return false; // deny by default when no secret configured
  return provided === secret;
}

function errorResponse(error: unknown) {
  if (error instanceof StorageConflictError) {
    return NextResponse.json(
      { status: 'conflict', message: 'Content changed concurrently. Reload and retry.' },
      { status: 409 }
    );
  }
  if (error instanceof StorageUnavailableError) {
    return NextResponse.json(
      { status: 'storage_unavailable', message: 'Persistent storage is unavailable.' },
      { status: 503 }
    );
  }
  console.error('admin content error:', error);
  return NextResponse.json({ status: 'error', message: 'Request failed.' }, { status: 500 });
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }
  try {
    const content = await getContent();
    return NextResponse.json(content);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ status: 'error', message: 'Invalid content patch' }, { status: 400 });
    }
    const { expectedUpdatedAt, ...patch } = body as Record<string, unknown>;
    if (expectedUpdatedAt !== undefined && (typeof expectedUpdatedAt !== 'string' || !expectedUpdatedAt)) {
      return NextResponse.json({ status: 'error', message: 'Invalid expectedUpdatedAt' }, { status: 400 });
    }
    // Versioned dashboard requests can replace arrays safely; existing agent/API
    // callers without the revision retain additive merge semantics.
    const isVersioned = typeof expectedUpdatedAt === 'string';
    const updated = await setContent(
      patch as Parameters<typeof setContent>[0],
      isVersioned ? { replaceArrays: true, expectedUpdatedAt: expectedUpdatedAt as string } : {}
    );
    return NextResponse.json({ status: 'updated', content: updated });
  } catch (e) {
    return errorResponse(e);
  }
}
