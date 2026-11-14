'use client';
import React,{useEffect,useState} from 'react';
type Section='pages'|'queries'|'ai'|'conversions';
type QueryResult={query:string;clicks:number;impressions:number;ctr:number;position:number};
type Result={url:string;language:string;checked_at:string;http_status:number|null;canonical:string|null;hreflang:{lang:string;url:string}[];errors:string[];status:string};
const sections:[Section,string][]=[['pages','الفهرسة وصحة الصفحات'],['queries','الكلمات والاستعلامات'],['ai','اختبارات إجابات الذكاء الاصطناعي'],['conversions','الاستفسارات والتحويلات']];
export default function VisibilityDashboard({secret}:{secret:string}){
 const [section,setSection]=useState<Section>('pages');
 const [rows,setRows]=useState<Result[]>([]);
 const [queryRows,setQueryRows]=useState<QueryResult[]>([]);
 const [queryPeriod,setQueryPeriod]=useState('');
 const [queryDimension,setQueryDimension]=useState<'query'|'page'|'country'|'device'>('query');
 const [queryDays,setQueryDays]=useState(28);
 const [gscConnected,setGscConnected]=useState(false);
 const [querySummary,setQuerySummary]=useState<{clicks:number;impressions:number;ctr:number;position:number}|null>(null);
 const [gscProperty,setGscProperty]=useState('');
 const [history,setHistory]=useState<{rows:Array<{metric_date:string;clicks:number;impressions:number}>;alerts:Array<{message:string}>;last_sync:string|null;message?:string}|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [lang,setLang]=useState('all');
 const [lastCheck,setLastCheck]=useState('');
 async function connectGoogle(){
  setError('');
  try{
   const response=await fetch('/api/admin/google/start',{method:'POST',headers:{'x-admin-secret':secret}});
   const data=await response.json();
   if(!response.ok||!data.authorizationUrl)throw new Error(data.error||'تعذر بدء التفويض');
   window.location.assign(data.authorizationUrl);
  }catch(e){setError(e instanceof Error?e.message:'تعذر بدء التفويض')}
 }
 async function load(type:Section){
  setLoading(true);setError('');setMessage('');
  try{
   const r=await fetch(`/api/admin/visibility?type=${type}${type==='queries'?`&dimension=${queryDimension}&days=${queryDays}`:''}`,{headers:{'x-admin-secret':secret},cache:'no-store'});
   const d=await r.json();
   if(!r.ok)throw new Error(d.message||d.error||'تعذر التحميل');
   setGscConnected(type==='queries'&&d.connected===true);setQuerySummary(type==='queries'?(d.summary||null):null);setGscProperty(d.property||'');setRows(d.results||[]);setQueryRows(type==='queries'?(d.rows||[]):[]);setQueryPeriod(d.startDate&&d.endDate?d.startDate+' — '+d.endDate:'');setMessage(d.message||(type==='queries'&&d.connected?'متصل بـ Google Search Console':'غير متصل'));setLastCheck(d.checked_at||'');
  }catch(e){setError(e instanceof Error?e.message:'حدث خطأ');setRows([]);setQueryRows([]);setGscConnected(false);setQuerySummary(null)}
  finally{setLoading(false)}
 }
 useEffect(()=>{void load(section)},[section,secret,queryDimension,queryDays]);
 useEffect(()=>{if(section!=='queries')return;let active=true;fetch('/api/admin/gsc-history',{headers:{'x-admin-secret':secret},cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(active)setHistory(d)}).catch(()=>{if(active)setHistory(null)});return()=>{active=false}},[section,secret]);
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
  {section==='queries'&&<div className="rounded-xl border border-slate-200 bg-white p-4"><button className="btn-secondary" onClick={()=>void connectGoogle()}>ربط حساب Google Search Console</button><p className="mt-2 text-xs text-slate-600">ستنتقل إلى Google لمنح صلاحية القراءة فقط. التفويض محفوظ مشفرًا في متصفح الإدارة لمدة تصل إلى 30 يومًا؛ يجب الربط مجددًا عند تغيير المتصفح أو حذف الكوكيز.</p></div>}
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
   {section==='queries'&&<div className="space-y-3">
    <div className="flex flex-wrap items-center gap-3 text-sm">
     <span className={gscConnected?'text-green-700 font-semibold':'text-slate-600'}>{gscConnected?'● متصل بـ Google Search Console':'○ لم يتأكد الاتصال'}</span>
     {gscProperty&&<span className="break-all text-xs text-slate-500" dir="ltr">{gscProperty}</span>}
     <label>الفترة <select aria-label="فترة أداء البحث" value={queryDays} onChange={e=>setQueryDays(Number(e.target.value))} className="border rounded-lg p-2"><option value={7}>7 أيام</option><option value={28}>28 يومًا</option><option value={90}>90 يومًا</option></select></label>
     <label>التصنيف <select aria-label="تصنيف بيانات البحث" value={queryDimension} onChange={e=>setQueryDimension(e.target.value as typeof queryDimension)} className="border rounded-lg p-2"><option value="query">الكلمات المفتاحية</option><option value="page">الصفحات</option><option value="country">البلدان</option><option value="device">الأجهزة</option></select></label>
    </div>
    {gscConnected&&<div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
     {([['النقرات',querySummary?.clicks.toLocaleString('ar-SA')??'0'],['مرات الظهور',querySummary?.impressions.toLocaleString('ar-SA')??'0'],['CTR',querySummary?(querySummary.ctr*100).toFixed(2)+'%':'—'],['متوسط الترتيب',querySummary?querySummary.position.toFixed(1):'—']] as const).map(([label,value])=><div key={label} className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-600">{label}</span><strong className="block text-xl">{value}</strong></div>)}
    </div>}
    {history&&<div className="rounded-lg border border-slate-200 p-3 space-y-2"><h4 className="font-semibold">المراقبة اليومية المحفوظة</h4><p className="text-xs text-slate-500">آخر مزامنة: {history.last_sync?new Date(history.last_sync).toLocaleString('ar-SA'):'لم تبدأ بعد'}</p>{history.message&&<p className="text-sm">{history.message}</p>}{history.alerts.map((a,i)=><p key={i} role="alert" className="text-amber-800">{a.message}</p>)}{history.rows.length>0&&<div className="overflow-x-auto"><table className="w-full text-sm text-right"><thead><tr><th>اليوم</th><th>النقرات</th><th>الظهور</th></tr></thead><tbody>{history.rows.slice(0,14).map(r=><tr key={r.metric_date}><td>{r.metric_date}</td><td>{r.clicks}</td><td>{r.impressions}</td></tr>)}</tbody></table></div>}</div>}
    {gscConnected&&queryRows.length===0&&<p role="status" className="rounded-lg bg-blue-50 p-3 text-blue-900">الاتصال ناجح، لكن Google لا يعرض بيانات لهذا التصنيف والفترة حتى الآن. هذا طبيعي للمواقع الجديدة.</p>}
   </div>}
   {section==='queries'&&queryRows.length>0&&<div className="overflow-x-auto"><p className="text-xs text-slate-500 mb-2">المصدر: Google Search Console — الفترة: {queryPeriod}</p><table className="w-full text-sm text-right"><thead><tr className="border-b"><th className="p-2">{({query:'الاستعلام',page:'الصفحة',country:'البلد',device:'الجهاز'} as const)[queryDimension]}</th><th className="p-2">النقرات</th><th className="p-2">الظهور</th><th className="p-2">CTR</th><th className="p-2">متوسط الموضع</th></tr></thead><tbody>{queryRows.map((q,i)=><tr key={q.query+'-'+i} className="border-b"><td className="p-2">{q.query}</td><td className="p-2">{q.clicks}</td><td className="p-2">{q.impressions}</td><td className="p-2">{(q.ctr*100).toFixed(2)}%</td><td className="p-2">{q.position.toFixed(1)}</td></tr>)}</tbody></table></div>}
   {section==='queries'&&<p className="text-xs text-slate-500">المصدر: Google Search Console API. البيانات قد تتأخر عدة أيام. فحص HTTP لا يثبت الفهرسة؛ تقارير فهرسة Google تُراجع من Search Console.</p>}
   {section==='ai'&&<p className="text-sm text-slate-600">سجل الاختبار المطلوب: السؤال، اللغة، المحرك، وقت الاختبار، الإجابة، روابط الاستشهاد، حالة التحقق، ومعرّف الدليل.</p>}
   {section==='conversions'&&<p className="text-sm text-slate-600">ستُفصل نقرات واتساب والهاتف عن إرسال النماذج وعن العملاء المحتملين المؤكدين. لا يُحسب النقر عميلًا.</p>}
  </section>}
 </div>;
}
