import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { compareConsecutiveGscDays } from '@/lib/gsc-daily-comparison';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
 const expected = process.env.ADMIN_SECRET || '';
 const given = req.headers.get('x-admin-secret') || '';
 const a = Buffer.from(expected), b = Buffer.from(given);
 if (!expected || a.length !== b.length || !timingSafeEqual(a,b)) return NextResponse.json({error:'unauthorized'},{status:401});
 const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
 if (!url || !key) return NextResponse.json({error:'storage_not_configured'},{status:503});
 const property = process.env.GSC_PROPERTY_URL || 'https://free-llm-api-1-didl.onrender.com/';
 const endpoint = url.replace(/\/$/,'') + '/rest/v1/gsc_daily_metrics?select=metric_date,clicks,impressions,ctr,position,captured_at&dimension=eq.total&property=eq.' + encodeURIComponent(property) + '&order=metric_date.desc&limit=90';
 try {
  const response = await fetch(endpoint,{headers:{apikey:key,authorization:'Bearer '+key},cache:'no-store'});
  if (!response.ok) throw new Error('storage_' + response.status);
  const rows = await response.json() as Array<{metric_date:string;clicks:number;impressions:number;ctr:number;position:number;captured_at:string}>;
  if (!Array.isArray(rows)) throw new Error('Invalid GSC history response');
  const latest = rows[0] || null;
  const {change,alerts,comparison}=compareConsecutiveGscDays(rows);
  const message=!rows.length
    ?'لا توجد لقطات محفوظة بعد. يتطلب الجمع الدوري رمز تحديث Google على الخادم.'
    :comparison==='nonconsecutive_dates'
      ?'آخر لقطتين ليستا ليومين متتاليين؛ تم تعليق مقارنة التغير والتنبيهات حتى تتوفر بيانات متصلة.'
      :comparison==='invalid_metrics'
        ?'قيم القياس غير صالحة للمقارنة؛ لا توجد تنبيهات موثوقة.'
        :'';
  return NextResponse.json({source:'supabase_gsc_daily',property,rows,change,alerts,comparison,last_sync:latest?.captured_at||null,message});
 } catch(e) {return NextResponse.json({error:e instanceof Error?e.message:'storage_error'},{status:502});}
}
