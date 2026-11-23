'use strict';
/** Pure, deterministic weekly snapshot. Unknown sources are never interpreted as zero. */
const TZ='Asia/Riyadh';
function weekKey(date){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const get=k=>Number(parts.find(p=>p.type===k).value);
 const utc=Date.UTC(get('year'),get('month')-1,get('day'));
 // Saudi business week starts Sunday.
 const sunday=utc-new Date(utc).getUTCDay()*86400000;
 return new Date(sunday).toISOString().slice(0,10);
}
function tally(items,status){
 if(!Array.isArray(items))return null;
 return items.filter(x=>x&&x.status===status).length;
}
function buildReport({now=new Date(),content,systems={}}){
 if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw new Error('Invalid report date');
 if(!content||typeof content!=='object')throw new Error('Persisted content is required');
 const keys=['GEO','GSC','Market Radar','Publishing','AI Visibility','Watchdog'];
 const health=keys.map(name=>{
   const s=systems[name];
   return {name,status:s?.status??'unavailable',lastAttempt:s?.lastAttempt??null,lastSuccess:s?.lastSuccess??null,reason:s?.reason??null,source:s?.source??null};
 });
 return {
  schemaVersion:1,week:weekKey(now),generatedAt:now.toISOString(),timezone:TZ,
  source:{kind:'persisted-content-store',updatedAt:content.updatedAt??null},
  editorial:{approved:tally(content.editorialItems,'approved'),rejected:tally(content.editorialItems,'rejected'),pending:tally(content.editorialItems,'pending')},
  faqDrafts:{approved:tally(content.drafts,'approved'),rejected:tally(content.drafts,'rejected'),pending:tally(content.drafts,'pending')},
  health,
  metrics:{gsc:null,marketRadar:null,aiVisibility:null,quotas:null,publishedLinks:null},
  warnings:['External system measurements unavailable until persisted source adapters are connected'],
  deliveryStatus:'generated_not_verified'
 };
}
module.exports={weekKey,buildReport};
