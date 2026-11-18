import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import {collectGscDimensionRows} from '@/lib/gsc-sync-collector';
import type {GscDimension,GscRow} from '@/lib/gsc-sync-collector';

export const dynamic = 'force-dynamic';
const property = process.env.GSC_PROPERTY_URL || 'https://free-llm-api-1-didl.onrender.com/';
const dimensions = ['query', 'page', 'country', 'device'] as const;
function authorized(req: NextRequest) {
 const expected = process.env.CRON_SECRET || '';
 const given = (req.headers.get('authorization') || '').replace(/^Bearer /i, '');
 const a = Buffer.from(expected), b = Buffer.from(given);
 return !!expected && a.length === b.length && timingSafeEqual(a, b);
}
export async function GET(req: NextRequest) {
 if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
 const { GSC_CLIENT_ID: id, GSC_CLIENT_SECRET: secret, GSC_REFRESH_TOKEN: refresh, SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
 if (!id || !secret || !refresh || !url || !key) return NextResponse.json({ error: 'missing_server_credentials', required: ['GSC_CLIENT_ID', 'GSC_CLIENT_SECRET', 'GSC_REFRESH_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] }, { status: 503 });
 try {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: 'refresh_token' }), cache: 'no-store' });
  if (!tokenResponse.ok) throw new Error('google_token_' + tokenResponse.status);
  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) throw new Error('google_token_missing');
  const day = new Date(); day.setUTCDate(day.getUTCDate() - 3);
  const date = day.toISOString().slice(0, 10);
  const endpoint = 'https://www.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(property) + '/searchAnalytics/query';
  const getRows = async (dimension:GscDimension,startRow:number,rowLimit:number):Promise<GscRow[]> => {
   const response = await fetch(endpoint, { method: 'POST', headers: { authorization: 'Bearer ' + token.access_token, 'content-type': 'application/json' },
    body: JSON.stringify({ startDate: date, endDate: date, dimensions: dimension ? [dimension] : [], rowLimit, startRow }), cache: 'no-store' });
   if (!response.ok) throw new Error('google_search_' + response.status);
   const data = await response.json() as { rows?: GscRow[] };
   if(data.rows!==undefined&&!Array.isArray(data.rows))throw Error('google_search_invalid_rows');
   return data.rows || [];
  };
  // Complete every dimension before writing a single measurement.
  const results = await Promise.all(([null,...dimensions] as GscDimension[]).map(
   dimension => collectGscDimensionRows(getRows,dimension)
  ));
  const records = results.flatMap((rows, index) => rows.map(row => ({
   property, metric_date: date, dimension: index === 0 ? 'total' : dimensions[index - 1],
   dimension_value: index === 0 ? '' : (row.keys?.[0] || ''),
   clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position,
   captured_at: new Date().toISOString()
  })));
  // Bounded idempotent batches; a failed write cannot return success.
  for(let i=0;i<records.length;i+=500){
   const response = await fetch(url.replace(/\/$/, '') + '/rest/v1/gsc_daily_metrics?on_conflict=property,metric_date,dimension,dimension_value', { method: 'POST', headers: { apikey: key, authorization: 'Bearer ' + key, 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(records.slice(i,i+500)), cache: 'no-store' });
   if (!response.ok) throw new Error('supabase_write_' + response.status);
  }
  return NextResponse.json({ status: 'success', property, date, stored: records.length,
   page_rows:results[2].length,
   page_data_status:results[2].length?'observed_rows':'no_page_rows_from_google',
   empty: records.length === 0, checked_at: new Date().toISOString() });
 } catch (error) {
  return NextResponse.json({ status: 'error', error: error instanceof Error ? error.message : 'unknown_error' }, { status: 502 });
 }
}
