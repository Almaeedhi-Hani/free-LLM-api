'use client';
import React,{useEffect,useState} from 'react';
type GithubRun={id:number;status:string;conclusion:string|null;created_at:string;html_url:string};
type PublicationEvent={id:string;item_id:string;target_path:string;kind:'editorial'|'faq';
 risk_level:string;status:string;published_at:string;rolled_back_at:string|null};
type LegacyRun={id:string;run_type:string;status:string;started_at:string;finished_at:string|null;triggered_by:string};
const date=(x:string|null|undefined)=>x&&Number.isFinite(Date.parse(x))?
 new Date(x).toLocaleString('ar-SA'):'—';
export default function UnifiedRunHistory({secret,legacyRuns}:{secret:string;legacyRuns:LegacyRun[]}){
 const [github,setGithub]=useState<GithubRun[]>([]);
 const [publication,setPublication]=useState<PublicationEvent[]>([]);
 const [githubNote,setGithubNote]=useState('جارٍ التحقق من GitHub…');
 const [pubNote,setPubNote]=useState('جارٍ التحقق من سجل النشر…');
 const [busy,setBusy]=useState(false);
 const [refreshKey,setRefreshKey]=useState(0);
 useEffect(()=>{
  if(!secret)return;
  let alive=true;const controller=new AbortController();
  const headers={'x-admin-secret':secret};
  const get=async(path:string)=>{
   const response=await fetch(path,{headers,cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('HTTP '+response.status);
   return response.json();
  };
  setBusy(true);
  Promise.allSettled([
   get('/api/admin/geo-engine'),get('/api/admin/geo-publication')
  ]).then(results=>{
   if(!alive)return;
   const one=results[0],two=results[1];
   if(one.status==='fulfilled'&&Array.isArray(one.value.runs)){
    setGithub(one.value.runs);
    setGithubNote('آخر تشغيلات GitHub Actions الفعلية (حتى 5 تشغيلات، لا تمثل كل التاريخ).');
   }else{
    setGithub([]);
    setGithubNote(one.status==='fulfilled'?
     one.value?.message||'لم يُضبط ربط GitHub لهذه الشاشة.':
     'لم يمكن قراءة تشغيلات GitHub؛ لا يعني ذلك أن المحرك لم يعمل.');
   }
   if(two.status==='fulfilled'&&two.value.available&&Array.isArray(two.value.events)){
    setPublication(two.value.events);
    setPubNote('سجل النشر الآلي الفعلي مع حالة التراجع، وليس سجل التحليل القديم.');
   }else {setPublication([]);setPubNote('سجل النشر غير متاح الآن؛ لا يُفترض عدم وجود منشورات.');}
  }).finally(()=>{if(alive)setBusy(false)});
  return ()=>{alive=false;controller.abort()};
 },[secret,refreshKey]);
 return <section className="space-y-5" dir="rtl">
  <div className="flex items-center justify-between gap-3">
   <div><h2 className="text-xl font-bold">سجل التشغيل والنشر الموحد</h2>
    <p className="text-sm text-slate-600">يجمع GitHub والنشر الآلي وسجلات المحرك القديم دون خلطها أو افتراض فشل التشغيل عند غياب بيانات قديمة.</p>
   </div>
   <button type="button" onClick={()=>setRefreshKey(k=>k+1)} disabled={busy} className="btn-secondary text-xs">{busy?'جارٍ التحديث':'تحديث السجل'}</button>
  </div>
  <section className="rounded-xl border bg-white p-4">
   <h3 className="font-bold">محرك GEO — GitHub Actions</h3><p className="my-2 text-xs text-slate-600" role="status">{githubNote}</p>
   {!github.length?<p className="text-sm text-slate-500">لا توجد بيانات متاحة من GitHub حاليًا.</p>:
   <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-right text-sm">
    <thead><tr className="border-b"><th className="p-2">التشغيل</th><th className="p-2">الحالة</th><th className="p-2">التاريخ</th><th className="p-2">التفاصيل</th></tr></thead>
    <tbody>{github.map(x=><tr key={x.id} className="border-b">
     <td className="p-2" dir="ltr">#{x.id}</td><td className="p-2">{x.conclusion||x.status}</td><td className="p-2">{date(x.created_at)}</td>
     <td className="p-2">{x.html_url?.startsWith('https://github.com/')&&<a href={x.html_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">عرض في GitHub</a>}</td>
    </tr>)}</tbody>
   </table></div>}
  </section>
  <section className="rounded-xl border bg-white p-4">
   <h3 className="font-bold">النشر الآلي وسجل التراجع</h3>
   <p className="my-2 text-xs text-slate-600">{pubNote}</p>
   {!publication.length?<p className="text-sm text-slate-500">لا توجد سجلات نشر معروضة من المصدر.</p>:
   <div className="overflow-x-auto"><table className="w-full min-w-[550px] text-right text-sm">
    <thead><tr className="border-b"><th className="p-2">العنصر</th><th className="p-2">العملية</th><th className="p-2">تاريخ النشر</th><th className="p-2">المسار</th></tr></thead>
    <tbody>{publication.map(x=><tr key={x.id} className="border-b">
     <td className="p-2">{x.kind==='faq'?'سؤال شائع':'صفحة محتوى'}</td>
     <td className="p-2">{x.status==='rolled_back'?'تم التراجع':'منشور'}</td>
     <td className="p-2">{date(x.published_at)}</td><td className="p-2" dir="ltr">{x.target_path||'/'}</td>
    </tr>)}</tbody>
   </table></div>}
  </section>
  <section className="rounded-xl border bg-white p-4">
   <h3 className="font-bold">سجل تحليل السوق القديم</h3>
   <p className="my-2 text-xs text-slate-600">مؤشرات تاريخية منفصلة؛ قد يكون هذا الجدول فارغًا حتى مع نجاح تشغيل المحرك الحديث.</p>
   {!legacyRuns.length?<p className="text-sm text-slate-500">لا توجد إدخالات محفوظة في السجل القديم.</p>:
   <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-right text-sm">
    <thead><tr className="border-b"><th className="p-2">النوع</th><th className="p-2">الحالة</th><th className="p-2">البداية</th><th className="p-2">المشغّل</th></tr></thead>
    <tbody>{legacyRuns.map(x=><tr key={x.id} className="border-b">
     <td className="p-2">{x.run_type}</td><td className="p-2">{x.status}</td><td className="p-2">{date(x.started_at)}</td><td className="p-2">{x.triggered_by||'—'}</td>
    </tr>)}</tbody>
   </table></div>}
  </section>
 </section>;
}
