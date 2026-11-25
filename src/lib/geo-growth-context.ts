import {getContent} from './content-store';
import {getSupabaseCredentials} from './storage-mode';
import {getGeoFeedbackIndex,excludesOpportunity,containsRejectedKeyword,isExcluded,excludesEditorial,excludesFaq,inferFeedbackLanguage} from './geo-agent-feedback';
import type {FeedbackIndex} from './geo-agent-feedback';
import {prioritizeGoals} from './market/scoring';
import type {AgentGoal,Opportunity} from './market/types';
import {summarizePageImpact} from './content-impact-metrics';
import type {GscPageRecord} from './content-impact-metrics';
import {summarizeGscPerformance} from './gsc-measured-performance';
import {canonicalImpactOrigin,summarizeConfirmedLeads} from './impact-attribution';
import type {ConfirmedLeadEvent} from './impact-attribution';
import {compareRevisionImpact,rankObservedRevisions} from './geo-impact-experiments';
import type {PublicationRevision} from './geo-impact-experiments';
import {approvedEditorial} from './editorial-workflow';
import {editorialPath} from './content-impact';
import {createHash} from 'node:crypto';

export type GrowthEvidence={id:string;type:string;source:string;name:string;language:'ar'|'en'|'zh'|'multi';snippet:string;observed_at?:string};
export type GrowthContext={status:'available'|'partial';items:GrowthEvidence[];sources:Record<string,string>};
type QueryRow=GscPageRecord;
type DayOutcome={metric_date:string;status:string};
type AIObservation={provider:string;page_path:string;result:string;verification_status:string;observed_at:string};
const LANGS=['ar','en','zh'] as const;
const day=86400000;
const date=(ms:number)=>new Date(ms).toISOString().slice(0,10);
const norm=(s:string)=>s.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
const short=(v:unknown,n=150)=>typeof v==='string'?v.replace(/[\r\n\t]+/g,' ').slice(0,n):'';
const clean=(v:unknown)=>typeof v==='string'&&v.trim().length>0&&!/[^\s@]+@[^\s@]+\.[^\s@]+|(?:\+?\d[\s().-]*){8,}/.test(v);
const hash=(v:string)=>createHash('sha256').update(v).digest('hex').slice(0,20);
const pathLanguage=(p:string):'ar'|'en'|'zh'=>p.startsWith('/en/')||p==='/en'?'en':p.startsWith('/zh/')||p==='/zh'?'zh':'ar';
const safeDate=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v))?v:undefined;
const activeGoal=(g:AgentGoal)=>['open','in_progress'].includes(g.status);
const activeOpp=(o:Opportunity)=>['new','triaged','planned'].includes(o.status);
const goalEvidenceId=(id:string)=>'goal_'+id;
const validGoalId=(id:unknown):id is string=>typeof id==='string'&&/^[a-f0-9-]{36}$/i.test(id);
export const publicationMetric='publish_linked_content';

/** Only existing stored aggregates/operational records. No contact details,
 * raw private event IDs, customer messages, or external calls to models. */
