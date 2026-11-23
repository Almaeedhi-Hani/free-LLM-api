'use client';
import React,{useEffect,useMemo,useState} from 'react';
import type {EditorialItem} from '@/lib/editorial-types';
import type {ContentFAQ,ContentDraft} from '@/lib/content-store';
import {buildImpactInventory} from '@/lib/content-impact';
import GeoImpactExperiments from '@/components/GeoImpactExperiments';
import GeoWorkPriorities from '@/components/GeoWorkPriorities';
import type {ImpactItem,ImpactMeasurement,ImpactStats} from '@/lib/content-impact';

type Props={
 editorialItems:EditorialItem[];faqs:ContentFAQ[];drafts:ContentDraft[];
 adminSecret:string;saving:boolean;
 onSaveItems:(items:EditorialItem[])=>Promise<boolean>;
 onSaveDrafts:(items:ContentDraft[])=>Promise<boolean>;
 onNavigate:(tab:'editorial'|'reviews'|'content'|'visibility'|'published_links')=>void;
  publishedLinksEnabled?:boolean;
};
const kinds:Record<string,string>={
 home:'الرئيسية',service:'خدمة',packages:'الباقات',guide:'دليل',comparison:'مقارنة',
 trust:'الثقة',technical_seo:'SEO تقني',internal_link:'ربط داخلي',faq:'سؤال منشور',faq_draft:'مسودة سؤال'
};
const statuses:Record<string,string>={published:'منشور',pending:'بانتظار المراجعة',
 rejected:'مرفوض / مؤرشف',approved_unlinked:'معتمد وغير ظاهر ضمن FAQ'};
