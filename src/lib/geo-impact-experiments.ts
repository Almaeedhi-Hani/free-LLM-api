/** Evidence-gated before/after GEO analysis for persisted publication revisions.
 * Changes are observations, not proof that a specific edit CAUSED results.
 */
import type {GscPageRecord} from './content-impact-metrics';
import {canonicalImpactOrigin} from './impact-attribution';
import type {ConfirmedLeadEvent} from './impact-attribution';
export type ImpactDays=7|28|90;
export type PublicationRevision={
 id:string;item_id:string;target_path:string;published_at:string;
 status:'published'|'rolled_back';language:'ar'|'en'|'zh';
};
export type WindowMetrics={
 clicks:number;impressions:number;ctr:number|null;position:number|null;
 observedDays:number;
};
export type ImpactDelta={
 eventId:string;targetPath:string;itemId:string;publishedAt:string;
 days:ImpactDays;status:'measured'|'insufficient_data'|'awaiting_post_window'|'invalid_revision';
 before:WindowMetrics|null;after:WindowMetrics|null;
 change:{clicks:number;impressions:number;ctr:number|null;position:number|null}|null;
 message:string;score:number|null;reviewOnly:boolean;
};
const DAY=86400000;
function utcDay(v:string):number|null {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return null;
 const ts=Date.parse(v+'T00:00:00.000Z');
 return Number.isFinite(ts)&&new Date(ts).toISOString().slice(0,10)===v?ts:null;
}
function metrics(rows:readonly GscPageRecord[],lo:number,hi:number):WindowMetrics|null{
 const seen=new Map<number,GscPageRecord>();
 for(const row of rows){
  const day=utcDay(row.metric_date);
  if(day===null||day<lo||day>hi||row.dimension!=='page'||!Number.isSafeInteger(row.clicks)||
    !Number.isSafeInteger(row.impressions)||row.clicks<0||row.impressions<0||row.clicks>row.impressions||
    !Number.isFinite(row.position)||row.position<0)continue;
  const existing=seen.get(day);
  if(!existing||row.captured_at>existing.captured_at)seen.set(day,row);
 }
 const required=Math.round((hi-lo)/DAY)+1;
 // GSC omits zero-impression page days. Missing dates are UNKNOWN, never zero.
 if(seen.size!==required)return null;
 const all=Array.from(seen.values());
 const clicks=all.reduce((n,r)=>n+r.clicks,0);
 const impressions=all.reduce((n,r)=>n+r.impressions,0);
 if(!Number.isSafeInteger(clicks)||!Number.isSafeInteger(impressions))return null;
 const weighted=all.reduce((n,r)=>n+r.position*r.impressions,0);
 return {clicks,impressions,ctr:impressions>0?clicks/impressions:null,
   position:impressions>0?weighted/impressions:null,observedDays:seen.size};
}
export function compareRevisionImpact(
 event:PublicationRevision,allRows:readonly GscPageRecord[],days:ImpactDays,
 property:string,asOf=new Date()
):ImpactDelta{
 const base={eventId:event.id,targetPath:event.target_path,itemId:event.item_id,
  publishedAt:event.published_at,days,reviewOnly:true as const};
 const publishedDay=Date.parse(event.published_at);
 const path=canonicalImpactOrigin(event.target_path);
 if(!path||!Number.isFinite(publishedDay)||!['ar','en','zh'].includes(event.language)||
   !['published','rolled_back'].includes(event.status))
  return {...base,status:'invalid_revision',before:null,after:null,change:null,
    score:null,message:'بيانات النسخة المنشورة غير صالحة للمقارنة.'};
 const firstDay=Date.UTC(new Date(publishedDay).getUTCFullYear(),
   new Date(publishedDay).getUTCMonth(),new Date(publishedDay).getUTCDate());
 const latestReliable=Date.UTC(asOf.getUTCFullYear(),asOf.getUTCMonth(),
  asOf.getUTCDate())-3*DAY;
 if(latestReliable<firstDay+days*DAY)
  return {...base,status:'awaiting_post_window',before:null,after:null,change:null,
    score:null,message:'تحتاج المقارنة فترة مكتملة بعد النشر وتأخر بيانات GSC حتى ثلاثة أيام.'};
 let site:URL;
 try{site=new URL(property);if(site.protocol!=='https:')throw Error('property')}
 catch{return {...base,status:'insufficient_data',before:null,after:null,change:null,score:null,
   message:'خاصية GSC ليست URL قابلاً للمطابقة؛ يلزم إعداد أصل الموقع الصحيح.'};}
 const samePage=allRows.filter(row=>{
  if(row.property!==property||row.dimension!=='page')return false;
  try{const u=new URL(row.dimension_value);
   return u.origin===site.origin&&(u.pathname.replace(/\/$/,'')||'/')===path&&!u.search&&!u.hash;
  }catch{return false;}
 });
 const before=metrics(samePage,firstDay-days*DAY,firstDay-DAY);
 const after=metrics(samePage,firstDay+DAY,firstDay+days*DAY);
 if(!before||!after)return {...base,status:'insufficient_data',before,after,change:null,score:null,
  message:'أيام GSC للصفحة غير مكتملة في إحدى الفترتين؛ لا يجوز افتراض أن الأيام المفقودة تساوي صفرًا.'};
 const change={
  clicks:after.clicks-before.clicks,
  impressions:after.impressions-before.impressions,
  ctr:before.ctr===null||after.ctr===null?null:after.ctr-before.ctr,
  position:before.position===null||after.position===null?null:after.position-before.position
 };
 return {...base,status:'measured',before,after,change,
  // Rank only observed deltas; a score is NOT an estimated or caused conversion.
  score:change.clicks,message:'تغير مرصود في نقرات وظهور الصفحة، وليس إثباتًا بأن التعديل هو السبب.'};
}
export function rankObservedRevisions(revisions:readonly ImpactDelta[]):ImpactDelta[]{
 return [...revisions].sort((a,b)=>{
  const av=a.status==='measured'?a.score:null,bv=b.status==='measured'?b.score:null;
  if(av===null)return bv===null?b.publishedAt.localeCompare(a.publishedAt):1;
  if(bv===null)return -1;
  return bv-av||b.publishedAt.localeCompare(a.publishedAt);
 });
}

