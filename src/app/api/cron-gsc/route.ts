import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import {collectGscDimensionRows} from '@/lib/gsc-sync-collector';
import {executeGscCatchup,GscQuotaReached} from '@/lib/gsc-backfill-plan';
import {createGscAtomicStore} from '@/lib/gsc-atomic-storage';
import type {GscDimension,GscRow} from '@/lib/gsc-sync-collector';
import {classifyGscSyncFailure} from '@/lib/gsc-oauth-failure';
import {getGscServiceAccountToken} from '@/lib/gsc-service-account';

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
 // Explicit opt-in; merely adding the secret file must not switch auth unexpectedly.
 const useServiceAccount = process.env.GSC_AUTH_MODE === 'service_account';
 if (!url || !key || (!useServiceAccount && (!id || !secret || !refresh)) ||
     (useServiceAccount && !process.env.GOOGLE_APPLICATION_CREDENTIALS))
  return NextResponse.json({error:'missing_server_credentials'}, {status:503});
 try {
  let accessToken: string;
  if (useServiceAccount) {
   accessToken = await getGscServiceAccountToken(process.env.GOOGLE_APPLICATION_CREDENTIALS!);
  } else {
   const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: id!, client_secret: secret!, refresh_token: refresh!, grant_type: 'refresh_token' }), cache: 'no-store' });
   if (!tokenResponse.ok) throw new Error('google_token_' + tokenResponse.status);
   const token = await tokenResponse.json() as { access_token?: string };
   if (!token.access_token) throw new Error('google_token_missing');
   accessToken = token.access_token;
  }
  const day = new Date(); day.setUTCDate(day.getUTCDate() - 3);
  const date = day.toISOString().slice(0, 10);
  const endpoint = 'https://www.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(property) + '/searchAnalytics/query';
  const getRowsForDate = async (targetDate:string,dimension:GscDimension,startRow:number,rowLimit:number):Promise<GscRow[]> => {
   const response = await fetch(endpoint, { method: 'POST', headers: { authorization: 'Bearer ' + accessToken, 'content-type': 'application/json' },
    body: JSON.stringify({ startDate: targetDate, endDate: targetDate, dimensions: dimension==='page_query'?['page','query']:(dimension?[dimension]:[]), rowLimit, startRow }), cache: 'no-store' });
   if (response.status===429) throw new GscQuotaReached('google_quota_reached');
   if (!response.ok) throw new Error('google_search_' + response.status);
   const data = await response.json() as { rows?: GscRow[] };
   if(data.rows!==undefined&&!Array.isArray(data.rows))throw Error('google_search_invalid_rows');
   return data.rows || [];
  };
  const getRows=(dimension:GscDimension,startRow:number,rowLimit:number)=>
   getRowsForDate(date,dimension,startRow,rowLimit);
  // Opt-in only after the atomic migration has been explicitly approved/applied.
  // No speculative retry after ambiguous RPC writes; record and verify each day.
  if(process.env.GSC_BACKFILL_ENABLED==='true'){
   const store=createGscAtomicStore({url,key});
   const now=new Date();
   const history=await store.getHistory(property);
   // The opportunity analyzer needs 28 + 28 complete days (56). Keep a
   // 60-day recovery horizon without increasing the per-run request budget.
   // Phase-1 approved recovery floor: backfill from the first owner-identified
   // measurement window (15 Nov 2026), not 60 days before initial activation.
   // planGscCatchup still applies the moving 60-day lookback and now-3 cutoff.
   const earliestDate='2026-11-15';
   const report=await executeGscCatchup({now,earliestDate,history,maxDays:2,lookbackDays:60,property,
    queryRows:getRowsForDate,commitDay:store.commitDay,readDay:store.readDay});
   const failed=report.results.some(day=>Boolean(day.failure));
   return NextResponse.json({
    status:failed?'partial_failure':'completed',property,
    eligible_through:report.plan.eligible_through,attempted:report.results.length,
    remaining:report.plan.pending+report.unattempted,
    days:report.results.map(day=>({date:day.outcome.metric_date,
     status:day.outcome.status,rows_fetched:day.outcome.rows_fetched,
     rows_by_dimension:day.rows_by_dimension,failure:day.failure||null})),
    checked_at:now.toISOString()
   },{status:failed?502:200});
  }
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
  // Google token 400/401 is an OWNER reauthorization, not a transient retry.
  // Never emit the OAuth response body, refresh token, or client secret.
  const failure=classifyGscSyncFailure(error);
  return NextResponse.json({status:'error',...failure},{status:502});
 }
}
