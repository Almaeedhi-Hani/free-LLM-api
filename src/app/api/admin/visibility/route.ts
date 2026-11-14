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
  if(type === 'queries') {
    const clientId=process.env.GSC_CLIENT_ID,clientSecret=process.env.GSC_CLIENT_SECRET,refreshToken=process.env.GSC_REFRESH_TOKEN;
    const property=process.env.GSC_PROPERTY_URL || 'https://free-llm-api-1-didl.onrender.com/';
    if(!clientId||!clientSecret||!refreshToken) return NextResponse.json({connected:false,source:'google_search_console',message:'يلزم إعداد GSC_CLIENT_ID وGSC_CLIENT_SECRET وGSC_REFRESH_TOKEN في بيئة الخادم.',rows:[]});
    try {
      const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:'refresh_token'}),cache:'no-store'});
      if(!tokenResponse.ok) return NextResponse.json({connected:false,source:'google_search_console',message:'فشل تجديد تفويض Google. تحقق من الصلاحيات والاعتماد.',rows:[]},{status:502});
      const token=await tokenResponse.json() as {access_token?:string};
      if(!token.access_token) throw new Error('Missing access token');
      const end=new Date();end.setUTCDate(end.getUTCDate()-3);
      const start=new Date(end);start.setUTCDate(start.getUTCDate()-27);
      const date=(d:Date)=>d.toISOString().slice(0,10);
      const dataResponse=await fetch('https://www.googleapis.com/webmasters/v3/sites/'+encodeURIComponent(property)+'/searchAnalytics/query',{method:'POST',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},body:JSON.stringify({startDate:date(start),endDate:date(end),dimensions:['query'],rowLimit:100}),cache:'no-store'});
      if(!dataResponse.ok) return NextResponse.json({connected:false,source:'google_search_console',message:'رفضت Google طلب البيانات؛ تحقق من عنوان Property وصلاحيات الحساب.',rows:[]},{status:502});
      const data=await dataResponse.json() as {rows?:Array<{keys:string[];clicks:number;impressions:number;ctr:number;position:number}>};
      return NextResponse.json({connected:true,source:'google_search_console',property,startDate:date(start),endDate:date(end),rows:(data.rows||[]).map(r=>({query:r.keys[0],clicks:r.clicks,impressions:r.impressions,ctr:r.ctr,position:r.position}))});
    } catch {
      return NextResponse.json({connected:false,source:'google_search_console',message:'تعذر الاتصال بخدمة Google Search Console.',rows:[]},{status:502});
    }
  }
  if(type === 'ai') return NextResponse.json({connected:false,source:'ai_visibility',message:'لا يوجد مصدر محفوظ وموثق للاختبارات بعد.',rows:[]});
  if(type === 'conversions') return NextResponse.json({connected:false,source:'conversion_events',message:'لم يتم تفعيل تسجيل أحداث التحويل بعد.',rows:[]});
  return NextResponse.json({error:'unsupported_type'},{status:400});
}
