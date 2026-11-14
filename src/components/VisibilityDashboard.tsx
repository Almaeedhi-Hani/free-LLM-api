'use client';
import React,{useEffect,useState} from 'react';
type Section='pages'|'queries'|'ai'|'conversions';
type Result={url:string;language:string;checked_at:string;http_status:number|null;canonical:string|null;hreflang:{lang:string;url:string}[];errors:string[];status:string};
const sections:[Section,string][]=[['pages','الفهرسة وصحة الصفحات'],['queries','الكلمات والاستعلامات'],['ai','اختبارات إجابات الذكاء الاصطناعي'],['conversions','الاستفسارات والتحويلات']];
export default function VisibilityDashboard({secret}:{secret:string}){
 const [section,setSection]=useState<Section>('pages');
 const [rows,setRows]=useState<Result[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [lang,setLang]=useState('all');
 const [lastCheck,setLastCheck]=useState('');
 async function load(type:Section){
  setLoading(true);setError('');setMessage('');
  try{
   const r=await fetch(`/api/admin/visibility?type=${type}`,{headers:{'x-admin-secret':secret},cache:'no-store'});
   const d=await r.json();
   if(!r.ok)throw new Error(d.error||'تعذر التحميل');
   setRows(d.results||[]);setMessage(d.message||'');setLastCheck(d.checked_at||'');
  }catch(e){setError(e instanceof Error?e.message:'حدث خطأ');setRows([])}
  finally{setLoading(false)}
 }
 useEffect(()=>{void load(section)},[section,secret]);
 const filtered=rows.filter(r=>lang==='all'||r.language===lang);
 const ok=filtered.filter(r=>r.status==='ok').length;
 const issues=filtered.filter(r=>r.status==='issue').length;
 const unverified=filtered.filter(r=>r.status==='unverified').length;
 return <div dir="rtl" className="space-y-5">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><h2 className="text-2xl font-bold text-slate-900">SEO & AI Visibility</h2><p className="text-sm text-slate-500">بيانات فعلية فقط، مع مصدر كل قياس وحالة الاتصال.</p></div>
   <button className="btn-secondary" disabled={loading} onClick={()=>void load(section)}>{loading?'جارٍ الفحص…':'تحديث البيانات'}</button>
  </div>
  <nav className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2" aria-label="أقسام الظهور">
   {sections.map(([id,label])=><button key={id} onClick={()=>setSection(id)} aria-current={section===id?'page':undefined} className={`rounded-xl border p-3 text-right font-semibold ${section===id?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-700 border-slate-200 hover:border-slate-400'}`}>{label}</button>)}
  </nav>
  {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{error}</p>}
  {section==='pages'?<section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 space-y-4">
   <div className="flex flex-wrap gap-3 justify-between items-center">
    <div><h3 className="text-lg font-bold">فحص عناوين الصفحات</h3><p className="text-xs text-slate-500">فحص HTTP لا يثبت فهرسة Google؛ يلزم Search Console لتأكيدها.</p></div>
    <select aria-label="تصفية اللغة" className="border rounded-lg p-2" value={lang} onChange={e=>setLang(e.target.value)}>
     <option value="all">كل اللغات</option><option value="ar">العربية</option><option value="en">الإنجليزية</option><option value="zh">الصينية</option>
    </select>
   </div>
   <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
    {([['الصفحات المفحوصة',filtered.length],['سليمة',ok],['تحتاج مراجعة',issues],['غير مؤكدة',unverified]] as const).map(([label,value])=><div key={label} className="rounded-lg bg-slate-50 p-3"><span className="text-xs">{label}</span><strong className="block text-xl">{value}</strong></div>)}
   </div>
   <p className="text-xs text-slate-500">آخر فحص: {lastCheck?new Date(lastCheck).toLocaleString('ar-SA'):'لم يُفحص بعد'} — المصدر: HTTP مباشر</p>
   <div className="overflow-x-auto"><table className="w-full text-sm text-right">
    <thead><tr className="border-b"><th className="p-2">الصفحة</th><th className="p-2">HTTP</th><th className="p-2">Canonical</th><th className="p-2">Hreflang</th><th className="p-2">الملاحظات</th></tr></thead>
    <tbody>{filtered.map(r=><tr key={r.url} className="border-b align-top">
     <td className="p-2 break-all"><a className="text-blue-700 underline" href={r.url} target="_blank" rel="noreferrer">{r.url}</a><div className="text-xs text-slate-500">{r.language}</div></td>
     <td className="p-2">{r.http_status??'غير مؤكد'}</td>
     <td className="p-2 break-all text-xs">{r.canonical||'غير موجود'}</td>
     <td className="p-2">{r.hreflang.map(h=>h.lang).join('، ')||'غير موجود'}</td>
     <td className="p-2">{r.errors.length?r.errors.join('؛ '):'لا أخطاء مكتشفة'}</td>
    </tr>)}</tbody>
   </table></div>
  </section>:<section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
   <h3 className="text-lg font-bold">{sections.find(([id])=>id===section)?.[1]}</h3>
   <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">{message||'لا تتوفر بيانات مؤكدة حاليًا.'}</p>
   {section==='queries'&&<p className="text-sm text-slate-600">بعد تفعيل Search Console الرسمي: الاستعلام واللغة والصفحة والظهور والنقرات ومتوسط الترتيب والنية التجارية ومقارنة الفترات.</p>}
   {section==='ai'&&<p className="text-sm text-slate-600">سجل الاختبار المطلوب: السؤال، اللغة، المحرك، وقت الاختبار، الإجابة، روابط الاستشهاد، حالة التحقق، ومعرّف الدليل.</p>}
   {section==='conversions'&&<p className="text-sm text-slate-600">ستُفصل نقرات واتساب والهاتف عن إرسال النماذج وعن العملاء المحتملين المؤكدين. لا يُحسب النقر عميلًا.</p>}
  </section>}
 </div>;
}
