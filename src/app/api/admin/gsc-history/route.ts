import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
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
  const latest = rows[0] || null;
  const previous = rows[1] || null;
  const change = latest && previous ? { clicks: latest.clicks-previous.clicks, impressions:latest.impressions-previous.impressions, position:latest.position-previous.position } : null;
  const alerts = change && previous && previous.impressions >= 10 && change.impressions <= -Math.ceil(previous.impressions*0.3) ? [{type:'impressions_drop',message:'انخفاض الظهور اليومي بنسبة 30% أو أكثر مقارنة باليوم السابق'}] : [];
  return NextResponse.json({source:'supabase_gsc_daily',property,rows,change,alerts,last_sync:latest?.captured_at||null,message:rows.length?'':'لا توجد لقطات محفوظة بعد. يتطلب الجمع الدوري رمز تحديث Google على الخادم.'});
 } catch(e) {return NextResponse.json({error:e instanceof Error?e.message:'storage_error'},{status:502});}
}