// A separately measured lead signal. Even with full coverage, browser-submitted
// source paths can be misattributed; this is ASSISTED attribution only.
export type LeadImpactComparison={
 status:'measured'|'unavailable';before:number|null;after:number|null;change:number|null;
 message:string;source:'browser_reported_requests';
};
export function compareRevisionLeads(
 event:PublicationRevision,leads:readonly ConfirmedLeadEvent[],days:ImpactDays,
 trackingStartedAt:string|null,asOf=new Date()
):LeadImpactComparison{
 const unavailable=(message:string):LeadImpactComparison=>({status:'unavailable',before:null,
  after:null,change:null,source:'browser_reported_requests',message});
 const published=Date.parse(event.published_at);
 const tracked=trackingStartedAt?Date.parse(trackingStartedAt):NaN;
 const path=canonicalImpactOrigin(event.target_path);
 if(!path||!Number.isFinite(published)||!Number.isFinite(tracked))
  return unavailable('لم يثبت تاريخ بداية تسجيل التحويلات؛ لا يمكن مقارنة القيم القديمة.');
 const d=new Date(published),firstDay=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());
 const preStart=firstDay-days*DAY,postEnd=firstDay+(days+1)*DAY;
 if(tracked>preStart)return unavailable('بدأ قياس الطلبات بعد بداية نافذة ما قبل النشر؛ لا يُفترض أن عددها صفر.');
 if(asOf.getTime()<postEnd)return unavailable('لم تنته فترة قياس الطلبات بعد النشر بعد.');
 const valid=leads.filter(x=>x.source_path===path&&x.attribution==='client_reported'&&
  Number.isFinite(Date.parse(x.occurred_at)));
 const before=valid.filter(x=>{const t=Date.parse(x.occurred_at);return t>=preStart&&t<firstDay}).length;
 const after=valid.filter(x=>{const t=Date.parse(x.occurred_at);return t>=firstDay+DAY&&t<postEnd}).length;
 return {status:'measured',before,after,change:after-before,source:'browser_reported_requests',
  message:'طلبات استفسار محفوظة وربطها العميل بمسار الصفحة عبر المتصفح، دون إثبات السببية أو الأهلية التجارية.'};
}
