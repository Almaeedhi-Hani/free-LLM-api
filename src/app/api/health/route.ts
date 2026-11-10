import { NextResponse } from 'next/server';
import { getContent } from '@/lib/content-store';
import { resolveStorageMode } from '@/lib/storage-mode';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const storage = resolveStorageMode();
    const content = await getContent();
    return NextResponse.json({
      status: 'ok',
      storage,
      supabaseConfigured: storage === 'supabase',
      updatedAt: content.updatedAt,
      faqCount: content.faqs.length,
      draftCount: content.drafts.length,
    });
  } catch (e) {
    console.error('health storage error:', e);
    return NextResponse.json(
      {
        status: 'error',
        storage: 'unavailable',
        message: 'storage unavailable',
      },
      { status: 503 }
    );
  }
}
