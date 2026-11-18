'use client';
import React,{useEffect,useState} from 'react';
import type {EditorialItem} from '@/lib/editorial-types';
type Handoff={item_id:string;status:'queued'|'issue_open'|'blocked';github_issue_url:string|null;github_issue_number:number|null;failure_code:string|null;github_observation?:string;github_pr_number?:number|null;github_pr_url?:string|null;github_pr_state?:string|null;render_deploy_status?:'verified'|'pending'|'unverified'};
export default function TechnicalTaskBoard({secret,items,onOpenDetails}:{secret:string;items:EditorialItem[];onOpenDetails:()=>void}){
 const tasks=items.filter(x=>x.status==='pending'&&['technical_seo','internal_link'].includes(x.kind));
 const [history,setHistory]=useState<Handoff[]>([]);
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState<string|null>(null);
 const [available,setAvailable]=useState(false);
 const load=async()=>{
  try{
   const response=await fetch('/api/admin/technical-tasks',{
    headers:{'x-admin-secret':secret},cache:'no-store'});
   if(!response.ok)throw Error('سجل مهام GitHub غير متاح');
   const payload=await response.json();
   if(!Array.isArray(payload.tasks))throw Error('استجابة سجل مهام غير صالحة');
   setHistory(payload.tasks);setAvailable(true);
  }catch(e){setAvailable(false);setMessage(e instanceof Error?e.message:'تعذر قراءة المهام')}
 };
 useEffect(()=>{if(secret)void load()},[secret]);
 const create=async(item:EditorialItem)=>{
  if(busy||!available)return;
  if(!window.confirm('إنشاء تذكرة GitHub لهذه المهمة التقنية؟ لن يُعدّ الكود منفذًا حتى يكتمل PR واختبار ونشر موثق.'))return;
  setBusy(item.id);setMessage('');
  try{
   const response=await fetch('/api/admin/technical-tasks',{
    method:'POST',headers:{'x-admin-secret':secret,'Content-Type':'application/json'},
    body:JSON.stringify({item_id:item.id,confirm:'CREATE_GEO_TECHNICAL_ISSUE'})
   });
   const payload=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(payload.message||payload.error||'تعذر إنشاء التذكرة');
   if(payload.status!=='issue_open'||!payload.issue_url)throw Error('لم يؤكد GitHub إنشاء التذكرة');
   setMessage('تم إنشاء تذكرة GitHub؛ لا تعني التذكرة أن التعديل أصبح منشورًا.');
   await load();
  }catch(e){setMessage(e instanceof Error?e.message:'تعذر إنشاء التذكرة');await load()}
  finally{setBusy(null)}
 };
 return <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" dir="rtl">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div>
    <h2 className="text-lg font-bold">المهام التقنية والربط الداخلي</h2>
    <p className="mt-1 text-xs text-slate-600">المرحلة الأولى هي إنشاء مهمة GitHub من مقترح محفوظ. ثم يقوم الوكيل البرمجي بالتطوير في PR، وتُختبر التغييرات وتُنشر قبل اعتبار المهمة منجزة.</p>
   </div>
   <button className="btn-secondary text-xs" type="button" onClick={()=>void load()}>تحديث سجل المهام</button>
  </div>
  {message&&<p className="mt-3 text-sm text-slate-700" role="status">{message}</p>}
  <p className="mt-2 text-xs text-slate-500">{available?'سجل تسليم المهام متاح.':'تسليم المهام غير متاح حاليًا، ولن تُنشأ تذكرة بصورة صامتة.'}</p>
  <div className="mt-4 space-y-3">
   {tasks.map(item=>{
    const saved=history.find(x=>x.item_id===item.id);
    return <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
     <div className="min-w-0 flex-1">
      <p className="text-xs text-slate-500">{item.kind==='internal_link'?'الروابط الداخلية':'SEO تقني'} · {item.lang.toUpperCase()}</p>
      <p className="font-semibold">{item.title}</p>
      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{item.summary}</p>
     </div>
     <div className="flex items-center gap-2">
      {saved?.status==='issue_open'&&saved.github_issue_url?.startsWith('https://github.com/')?
       <div className="flex flex-wrap items-center gap-2">
        <a className="btn-secondary text-xs" href={saved.github_issue_url} rel="noopener noreferrer" target="_blank">تذكرة GitHub #{saved.github_issue_number} — {saved.render_deploy_status==='verified'?'نُفذت ونُشرت':saved.github_pr_state==='merged'?'مُدمجة بانتظار تحقق النشر':'بانتظار التنفيذ'}</a>
        {saved.github_pr_url&&saved.github_pr_url.startsWith('https://github.com/Almaeedhi-Hani/free-LLM-api/pull/')&&
         <a className="text-xs text-blue-700 underline" href={saved.github_pr_url} target="_blank" rel="noopener noreferrer">PR #{saved.github_pr_number} · {saved.github_pr_state==='merged'?'مدمج':saved.github_pr_state==='open'?'قيد المراجعة':'مغلق'}</a>}
        {saved.render_deploy_status==='verified'?<span className="text-xs font-semibold text-emerald-700">تم التحقق من وصول PR إلى إصدار Render</span>:
         saved.github_pr_state==='merged'?<span className="text-xs text-amber-800">الدمج مثبت؛ النشر لم يتأكد</span>:
         saved.github_observation==='unavailable'?<span className="text-xs text-amber-800">تعذر التحقق المباشر من GitHub</span>:null}
       </div>:
       saved?<span className="text-xs text-amber-800">التسليم غير مؤكد؛ راجع GitHub قبل إعادة الطلب</span>:
       <button type="button" className="btn-primary text-xs" disabled={!available||busy!==null}
        onClick={()=>void create(item)}>{busy===item.id?'جارٍ التسليم':'إنشاء تذكرة تنفيذ'}</button>}
     </div>
    </article>;
   })}
   {!tasks.length&&<p className="text-sm text-slate-500">لا توجد مهام تقنية جديدة تنتظر التسليم.</p>}
  </div>
  <button type="button" className="mt-3 text-sm text-blue-700 underline" onClick={onOpenDetails}>معاينة تفاصيل المقترحات والمراجع</button>
 </section>;
}
