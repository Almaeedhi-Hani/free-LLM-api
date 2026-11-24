'use strict';
const {health}=require('./telegram-ops-phase2.cjs');
const stamp=x=>{const t=Date.parse(x||'');return Number.isFinite(t)?new Intl.DateTimeFormat('ar-SA',{calendar:'gregory',timeZone:'Asia/Riyadh',dateStyle:'short',timeStyle:'short'}).format(new Date(t)):'غير مؤكد';};
const clean=x=>String(x??'غير متاح').replace(/[\x00-\x1f\x7f]/g,' ').slice(0,180);
const priorityLabels={critical:'حرجة',high:'عالية',medium:'متوسطة',low:'منخفضة'};
const publicationLabels={published:'منشور',rolled_back:'تم التراجع',failed:'فشل',pending:'معلق'};
const stateLabels={recent:'آخر نتيجة ناجحة وحديثة',failed:'آخر نتيجة فاشلة',stale:'آخر نتيجة قديمة',unknown:'الحالة غير مؤكدة'};
function finding(worker,source,priority,text,action=null){return {worker,source,priority,text,action};}
function operational(d,name,worker,source){
 const h=health(d).find(x=>x.name===name);
 return finding(worker,source,h.state==='failed'?1:h.state==='stale'||h.state==='unknown'?2:4,stateLabels[h.state]+' — '+stamp(h.when),h.state==='failed'||h.state==='stale'?'راجع سبب تعطل أو تأخر '+name+' قبل الاعتماد على مخرجاته.':h.state==='unknown'?'تحقق من مصدر '+name+' أولاً.':null);
}
const specialists={
 market:d=>{
  const base=operational(d,'Market Radar','استخبارات السوق','analysis_runs');
  const best=Array.isArray(d.opportunities)?d.opportunities[0]:null;
  return {...base,text:base.text+'\nأعلى فرصة مسجلة (بلغة المصدر): '+(best?clean(best.title)+' | الدرجة: '+clean(best.score)+' | الأولوية: '+(priorityLabels[best.priority]||'غير محددة'):Array.isArray(d.opportunities)?'لا توجد فرصة مفتوحة':'غير متاح'),action:base.action||(best?'راجع أدلة الفرصة الأعلى قبل اعتمادها.':null),priority:base.priority===4&&best?3:base.priority};
 },
 seo:d=>{
  const base=operational(d,'GSC','تحليل الظهور في البحث','gsc_sync_day_outcomes');
  return {...base,text:base.text+'\nتاريخ القياس: '+clean(d.gsc?.metric_date)+' | صفوف: '+clean(d.gsc?.rows_fetched)};
 },
 content:d=>{
  const base=operational(d,'GEO','المحتوى والظهور التوليدي','content_store / geo_publication_events');
  return {...base,text:base.text+'\nالمراجعات المعلقة: '+clean(d.pending)+' | روابط المحتوى: '+clean(d.publishedCount)+'\nآخر سجل نشر: '+(publicationLabels[d.publication?.status]||'غير مؤكد')+' — '+stamp(d.publication?.published_at),action:base.action||(Number.isInteger(d.pending)&&d.pending>0?'راجع المسودات المعلقة دون نشر تلقائي.':null),priority:base.priority===4&&d.pending>0?3:base.priority};
 },
 watchdog:d=>{
  const base=operational(d,'Watchdog','سلامة التشغيل','GitHub Actions / Issues');
  const issues=Array.isArray(d.watchdogIssues)?d.watchdogIssues:null;
  const count=issues?issues.length:null;
  return {...base,priority:count>0?1:base.priority,text:base.text+'\nبلاغات مفتوحة: '+(count===null?'غير متاح':count+(count===100?' أو أكثر':''))+(count? '\n'+issues.slice(0,3).filter(x=>Number.isSafeInteger(x.number)&&x.number>0).map(x=>'https://github.com/Almaeedhi-Hani/free-LLM-api/issues/'+x.number).join('\n'):''),action:count>0?'راجع البلاغات المفتوحة وأصلح السبب قبل إعلان سلامة النظام.':base.action};
 },
 impact:d=>finding('قياس أثر الذكاء الاصطناعي','impact_ai_observations',d.ai?.verification_status?3:2,d.ai?.verification_status?'آخر حالة تحقق مسجلة: '+clean(d.ai.verification_status)+' — '+stamp(d.ai.observed_at):'لا توجد ملاحظة مؤكدة؛ لا يمكن إثبات الظهور.',d.ai?.verification_status?'راجع الدليل والعينة قبل استنتاج تحسن الظهور.':'اطلب قياساً موثقاً قبل إعلان الظهور.')
};
async function coordinate(d,workers=specialists){
 const entries=Object.entries(workers);
 const settled=await Promise.allSettled(entries.map(([,fn])=>Promise.resolve().then(()=>fn(d))));
 return settled.map((r,i)=>r.status==='fulfilled'?r.value:finding(entries[i][0],'غير متاح',2,'تعذر تقييم هذا الاختصاص.','تحقق من المصدر ثم أعد التقييم.'));
}
async function report(d,workers=specialists){
 const results=await coordinate(d,workers);
 const actions=results.filter(x=>x.action).sort((a,b)=>a.priority-b.priority).slice(0,5);
 return 'غرفة القيادة | تقرير المنسق\n'+stamp(d.now)+'\n\n'+results.map(x=>'• '+x.worker+'\n'+x.text+'\nالمصدر: '+x.source).join('\n\n')+'\n\nالأولويات المقترحة:\n'+(actions.length?actions.map((x,i)=>(i+1)+'. '+x.action).join('\n'):'لا توجد أولوية مؤكدة من السجلات المتاحة.')+'\n\nتقييم قائم على قواعد وسجلات محفوظة، وليس تحقيقاً مستقلاً أو وكلاء نماذج لغوية. لم ينفذ أي إجراء أو تشغيل جديد.';
}
module.exports={specialists,coordinate,report};