const langs:Record<string,string>={ar:'العربية',en:'الإنجليزية',zh:'الصينية',und:'غير محددة'};
const number=(v:number)=>v.toLocaleString('ar-SA');
const date=(v:string|null)=>v&&!Number.isNaN(Date.parse(v))?new Date(v).toLocaleString('ar-SA'):'غير متوفر';
const metric=(value:number|null|undefined)=>value===null||value===undefined?'—':number(value);
export default function ContentImpactCenter({
 editorialItems,faqs,drafts,adminSecret,saving,onSaveItems,onSaveDrafts,onNavigate,publishedLinksEnabled=false
}:Props){
 const [search,setSearch]=useState('');
 const [category,setCategory]=useState('all');
 const [status,setStatus]=useState('all');
 const [language,setLanguage]=useState('all');
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [days,setDays]=useState<7|28|90>(28);
 const [measurement,setMeasurement]=useState<ImpactMeasurement|null>(null);
 const [loading,setLoading]=useState(false);
 const [measureError,setMeasureError]=useState('');
 const [mutationError,setMutationError]=useState('');
 const [autoStatus,setAutoStatus]=useState<{enabled:boolean;allow_high_risk:boolean;daily_limit:number;available:boolean;events:Array<{
   id:string;item_id:string;target_path:string;risk_level:string;kind:'faq'|'editorial';status:string;published_at:string;rolled_back_at:string|null
 }> }|null>(null);
 const [autoBusy,setAutoBusy]=useState(false);
 const [autoNotice,setAutoNotice]=useState('');
 const [autoLimit,setAutoLimit]=useState(1);
 useEffect(()=>{
  let active=true;
  fetch('/api/admin/geo-publication',{headers:{'x-admin-secret':adminSecret},cache:'no-store'})
   .then(async response=>{const value=await response.json();if(!response.ok)throw Error('Publication settings unavailable');return value})
   .then(data=>{if(active){setAutoStatus(data);setAutoLimit(data.daily_limit)}})
   .catch(()=>{if(active)setAutoNotice('حالة النشر الآلي غير متاحة؛ يُعامل النظام على أنه معطل.')});
  return()=>{active=false};
 },[adminSecret]);
 const autoAction=async(payload:Record<string,unknown>)=>{
  if(autoBusy)return;
  setAutoBusy(true);setAutoNotice('');
  try{
   const response=await fetch('/api/admin/geo-publication',{
    method:'POST',headers:{'x-admin-secret':adminSecret,'Content-Type':'application/json'},
    body:JSON.stringify(payload),cache:'no-store'
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.error||result.message||result.status||'تعذر تنفيذ طلب النشر');
   const read=await fetch('/api/admin/geo-publication',{headers:{'x-admin-secret':adminSecret},cache:'no-store'});
   if(!read.ok)throw Error('تعذر تأكيد إعدادات النشر بعد التغيير');
   const updated=await read.json();setAutoStatus(updated);setAutoLimit(updated.daily_limit);
   setAutoNotice(payload.action==='dry_run'?
    'المحاكاة: '+(result.message||'لا توجد عناصر مؤهلة للنشر'):
    payload.action==='rollback'?'استُعيدت النسخة السابقة. حدّث قائمة المحتوى لرؤية الحالة.':
    payload.action==='configure_sensitive'?'تم حفظ صلاحية النشر الآلي للمحتوى الحساس.':
    'تم حفظ سياسة النشر الآلي وتأكيدها من الخادم.');
  }catch(e){setAutoNotice(e instanceof Error?e.message:'تعذر حفظ التغيير')}
  finally{setAutoBusy(false)}
 };
 const changeAuto=async(enabled:boolean)=>{
  if(enabled&&!window.confirm('تفعيل النشر التلقائي للأدلة التي تجتاز التحقق مع حد يومي وسجل وتراجع؟ المحتوى الحساس يتطلب إذنًا منفصلًا.'))return;
  if(!enabled&&!window.confirm('إيقاف جميع عمليات النشر الآلي القادمة؟'))return;
  await autoAction({action:'configure',enabled,daily_limit:autoLimit,
   ...(enabled?{confirm:'ENABLE_GUARDED_AUTOMATIC_PUBLICATION'}:{})});
 };

 const changeSensitive=async(allow:boolean)=>{
  if(allow){
   if(!window.confirm('السماح بالنشر التلقائي لمحتوى استثماري أو نظامي حساس قد يؤثر على قرارات العملاء. هل تريد تفعيله؟'))return;
   if(!window.confirm('تأكيد إضافي: سيُنشر المحتوى الحساس آليًا حتى دون مرجع حكومي إلزامي، مع حفظ حالة التوثيق داخليًا وإمكانية التراجع وحد النشر اليومي.'))return;
  }else if(!window.confirm('إيقاف النشر التلقائي للمحتوى الحساس؟ يبقى النشر منخفض المخاطر وفق الإعداد الآخر.'))return;
  await autoAction({action:'configure_sensitive',allow_high_risk:allow,
   ...(allow?{confirm:'ENABLE_AUTONOMOUS_SENSITIVE_CONTENT',
    acknowledge:'UNDERSTAND_SOURCE_VERIFICATION_LIMITS'}:{})});
 };

 const rows=useMemo(()=>buildImpactInventory(editorialItems||[],faqs||[],drafts||[]),[editorialItems,faqs,drafts]);
 const filtered=rows.filter(x=>(category==='all'||x.category===category)&&
  (status==='all'||x.status===status)&&(language==='all'||x.lang===language)&&
  (!search.trim()||[x.title,x.summary,x.kind,x.targetPath||''].join(' ').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
 const selected=rows.find(x=>x.id===selectedId)||null;
 useEffect(()=>{
  let active=true;
  const controller=new AbortController();
  setLoading(true);setMeasureError('');setMeasurement(null);
  fetch('/api/admin/content-impact?days='+days,{headers:{'x-admin-secret':adminSecret},
   cache:'no-store',signal:controller.signal}).then(async response=>{
   const json=await response.json();
   if(!response.ok)throw Error(json.message||'تعذر الحصول على قياسات GSC');
   if(active)setMeasurement(json as ImpactMeasurement);
  }).catch(error=>{if(active&&error.name!=='AbortError')setMeasureError(error.message||'قياسات GSC غير متاحة')})
   .finally(()=>{if(active)setLoading(false)});
  return ()=>{active=false;controller.abort()};
 },[adminSecret,days]);
 const measuredPages=measurement?.status==='available'?Object.values(measurement.pages):[];
 const sumClicks=measuredPages.reduce((a,v)=>a+v.clicks,0);
 const sumViews=measuredPages.reduce((a,v)=>a+v.impressions,0);
 const counted=measuredPages.length>0;
 const confirmedLeads=measurement?.leads?.status==='available'?measurement.leads.total:null;
 const facts=[
  {name:'المقترحات والصفحات',value:rows.filter(x=>x.category==='page').length},
  {name:'الأسئلة والمسودات',value:rows.filter(x=>x.category==='faq').length},
  {name:'محتوى منشور',value:rows.filter(x=>x.status==='published').length},
  {name:'بانتظار المراجعة',value:rows.filter(x=>x.status==='pending').length}
 ];
 const visibleMeasure=(item:ImpactItem):ImpactStats|null=>{
  if(item.category!=='page'||item.status!=='published'||!item.targetPath)return null;
  return measurement?.pages[item.targetPath]||null;
 };
 const deleteUnpublished=async(item:ImpactItem)=>{
  if(saving||item.status==='published'||item.status==='approved_unlinked'){
   setMutationError('ألغِ نشر الصفحة أولًا أو افتح تبويب إدارة الأسئلة قبل حذف المحتوى المنشور.');return;
  }
  if(!window.confirm('هل تريد حذف هذا المحتوى غير المنشور؟ لا يمكن التراجع عن الحذف.'))return;
  if(!window.confirm('تأكيد أخير: حذف نهائي للمقترح غير المنشور؟'))return;
  setMutationError('');
  let ok=false;
  if(item.itemId!==null)ok=await onSaveItems(editorialItems.filter(e=>e.id!==item.itemId));
  else if(item.draftIndex!==null)ok=await onSaveDrafts(drafts.filter((_,i)=>i!==item.draftIndex));
  if(ok)setSelectedId(null);
  else setMutationError('تعذر الحذف. حدّث البيانات ثم حاول من صفحة المراجعة.');
 };
 const archiveEditorial=async(item:ImpactItem)=>{
  if(saving||item.status!=='published'||item.itemId===null)return;
  if(!window.confirm('إلغاء نشر الصفحة أو القسم المنشور مع الاحتفاظ بالمقترح وبيانات القياس؟'))return;
  setMutationError('');
  const next=editorialItems.map(e=>e.id===item.itemId?
   {...e,status:'rejected' as const,updatedAt:new Date().toISOString()}:e);
  if(!await onSaveItems(next))setMutationError('تعذر إلغاء النشر. راجع سجل الحفظ.');
 };
 const localPath=selected?.targetPath;
 return <div className="space-y-5" dir="rtl">
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-label="التحكم بالنشر الآلي">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h3 className="font-bold text-navy-900">النشر الآلي المحكوم بالمصادر</h3>
     <p className="mt-1 text-sm text-slate-600">النشر التلقائي يشمل صفحات المحتوى والأسئلة الجاهزة، دون اشتراط مصدرين حكوميين أو منع المحتوى بسبب مستوى المخاطر. الروابط البحثية اختيارية وتظهر بوضوح كمراجع غير متحققة، مع سجل للإصدارات والتراجع.</p></div>
    <span className={autoStatus?.enabled?'text-sm font-bold text-emerald-800':'text-sm font-bold text-amber-800'}>
     {autoStatus?.enabled?'مفعّل':'متوقف'}
    </span>
   </div>
   <div className="mt-4 flex flex-wrap items-center gap-3">
    <label htmlFor="geo-publish-limit" className="text-sm">الحد الأقصى يوميًا:</label>
    <select id="geo-publish-limit" className="rounded-lg border border-slate-300 p-2 text-sm"
     value={autoLimit} onChange={e=>setAutoLimit(Number(e.target.value))} disabled={!autoStatus?.available||autoBusy}>
      {Array.from({length:10},(_,index)=>index+1).map(limit=><option key={limit} value={limit}>{limit}</option>)}
    </select>
    <button className="btn-secondary text-xs" disabled={!autoStatus?.available||autoBusy}
      onClick={()=>void autoAction({action:'dry_run'})}>محاكاة دون نشر</button>
    <button className="btn-secondary text-xs" disabled={!autoStatus?.available||autoBusy}
      onClick={()=>void changeAuto(!autoStatus?.enabled)}>
     {autoStatus?.enabled?'إيقاف النشر الآلي':'تفعيل النشر الآلي'}
    </button>
    {autoStatus?.enabled&&autoLimit!==autoStatus.daily_limit&&<button className="btn-secondary text-xs"
      disabled={autoBusy} onClick={()=>void autoAction({action:'configure',enabled:true,daily_limit:autoLimit,
       confirm:'ENABLE_GUARDED_AUTOMATIC_PUBLICATION'})}>حفظ الحد اليومي</button>}
   </div>
   <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
    <div className="min-w-0 flex-1">
     <p className="text-sm font-semibold text-amber-950">النشر الآلي للمحتوى الحساس وعالي المخاطر</p>
     <p className="text-xs text-amber-900">إذن مستقل للمحتوى الحساس؛ لا يلزم مصدران حكوميان. قد تكون المصادر غير متحققة؛ تُحفظ حالة التوثيق وسجل النشر داخل لوحة الإدارة للمراجعة الداخلية.</p>
    </div>
    <button className="btn-secondary text-xs" disabled={!autoStatus?.available||autoBusy}
     onClick={()=>void changeSensitive(!autoStatus?.allow_high_risk)}>
     {autoStatus?.allow_high_risk?'تعطيل نشر المحتوى الحساس':'السماح بالنشر الآلي للحساس'}
    </button>
   </div>
   {autoNotice&&<p className="mt-3 text-sm text-slate-700" role="status">{autoNotice}</p>}
   {!autoStatus?.available&&<p className="mt-2 text-sm text-amber-900">يلزم اكتمال تهيئة سجل النشر في Supabase قبل التفعيل.</p>}
   <div className="mt-4 space-y-2"><h4 className="font-semibold text-sm">سجل النشر الآلي والاستعادة</h4>
    {(autoStatus?.events||[]).slice(0,10).map(ev=><div key={ev.id} className="rounded-lg border bg-slate-50 p-3 text-xs flex flex-wrap items-center justify-between gap-2">
      <div><span dir="ltr" className="inline-block">{ev.target_path}</span>
       <p className="text-slate-600">{ev.status==='rolled_back'?'تم التراجع':'منشور تلقائيًا'} · {ev.kind==='faq'?'سؤال شائع':'صفحة محتوى'} · مستوى المخاطر: {ev.risk_level||'غير محدد'} · {date(ev.published_at)}</p></div>
      {ev.status==='published'&&<button className="btn-secondary text-xs" disabled={autoBusy}
       onClick={()=>{if(window.confirm('استعادة النسخة السابقة لهذا المحتوى فقط؟ سيرفض النظام العملية إذا تغيرت النسخة بعد نشرها.'))
        void autoAction({action:'rollback',event_id:ev.id,kind:ev.kind,confirm:'ROLLBACK_GEO_PUBLICATION'});}}>تراجع عن النشر</button>}
    </div>)}
    {autoStatus?.events.length===0&&<p className="text-sm text-slate-500">لا توجد عمليات نشر تلقائي مسجلة بعد.</p>}
   </div>
  </section>
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div><h2 className="text-xl font-bold text-navy-900">مركز المحتوى والأثر الذكي</h2>
     <p className="mt-1 text-sm text-slate-600">صفحات GEO والأسئلة والمسودات في قائمة واحدة، مع معاينة المحتوى وقياسات موثقة إن توفرت.</p></div>
    <button className="btn-secondary text-sm" onClick={()=>onNavigate('visibility')}>لوحة Google والظهور</button>
   </div>
   <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
    <strong>حالة النشر: {autoStatus?.enabled?'النشر الآلي المحكوم مفعّل':'المراجعة البشرية — النشر الآلي متوقف'}.</strong> المحتوى الحساس {autoStatus?.allow_high_risk?'مسموح بالنشر الآلي دون شرط مرجع حكومي':'يتطلب تفعيل إذن مستقل'}؛ مع توضيح حالة التوثيق وإبقاء المحتوى غير المكتمل كمسودة.
   </div>
   <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
    {facts.map(f=><div key={f.name} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-600">{f.name}</p><p className="mt-1 text-2xl font-bold text-navy-900">{number(f.value)}</p>
    </div>)}
   </div>
   <div className="mt-4 flex flex-wrap items-center gap-2">
     <label className="text-sm font-semibold" htmlFor="impact-days">الفترة:</label>
     <select id="impact-days" value={days} onChange={e=>setDays(Number(e.target.value) as 7|28|90)}
       className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
       <option value={7}>7 أيام</option><option value={28}>28 يومًا</option><option value={90}>90 يومًا</option>
     </select>
     <span className="text-xs text-slate-500">مصدر الأرقام: لقطات GSC المحفوظة بأبعاد الصفحة فقط</span>
   </div>
   <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-live="polite">
    {[
      {label:'مرات الظهور المرصودة',value:counted?number(sumViews):'—'},
      {label:'النقرات المرصودة',value:counted?number(sumClicks):'—'},
      {label:'CTR للصفحات المقاسة',value:counted&&sumViews>0?(100*sumClicks/sumViews).toFixed(2)+'%':'—'},
      {label:'طلبات العملاء المحفوظة',value:metric(confirmedLeads)}
     ].map(card=><div key={card.label} className="rounded-xl bg-slate-100 p-3">
      <p className="text-xs text-slate-600">{card.label}</p><p className="mt-1 text-xl font-bold">{card.value}</p></div>)}
   </div>
   {loading&&<p className="mt-3 text-sm text-slate-600" role="status">جارٍ قراءة القياسات المحفوظة...</p>}
   {measureError&&<p className="mt-3 text-sm text-amber-900" role="status">{measureError}؛ لا نعرض صفرًا بديلًا عن البيانات المفقودة.</p>}
   {measurement&&<p className="mt-3 text-sm text-slate-600" role="status">{measurement.message} {measurement.leads?.message||'بيانات الطلبات غير متاحة.'} قياسات ظهور AI لم تتصل بعد، ولا ننسب أداء الصفحة إلى سؤال FAQ منفرد.</p>}
  </section>
  <GeoWorkPriorities items={rows} measurement={measurement} loading={loading}
   onPreview={setSelectedId} onVisibility={()=>onNavigate('visibility')}/>
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
   <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-4">
    <input aria-label="بحث في المحتوى" value={search} onChange={e=>setSearch(e.target.value)}
      placeholder="عنوان الصفحة أو السؤال..." className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-1"/>
    <select aria-label="نوع المحتوى" value={category} onChange={e=>setCategory(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
      <option value="all">كل الأنواع</option><option value="page">صفحات ومحتوى</option><option value="faq">الأسئلة</option><option value="task">مهام SEO</option>
    </select>
    <select aria-label="حالة المحتوى" value={status} onChange={e=>setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
      <option value="all">كل الحالات</option><option value="published">منشور</option><option value="pending">بانتظار المراجعة</option><option value="rejected">مرفوض / مؤرشف</option><option value="approved_unlinked">معتمد وغير مرتبط</option>
    </select>
    <select aria-label="لغة المحتوى" value={language} onChange={e=>setLanguage(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
      <option value="all">جميع اللغات</option><option value="ar">العربية</option><option value="en">الإنجليزية</option><option value="zh">الصينية</option><option value="und">غير محددة</option>
    </select>
   </div>
   <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="سجل المحتوى">
    <table className="w-full min-w-[800px] text-right text-sm">
     <thead className="border-b bg-slate-50 text-slate-700"><tr>
      <th className="p-3">المحتوى</th><th className="p-3">النوع / اللغة</th><th className="p-3">الحالة</th>
      <th className="p-3">نقرات / ظهور</th><th className="p-3">طلبات مؤكدة</th><th className="p-3">إنشاء / تعديل</th><th className="p-3">الإجراءات</th>
     </tr></thead>
     <tbody>{filtered.map(item=>{
      const m=visibleMeasure(item);
      return <tr key={item.id} className="border-b align-top">
       <td className="p-3"><p className="font-semibold text-slate-900">{item.title}</p><p className="mt-1 max-w-xs truncate text-xs text-slate-500" dir="auto">{item.targetPath||item.summary}</p></td>
       <td className="p-3">{kinds[item.kind]||item.kind}<p className="text-xs text-slate-500">{langs[item.lang]}</p></td>
       <td className="p-3">{statuses[item.status]||item.status}<p className="text-xs text-slate-500">{item.origin==='manual_or_legacy'?'يدوي / قديم':'مقترح GEO'}</p></td>
       <td className="p-3">{m?metric(m.clicks)+' / '+metric(m.impressions):'—'}<p className="text-xs text-slate-500">{m?'قياسات صفحة':'لا توجد بيانات منسوبة'}</p></td>
       <td className="p-3">{measurement?.leads?.status==='available'&&item.status==='published'&&item.category==='page'&&item.targetPath?
        metric(measurement.leads.byPage[item.targetPath]?.total||0):'—'}
        <p className="text-xs text-slate-500">إحالة المتصفح؛ ليست دليل سببية</p></td>
       <td className="p-3 text-xs">{date(item.createdAt)}<p className="text-slate-500">{date(item.updatedAt)}</p></td>
       <td className="p-3">
        <div className="flex flex-wrap gap-2">
         <button className="btn-secondary text-xs" onClick={()=>setSelectedId(item.id)}>معاينة وتفاصيل</button>
         {item.status==='published'&&item.targetPath&&(publishedLinksEnabled?
           <button type="button" className="btn-secondary text-xs" onClick={()=>onNavigate('published_links')}>عرض في شاشة الروابط</button>:
           <a className="btn-secondary text-xs" href={item.targetPath} target="_blank" rel="noopener noreferrer">فتح الصفحة</a>)}
        </div>
       </td>
      </tr>;
     })}</tbody>
    </table>
   </div>
   {filtered.length===0&&<p className="py-5 text-center text-sm text-slate-600">لا يوجد محتوى مطابق للبحث.</p>}
   <p className="mt-3 text-xs text-slate-500">المحتوى الفني والنسخ المقترحة ليست صفحات منشورة حتى اعتمادها. قياسات FAQ لا يمكن فصلها عن الصفحة المضيفة باستخدام GSC وحده.</p>
  </section>
  <GeoImpactExperiments adminSecret={adminSecret} days={days}/>
  {selected&&<section className="rounded-2xl border-2 border-blue-200 bg-white p-4 shadow-sm sm:p-6" aria-label="معاينة المحتوى التفصيلية">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-lg font-bold text-slate-900">{selected.title}</h3><p className="text-xs text-slate-500">{kinds[selected.kind]||selected.kind} · {statuses[selected.status]} · {langs[selected.lang]}</p></div>
      <button className="btn-secondary text-xs" onClick={()=>setSelectedId(null)}>إغلاق المعاينة</button>
    </div>
    <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{selected.summary}</p>
    <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-8 text-slate-900">{selected.body}</div>
    {(selected.sections||[]).map((s,i)=><div className="mt-3 border-r-2 border-blue-200 pr-3" key={i}>
      <h4 className="font-bold">{s.h2}</h4><p className="mt-1 whitespace-pre-wrap text-sm">{s.body}</p>
      {(s.subsections||[]).map((sub,j)=><div className="mt-2 pr-3" key={j}><h5 className="font-semibold">{sub.h3}</h5><p className="whitespace-pre-wrap text-sm">{sub.body}</p></div>)}
    </div>)}
    <div className="mt-4 grid gap-3 border-t pt-3 text-sm sm:grid-cols-2">
      <p><strong>الكلمة المستهدفة:</strong> {selected.primaryKeyword||'غير محددة'}</p>
      <p><strong>تاريخ الإنشاء:</strong> {date(selected.createdAt)}</p>
      <p><strong>المرجع / اللغة:</strong> {selected.targetPath||'غير منشور'} — {langs[selected.lang]}</p>
      <p><strong>المصادر الموثقة:</strong> {selected.verifiedSources.length||'لا توجد'}</p>
      <p><strong>أدلة الإنشاء:</strong> {selected.sourceIds.length||'لا توجد'}</p>
      <p><strong>طلبات الباقات المسجلة:</strong> {selected.targetPath&&measurement?.leads?.status==='available'?metric(measurement.leads.byPage[selected.targetPath]?.total||0):'غير متاحة'} (إسناد مساعد من المتصفح، وليس عملاء مدفوعين)</p>
    </div>
    {selected.verifiedSources.length>0&&<ul className="mt-2 space-y-1 text-xs">{selected.verifiedSources.map((url,i)=><li key={i}><a href={url} target="_blank" rel="noopener noreferrer" className="break-all text-blue-700 underline">{url}</a></li>)}</ul>}
    {mutationError&&<p role="alert" className="mt-3 text-sm text-red-700">{mutationError}</p>}
    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
      {selected.status==='published'&&selected.category==='page'&&localPath&&(publishedLinksEnabled?
        <button type="button" className="btn-primary text-xs" onClick={()=>{setSelectedId(null);onNavigate('published_links')}}>عرض في شاشة الروابط</button>:
        <a className="btn-primary text-xs" href={localPath} target="_blank" rel="noopener noreferrer">معاينة الصفحة المنشورة</a>)}
      <button className="btn-secondary text-xs" onClick={()=>onNavigate(selected.itemId!==null?'editorial':selected.faqIndex!==null?'content':'reviews')}>تعديل / مراجعة</button>
      {selected.status==='published'&&selected.itemId!==null&&<button className="btn-secondary text-xs" disabled={saving} onClick={()=>void archiveEditorial(selected)}>إلغاء النشر / أرشفة</button>}
      {selected.status!=='published'&&selected.status!=='approved_unlinked'&&<button className="btn-secondary text-xs text-red-700" disabled={saving} onClick={()=>void deleteUnpublished(selected)}>حذف نهائي</button>}
      {selected.status==='published'&&selected.category==='faq'&&<button className="btn-secondary text-xs" onClick={()=>onNavigate('content')}>إدارة السؤال / الحذف</button>}
    </div>
  </section>}
 </div>;
}