async function readRows<T>(table:string,query:Record<string,string>,limit=1000):Promise<T[]>{
 const cfg=getSupabaseCredentials();if(!cfg)throw Error('storage_unavailable');
 const params=new URLSearchParams({...query,limit:String(limit)});
 const r=await fetch(cfg.url+'/rest/v1/'+table+'?'+params,{
  headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key},cache:'no-store',signal:AbortSignal.timeout(8000)
 });
 if(!r.ok)throw Error('read_unavailable');
 const rows:unknown=await r.json();
 if(!Array.isArray(rows)||rows.length>=limit)throw Error('truncated_or_invalid_rows');
 return rows as T[];
}
export async function loadGrowthContext(keywords:readonly {term?:string;keyword?:string;language?:string}[],now=new Date()):Promise<GrowthContext>{
 const end=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())-3*day;
 const start=date(end-55*day),until=date(end);
 const property=process.env.GSC_PROPERTY_URL||'https://free-llm-api-1-didl.onrender.com/';
 const sources:Record<string,string>={},items:GrowthEvidence[]=[];
 const read=async<T>(name:string,fn:()=>Promise<T>):Promise<T|null>=>{
  try{const v=await fn();sources[name]='available';return v}catch{sources[name]='unavailable';return null}
 };
 const [goals,opps,gsc,coverage,leads,revisions,ai,content,memory]=await Promise.all([
  read('goals',()=>readRows<AgentGoal>('agent_goals',{select:'id,title,description,priority,status,confidence,success_metrics,related_opportunity_id,created_at,updated_at',status:'in.(open,in_progress)',order:'created_at.asc'})),
  read('opportunities',()=>readRows<Opportunity>('opportunities',{select:'id,title,type,priority,score,status,languages,confidence,related_keywords',status:'in.(new,triaged,planned)',order:'score.desc'})),
  read('gsc',()=>readRows<QueryRow>('gsc_daily_metrics',{select:'property,metric_date,dimension,dimension_value,clicks,impressions,position,captured_at',property:'eq.'+property,dimension:'in.(page,query)',and:'(metric_date.gte.'+start+',metric_date.lte.'+until+')',order:'metric_date.desc'})),
  read('gsc_coverage',()=>readRows<DayOutcome>('gsc_sync_day_outcomes',{select:'metric_date,status',property:'eq.'+property,and:'(metric_date.gte.'+start+',metric_date.lte.'+until+')'})),
  read('leads',()=>readRows<ConfirmedLeadEvent>('impact_lead_events',{select:'source_path,attribution,occurred_at,locale',occurred_at:'gte.'+new Date(now.getTime()-28*day).toISOString()})),
  read('revisions',()=>readRows<PublicationRevision>('geo_publication_events',{select:'id,item_id,target_path,language,status,published_at',status:'eq.published',published_at:'gte.'+start+'T00:00:00Z',order:'published_at.desc'})),
  read('ai',()=>readRows<AIObservation>('impact_ai_observations',{select:'provider,page_path,result,verification_status,observed_at',observed_at:'gte.'+new Date(now.getTime()-28*day).toISOString()})),
  read('content',()=>getContent()),
  read('feedback',()=>getGeoFeedbackIndex())
 ]);
 // If reviewer memory is unavailable, no potentially rejected text is sent.
 if(!memory)return {status:'partial',items:[],sources};
 const push=(e:GrowthEvidence)=>{if(clean(e.name))items.push(e)};
 const eligibleOpps=(opps||[]).filter(o=>activeOpp(o)&&clean(o.title)&&!excludesOpportunity(memory,o));
 const oppById=new Map(eligibleOpps.map(o=>[o.id,o]));
 const allowedGoals=prioritizeGoals((goals||[]).filter(g=>activeGoal(g)&&validGoalId(g.id)&&clean(g.title)&&!isExcluded(memory,'opportunity',g.title,inferFeedbackLanguage(g.title))&&!containsRejectedKeyword(memory,[g.title,g.description||''])&&(!g.related_opportunity_id||oppById.has(g.related_opportunity_id))));
 const published=(['ar','en','zh'] as const).flatMap(l=>approvedEditorial(content?.editorialItems,l)).filter(e=>!excludesEditorial(memory,e,editorialPath(e)||undefined));
 const pending=(content?.editorialItems||[]).filter(e=>e.status==='pending'&&!excludesEditorial(memory,e,editorialPath(e)||undefined));
 const gscRows=gsc||[];
 const currentFrom=date(end-27*day);
 const recent=gscRows.filter(r=>r.metric_date>=currentFrom&&r.metric_date<=until);
 const currentCoverage=new Set((coverage||[]).filter(r=>r.metric_date>=currentFrom&&r.metric_date<=until&&['success_with_data','success_no_data'].includes(r.status)).map(r=>r.metric_date)).size;
 const pageSummary=summarizePageImpact(recent,28,property);
 const previous=summarizePageImpact(gscRows.filter(r=>r.metric_date<currentFrom),28,property);
 const oldCoverage=new Set((coverage||[]).filter(r=>r.metric_date>=start&&r.metric_date<currentFrom&&['success_with_data','success_no_data'].includes(r.status)).map(r=>r.metric_date)).size;
 let leadTotals:ReturnType<typeof summarizeConfirmedLeads>|null=null;
 if(leads)try{leadTotals=summarizeConfirmedLeads(leads)}catch{sources.leads='invalid'};
 const activeRevisions=(revisions||[]).filter(r=>published.some(e=>e.id===r.item_id&&editorialPath(e)===r.target_path));
 const effects=rankObservedRevisions(activeRevisions.map(r=>compareRevisionImpact(r,gscRows,7,property,now)));
 const knownKeywords=new Set(keywords.filter(k=>clean(k.term||k.keyword)).map(k=>norm((k.term||k.keyword)!)));
 for(const lang of LANGS){
  for(const g of allowedGoals.filter(g=>inferFeedbackLanguage(g.title)===lang).slice(0,3)){
   const linked=oppById.get(g.related_opportunity_id||'');
   const criteria=Array.isArray(g.success_metrics)?g.success_metrics.length:0;
   const linkedItems=pending.filter(e=>e.evidence_ids?.includes(goalEvidenceId(g.id))).length;
   push({id:goalEvidenceId(g.id),type:'goal',source:'agent_goals',language:lang,name:short(g.title,145),snippet:short('status='+g.status+'; priority='+g.priority+'; measurable_criteria='+criteria+'; linked_pending='+linkedItems+'; '+(linked?'opportunity='+short(linked.title,80)+'; ':'')+(clean(g.description)?short(g.description,100):''),280),observed_at:safeDate(g.updated_at)});
  }
  for(const o of eligibleOpps.filter(o=>o.languages?.includes(lang)||inferFeedbackLanguage(o.title)===lang).slice(0,2))
   push({id:'opp_'+o.id,type:'opportunity',source:'opportunities',language:lang,name:short(o.title,145),snippet:'priority='+o.priority+'; heuristic_score='+o.score+'; confidence='+o.confidence+'; status='+o.status});
  const pages=Object.entries(pageSummary.pages).filter(([p])=>canonicalImpactOrigin(p)&&pathLanguage(p)===lang)
   .sort((a,b)=>b[1].impressions-a[1].impressions).slice(0,2);
  for(const [p,m] of pages){
   const old=previous.pages[p];
   const full=currentCoverage===28&&oldCoverage===28&&m.observedDays===28&&old?.observedDays===28;
   push({id:'gsc_'+hash(p),type:'gsc',source:'gsc_daily_metrics',language:lang,name:p,snippet:short(JSON.stringify({from:currentFrom,to:until,observed_days:m.observedDays,coverage_days:currentCoverage,impressions:m.impressions,clicks:m.clicks,ctr:m.ctr,position:m.position,delta_clicks:full?m.clicks-old.clicks:null,delta_impressions:full?m.impressions-old.impressions:null}),285),observed_at:safeDate(m.capturedAt)});
  }
  // Search queries must exactly match a stored, non-excluded keyword; no raw
  // unrecognized search terms or potential personal information leave storage.
  const queryGroups=new Map<string,QueryRow[]>();
  for(const q of recent.filter(r=>r.dimension==='query'&&clean(r.dimension_value)&&knownKeywords.has(norm(r.dimension_value))&&inferFeedbackLanguage(r.dimension_value)===lang&&!isExcluded(memory,'keyword',r.dimension_value,lang))){
   const list=queryGroups.get(q.dimension_value)||[];list.push(q);queryGroups.set(q.dimension_value,list);
  }
  const queryMetrics=Array.from(queryGroups.entries()).flatMap(([term,rows])=>{
   try{return [{term,stats:summarizeGscPerformance(rows.map(r=>({keys:[term],clicks:r.clicks,impressions:r.impressions,position:r.position})),['query']),days:new Set(rows.map(r=>r.metric_date)).size}]}catch{return []}
  }).sort((a,b)=>b.stats.impressions-a.stats.impressions).slice(0,1);
  for(const q of queryMetrics)push({id:'gscq_'+hash(q.term),type:'gsc',source:'gsc_daily_metrics',language:lang,name:short(q.term),snippet:short(JSON.stringify({grain:'query',from:currentFrom,to:until,observed_days:q.days,coverage_days:currentCoverage,impressions:q.stats.impressions,clicks:q.stats.clicks,ctr:q.stats.ctr,position:q.stats.average_position}),280)});
  const liveTitles=published.filter(e=>e.lang===lang&&clean(e.title)).slice(-2).map(e=>short(e.title,70));
  const pendingTitles=pending.filter(e=>e.lang===lang&&clean(e.title)).slice(-2).map(e=>short(e.title,70));
  const liveFaq=(content?.faqs||[]).filter(f=>inferFeedbackLanguage(f.q)===lang&&!excludesFaq(memory,f.q)&&clean(f.q)).slice(-1).map(f=>short(f.q,65));
  const impact=effects.find(e=>pathLanguage(e.targetPath)===lang);
  const samples=(ai||[]).filter(e=>canonicalImpactOrigin(e.page_path)&&pathLanguage(e.page_path)===lang&&e.verification_status==='manual_documented'&&['cited','mentioned','not_observed'].includes(e.result));
  const leadsForLang=leadTotals?Object.entries(leadTotals.byPage).filter(([p])=>pathLanguage(p)===lang).reduce((n,[,m])=>n+m.total,0):null;
  const countFeedback=Array.from(memory.values()).filter(f=>f.decision!=='valid'&&(f.language===lang||f.language===null)).length;
  push({id:'performance_'+lang,type:'performance',source:'stored_impact_summary',language:lang,name:'Observed outcomes (not causal or legal proof)',snippet:short(JSON.stringify({gsc_days:coverage?currentCoverage:null,gsc_rows:gsc?pages.length:null,requests_28d:leadsForLang,ai_manual_samples:ai?samples.length:null,ai_cited:ai?samples.filter(e=>e.result==='cited').length:null,revision:impact?{path:impact.targetPath,status:impact.status,click_delta:impact.change?.clicks??null}:null}),285)});
  push({id:'inventory_'+lang,type:'inventory',source:'content_store',language:lang,name:'Existing content / reviewer learning',snippet:short(JSON.stringify({available:!!content,live:liveTitles,pending:pendingTitles,faq:liveFaq,excluded:countFeedback,last_run_status:content?.agent?.status||null}),285)});
 }
 return {status:Object.values(sources).every(s=>s==='available')?'available':'partial',items,sources};
}

