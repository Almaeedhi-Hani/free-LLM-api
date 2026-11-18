'use client';
import React,{useEffect,useState} from 'react';
type Observation={id:string;provider:string;page_path:string;search_question:string;result:string;evidence_url:string;observed_at:string};
type Revision={
 eventId:string;targetPath:string;itemId:string;publishedAt:string;status:string;
 before:{clicks:number;impressions:number;ctr:number|null;position:number|null}|null;
 after:{clicks:number;impressions:number;ctr:number|null;position:number|null}|null;
 change:{clicks:number;impressions:number;ctr:number|null;position:number|null}|null;
 leads:{status:string;before:number|null;after:number|null;change:number|null;message:string}|null;
 message:string;
};
const n=(x:number|null|undefined)=>typeof x==='number'?x.toLocaleString('ar-SA'):'—';
export default function GeoImpactExperiments({adminSecret,days}:{adminSecret:string;days:7|28|90}){
 const [experiments,setExperiments]=useState<Revision[]>([]);
 const [status,setStatus]=useState('جارٍ قراءة سجل الإصدارات...');
 const [ai,setAi]=useState<Observation[]>([]);
 const [aiStatus,setAiStatus]=useState('جارٍ قراءة الأدلة...');
 const [provider,setProvider]=useState('ChatGPT');
 const [path,setPath]=useState('');
 const [question,setQuestion]=useState('');
 const [evidence,setEvidence]=useState('');
 const [result,setResult]=useState('cited');
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let mounted=true;
  const controller=new AbortController();
  const headers={'x-admin-secret':adminSecret};
  Promise.allSettled([
   fetch('/api/admin/impact-experiments?days='+days,{headers,cache:'no-store',signal:controller.signal})
    .then(async v=>{const j=await v.json();if(!v.ok)throw Error(j.message||'تعذر قياس الأثر');return j}),
   fetch('/api/admin/impact-ai?days='+days,{headers,cache:'no-store',signal:controller.signal})
    .then(async v=>{const j=await v.json();if(!v.ok)throw Error(j.message||'تعذر قراءة ظهور AI');return j})
  ]).then(values=>{
   if(!mounted)return;
   const first=values[0],second=values[1];
   if(first.status==='fulfilled'){
    setExperiments(first.value.revisions||[]);setStatus(first.value.message||'');
   }else {setExperiments([]);setStatus(first.reason instanceof Error?first.reason.message:'البيانات غير متاحة');}
   if(second.status==='fulfilled'){
    setAi(second.value.observations||[]);setAiStatus(second.value.message||'');
   }else {setAi([]);setAiStatus('أدلة ظهور AI غير متاحة.');}
  });
  return ()=>{mounted=false;controller.abort()};
 },[adminSecret,days,refresh]);
 const save=async()=>{
  if(busy)return;
  setBusy(true);setNotice('');
  try{
   const response=await fetch('/api/admin/impact-ai',{
    method:'POST',headers:{'x-admin-secret':adminSecret,'content-type':'application/json'},
    body:JSON.stringify({provider,pagePath:path,query:question,result,evidenceUrl:evidence})
   });
   const out=await response.json();
   if(!response.ok||!out.saved)throw Error('لم يحفظ الدليل؛ تحقق من الحقول والرابط.');
   setNotice('حُفظت عينة موثّقة برابط، وليس باعتبارها تحققًا مستقلًا من منصة AI.');
   setQuestion('');setEvidence('');setRefresh(v=>v+1);
  }catch(e){setNotice(e instanceof Error?e.message:'فشل حفظ الدليل');}
  finally{setBusy(false)}
 };
 return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" dir="rtl">
  <h2 className="text-xl font-bold">محرك قياس أثر التحسينات</h2>
  <p className="mt-1 text-sm text-slate-600">مقارنة فترات متساوية قبل كل نشر آلي وبعده؛ لا تعني الزيادة أن التعديل تسبب فيها.</p>
  <p className="mt-3 text-sm text-slate-600" role="status">{status}</p>
  <div className="mt-3 overflow-x-auto">
   <table className="w-full min-w-[800px] text-right text-sm">
    <thead className="bg-slate-50"><tr>
     <th className="p-2">الصفحة / تاريخ التغيير</th><th className="p-2">النقرات قبل ← بعد</th>
     <th className="p-2">الظهور قبل ← بعد</th><th className="p-2">طلبات الباقات</th>
     <th className="p-2">النتيجة والخطوة التالية</th></tr></thead>
    <tbody>{experiments.map(e=><tr key={e.eventId} className="border-b align-top">
     <td className="p-2"><span dir="ltr">{e.targetPath}</span>
      <p className="text-xs text-slate-500">{new Date(e.publishedAt).toLocaleDateString('ar-SA')}</p></td>
     <td className="p-2">{e.change?n(e.before?.clicks)+' ← '+n(e.after?.clicks):'—'}</td>
     <td className="p-2">{e.change?n(e.before?.impressions)+' ← '+n(e.after?.impressions):'—'}</td>
     <td className="p-2">{e.leads?.status==='measured'?
      n(e.leads.before)+' ← '+n(e.leads.after):'—'}
      <p className="text-xs text-slate-500">إسناد من المتصفح فقط</p></td>
     <td className="p-2">{e.status==='measured'?
      'تغير النقرات: '+(e.change!.clicks>=0?'+':'')+n(e.change!.clicks)+
      (e.change!.clicks<0?' · راجع العنوان والوصف':' · واصل المراقبة'):
      e.status==='awaiting_post_window'?'بانتظار اكتمال فترة ما بعد النشر':
      'بيانات GSC غير كافية؛ لا يمكن ترتيب هذا التحسين'}
     </td>
    </tr>)}</tbody>
   </table>
  </div>
  {!experiments.length&&<p className="mt-3 text-sm text-slate-500">لا توجد تجارب منشورة قابلة للعرض بعد.</p>}
  <div className="mt-6 border-t pt-4">
   <h3 className="font-bold">رصد الظهور في إجابات الذكاء الاصطناعي</h3>
   <p className="mt-1 text-xs text-slate-600">سجل أدلة يدوي يمكن الرجوع إلى روابطه؛ لا يُقدَّم باعتباره فحصًا مستقلًا أو تغطية شاملة لكل المنصات.</p>
   <div className="mt-3 grid grid-cols-3 gap-2">
    <div className="rounded-lg bg-slate-100 p-3"><p className="text-xs">عينات محفوظة</p><strong>{n(ai.length)}</strong></div>
    <div className="rounded-lg bg-slate-100 p-3"><p className="text-xs">استشهادات ضمن العينات</p><strong>{n(ai.filter(x=>x.result==='cited').length)}</strong></div>
    <div className="rounded-lg bg-slate-100 p-3"><p className="text-xs">ذكر ضمن العينات</p><strong>{n(ai.filter(x=>x.result==='mentioned').length)}</strong></div>
   </div>
   <p className="mt-2 text-xs text-slate-500">{aiStatus}</p>
   <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
    <label className="text-xs">المنصة<select className="mt-1 w-full rounded-lg border p-2" value={provider} onChange={e=>setProvider(e.target.value)}>
     {['ChatGPT','Gemini','Perplexity','Google AI Overview','Other'].map(x=><option key={x}>{x}</option>)}
    </select></label>
    <label className="text-xs">النتيجة<select className="mt-1 w-full rounded-lg border p-2" value={result} onChange={e=>setResult(e.target.value)}>
     <option value="cited">استشهاد برابط</option><option value="mentioned">ذكر الموقع</option>
     <option value="not_observed">لم يظهر في هذه العينة</option>
    </select></label>
    <label className="text-xs">مسار الصفحة<input className="mt-1 w-full rounded-lg border p-2" value={path} onChange={e=>setPath(e.target.value)} placeholder="/en/insights/example"/></label>
    <label className="text-xs">السؤال الذي جُرّب<input className="mt-1 w-full rounded-lg border p-2" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="السؤال الفعلي"/></label>
    <label className="text-xs sm:col-span-2">رابط دليل يمكن فتحه<input className="mt-1 w-full rounded-lg border p-2" type="url" value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="https://..."/></label>
   </div>
   <button className="btn-secondary mt-3 text-sm" disabled={busy||!path||!question||!evidence} onClick={()=>void save()}>حفظ عينة الظهور</button>
   {notice&&<p className="mt-2 text-sm" role="status">{notice}</p>}
   {ai.length>0&&<ul className="mt-3 space-y-2">{ai.slice(0,10).map(x=><li key={x.id} className="text-xs">
    {x.provider} · {x.result==='cited'?'استشهاد':x.result==='mentioned'?'ذكر':'لم يُرصد'} · {x.page_path} ·
    <a className="underline" target="_blank" rel="noopener noreferrer" href={x.evidence_url}>رابط العينة</a>
   </li>)}</ul>}
  </div>
 </section>;
}
