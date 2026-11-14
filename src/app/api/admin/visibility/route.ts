import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';
const BASE = (process.env.SITE_URL || 'https://free-llm-api-1-didl.onrender.com').replace(/\/$/, '');
const SLUGS = ['misa-license','company-formation','corporate-banking','contract-drafting','premium-residency','investment-funds'];
const LANGS = ['ar','en','zh'] as const;
const paths = ['/',...SLUGS.map(s=>`/services/${s}`)];
function auth(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET || '';
  const provided = req.headers.get('x-admin-secret') || '';
  const a = Buffer.from(secret), b = Buffer.from(provided);
  return !!secret && a.length === b.length && timingSafeEqual(a,b);
}
function urls() {
  return paths.flatMap(p => LANGS.map(language => ({
    language, url: BASE + (language === 'ar' ? p : `/${language}${p === '/' ? '' : p}`)
  })));
}
async function inspect(item: {url:string;language:string}) {
  const checked_at = new Date().toISOString();
  try {
    // Fixed allowlist: no user-provided URL is fetched.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    let response: Response;
    try {
      response = await fetch(item.url, {
        redirect:'manual', signal:controller.signal, cache:'no-store',
        headers:{'user-agent':'GEO-Intelligence-SEO-Audit/1.0'}
      });
    } finally { clearTimeout(timeout); }
    const html = await response.text();
    const canonical = html.match(/<link\b(?=[^>]*rel=["']canonical["'])(?=[^>]*href=["']([^"']+)["'])[^>]*>/i)?.[1] || null;
    const hreflang = Array.from(html.matchAll(/<link\b(?=[^>]*rel=["']alternate["'])(?=[^>]*hreflang=["']([^"']+)["'])(?=[^>]*href=["']([^"']+)["'])[^>]*>/gi)).map(m => ({lang:m[1],url:m[2]}));
    const robots = html.match(/<meta\b(?=[^>]*name=["']robots["'])(?=[^>]*content=["']([^"']+)["'])[^>]*>/i)?.[1] || null;
    const errors:string[] = [];
    if(response.status !== 200) errors.push(`HTTP ${response.status}`);
    if(!canonical) errors.push('Canonical غير موجود');
    else if(canonical !== item.url) errors.push('Canonical لا يطابق الرابط');
    for(const lang of ['ar','en','zh-Hans']) if(!hreflang.some(h=>h.lang===lang)) errors.push(`Hreflang ${lang} مفقود`);
    if(robots && /noindex/i.test(robots)) errors.push('noindex');
    return {...item,checked_at,http_status:response.status,canonical,hreflang,robots,errors,status:errors.length?'issue':'ok'};
  } catch(e) {
    return {...item,checked_at,http_status:null,canonical:null,hreflang:[],robots:null,errors:[e instanceof Error?e.message:'فشل الاتصال'],status:'unverified'};
  }
}
export async function GET(req:NextRequest) {
  if(!auth(req)) return NextResponse.json({error:'unauthorized'},{status:401});
  const type = req.nextUrl.searchParams.get('type');
  if(type === 'pages') {
    const results = await Promise.all(urls().map(inspect));
    return NextResponse.json({source:'live_http',checked_at:new Date().toISOString(),results});
  }
  if(type === 'queries') return NextResponse.json({connected:false,source:'google_search_console',message:'لم يتم إثبات اتصال Search Console؛ لا توجد أرقام موثقة.',rows:[]});
  if(type === 'ai') return NextResponse.json({connected:false,source:'ai_visibility',message:'لا يوجد مصدر محفوظ وموثق للاختبارات بعد.',rows:[]});
  if(type === 'conversions') return NextResponse.json({connected:false,source:'conversion_events',message:'لم يتم تفعيل تسجيل أحداث التحويل بعد.',rows:[]});
  return NextResponse.json({error:'unsupported_type'},{status:400});
}