/** A goal can be closed only with an explicit machine-verifiable metric, an
 * exact stored goal reference on current visitor copy, and a post-goal
 * publication event. Legacy/free-text goals are never closed by a model. */
export function verifiedGoalPublication(goal:AgentGoal,content:Awaited<ReturnType<typeof getContent>>,events:readonly PublicationRevision[]):PublicationRevision|null{
 const metrics=goal.success_metrics;
 if(!activeGoal(goal)||!validGoalId(goal.id)||!Array.isArray(metrics)||metrics.length!==1||metrics[0].metric!==publicationMetric||metrics[0].target!=='1')return null;
 const target=canonicalImpactOrigin(metrics[0].measurement);
 const created=Date.parse(goal.created_at);if(!target||!Number.isFinite(created))return null;
 const live=LANGS.flatMap(l=>approvedEditorial(content.editorialItems,l)).filter(e=>editorialPath(e)===target&&e.evidence_ids?.includes(goalEvidenceId(goal.id)));
 return events.find(e=>e.status==='published'&&e.target_path===target&&Date.parse(e.published_at)>=created&&live.some(item=>item.id===e.item_id&&item.lang===e.language))||null;
}
export async function reconcileGrowthGoals(memory:FeedbackIndex):Promise<{closed:number;status:string}>{
 const cfg=getSupabaseCredentials();if(!cfg)return {closed:0,status:'unavailable'};
 let closed=0;
 try{
  const goals=await readRows<AgentGoal>('agent_goals',{select:'*',status:'in.(open,in_progress)',order:'created_at.asc'});
  const candidates=goals.filter(g=>Array.isArray(g.success_metrics)&&g.success_metrics.length===1&&g.success_metrics[0].metric===publicationMetric&&!isExcluded(memory,'opportunity',g.title,inferFeedbackLanguage(g.title))&&!containsRejectedKeyword(memory,[g.title,g.description||''])).slice(0,10);
  if(!candidates.length)return {closed:0,status:'no_measurable_linked_goals'};
  const [content,events]=await Promise.all([getContent(),readRows<PublicationRevision>('geo_publication_events',{select:'id,item_id,target_path,language,status,published_at',status:'eq.published',order:'published_at.desc'})]);
  for(const goal of candidates){
   const event=verifiedGoalPublication(goal,content,events);
   if(!event)continue;
   const item=content.editorialItems.find(e=>e.id===event.item_id);
   if(!item||excludesEditorial(memory,item,event.target_path))continue;
   const params=new URLSearchParams({id:'eq.'+goal.id,updated_at:'eq.'+goal.updated_at,status:'in.(open,in_progress)',select:'id,status,completed_at'});
   const r=await fetch(cfg.url+'/rest/v1/agent_goals?'+params,{method:'PATCH',headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key,'Content-Type':'application/json',Prefer:'return=representation'},cache:'no-store',signal:AbortSignal.timeout(8000),body:JSON.stringify({status:'done',completed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
   if(!r.ok)return {closed,status:'partial'};
   const rows=await r.json();if(Array.isArray(rows)&&rows.length===1&&rows[0].id===goal.id&&rows[0].status==='done')closed++;
  }
  return {closed,status:'checked'};
 }catch{return {closed,status:'unavailable'}}
}
