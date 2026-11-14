import { NextResponse } from 'next/server';
import { getContent } from '@/lib/content-store';
import { resolveStorageMode } from '@/lib/storage-mode';

export const dynamic = 'force-dynamic';

// Temporary one-shot diagnostic; removed after validation. Only aggregate HTTP
// status and counts are logged. Never log secret keys or response bodies.
let providerSmokeStarted = false;
async function probeRenderProviders() {
  const adapter = require('../../../../lib/provider-search.cjs');
  const outcomes: Array<{provider:string;status:string;http?:number;links?:number}> = [];
  for (const provider of adapter.ORDER as string[]) {
    const key = String(process.env[adapter.KEYS[provider]] || '').trim();
    if (!key) { outcomes.push({provider,status:'missing_key'}); continue; }
    try {
      const spec = adapter.providerRequest(provider,key,'Saudi Arabia investor company formation',2);
      const res = await fetch(spec.url,{method:'POST',headers:spec.headers,body:JSON.stringify(spec.body),signal:AbortSignal.timeout(8500),cache:'no-store'});
      let payload:any = {};
      try { payload=await res.json(); } catch {}
      const raw = provider==='firecrawl'?(Array.isArray(payload?.data)?payload.data:payload?.data?.web||[]):payload?.results||[];
      const hits=adapter.safeResults(raw,provider,'test','en').length;
      outcomes.push({provider,http:res.status,links:hits,status:res.ok?(hits?'ok':'no_links'):(res.status===429?'rate_limited':res.status===401||res.status===403?'auth_error':'http_error')});
    } catch (e:any) { outcomes.push({provider,status:e?.name==='TimeoutError'?'timeout':'network_error'}); }
  }
  console.info('RENDER_PROVIDER_SMOKE_RESULT',JSON.stringify({providers:outcomes,passed:outcomes.filter(x=>x.status==='ok').length,readonly:true}));
}


export async function GET() {
  if (!providerSmokeStarted) {
    providerSmokeStarted = true;
    void probeRenderProviders().catch(() => console.info('RENDER_PROVIDER_SMOKE_RESULT',JSON.stringify({status:'test_error'})));
  }
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
