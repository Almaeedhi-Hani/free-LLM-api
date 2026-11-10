import { NextResponse } from 'next/server';
import { getContent } from '@/lib/content-store';

export async function GET() {
  const supabaseConfigured = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const content = await getContent();
    return NextResponse.json({
      status: 'ok',
      storage: supabaseConfigured ? 'supabase' : 'file',
      supabaseConfigured,
      updatedAt: content.updatedAt,
      faqCount: content.faqs.length,
      draftCount: content.drafts.length,
    });
  } catch (e) {
    return NextResponse.json({ status: 'error', message: String(e) }, { status: 500 });
  }
}
