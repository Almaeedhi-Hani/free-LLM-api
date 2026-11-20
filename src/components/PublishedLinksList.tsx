'use client';
import React,{useEffect,useMemo,useState} from 'react';
import type {EditorialItem} from '@/lib/editorial-types';
import type {ContentFAQ,ContentDraft} from '@/lib/content-store';
import {buildPublishedLinks,buildUnpublishedPreviews} from '@/lib/published-links';
import type {PublicationEventSummary} from '@/lib/published-links';

type Props={editorialItems:EditorialItem[];faqs:ContentFAQ[];drafts:ContentDraft[];adminSecret:string};
const LANG:Record<string,string>={ar:'العربية',en:'English',zh:'中文'};
const KIND:Record<string,string>={
 home:'الرئيسية',trust:'الثقة',service:'خدمة',packages:'الباقات',guide:'دليل',
 comparison:'مقارنة',faq:'سؤال شائع'
};
const date=(value:string|null)=>value?new Date(value).toLocaleString('ar-SA'):'غير معروف';

export default function PublishedLinksList({editorialItems,faqs,drafts,adminSecret}:Props){
 const [events,setEvents]=useState<PublicationEventSummary[]>([]);
 const [eventState,setEventState]=useState('جارٍ فحص أحداث النشر المحفوظة…');
 const [search,setSearch]=useState('');
 const [language,setLanguage]=useState('all');
 const [kind,setKind]=useState('all');
 const [source,setSource]=useState('all');
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/admin/geo-publication',{headers:{'x-admin-secret':adminSecret},
   cache:'no-store',signal:controller.signal})
   .then(async res=>{
    if(!res.ok)throw Error('HTTP '+res.status);
    const data=await res.json();
    if(data.available!==true||!Array.isArray(data.events))throw Error('الأحداث غير متاحة');
    setEvents(data.events as PublicationEventSummary[]);
    setEventState('أحداث النشر الآلي المعروضة أحدث 30 حدثًا فقط؛ المصدر الحالي للمنشور هو content_store.');
   }).catch(e=>{if(!controller.signal.aborted)setEventState('أحداث النشر غير متاحة ('+
     (e instanceof Error?e.message:'خطأ')+'). الروابط مستندة إلى المحتوى الحالي دون تخمين مصدر النشر.')});
  return ()=>controller.abort();
 },[adminSecret]);
 const published=useMemo(()=>buildPublishedLinks(editorialItems||[],faqs||[],events),
  [editorialItems,faqs,events]);
 const unpublished=useMemo(()=>buildUnpublishedPreviews(editorialItems||[],drafts||[]),
  [editorialItems,drafts]);
 const visible=published.filter(item=>
  (language==='all'||item.language===language)&&
  (kind==='all'||item.kind===kind)&&
  (source==='all'||item.publicationSource===source)&&
  (!search.trim()||[item.title,item.kind,item.path,LANG[item.language]].join(' ')
   .toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
 return <section dir="rtl" className="min-w-0 space-y-5" aria-label="المحتوى المنشور: الروابط">
  <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
   <h2 className="text-xl font-bold text-navy-900">المحتوى المنشور: الروابط</h2>
   <p className="mt-2 text-sm text-slate-600">تُعرض العناصر الموجودة فعلًا في المحتوى المعتمد الذي تستخدمه الصفحات العامة. لا تتحول معاينات أو أحداث تاريخية إلى صفحات منشورة.</p>
   <p className="mt-2 text-sm font-semibold text-emerald-800" role="status">
    عدد العناصر المنشورة المؤكدة في المصدر: {published.length} — نتائج التصفية: {visible.length}
   </p>
   <p className="mt-2 text-xs text-slate-600" role="status">{eventState}</p>
   <p className="mt-1 text-xs text-slate-500">أسئلة FAQ تظهر ضمن الصفحة الرئيسية العربية وليست صفحات منفصلة. قد تشترك أكثر من مادة تحريرية في رابط صفحة واحدة. تاريخ النشر غير المثبت يظهر «غير معروف».</p>
  </header>
  <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
   <label className="text-sm font-semibold text-slate-700">بحث
    <input aria-label="بحث في روابط المحتوى المنشور" value={search} onChange={e=>setSearch(e.target.value)}
      placeholder="العنوان أو الرابط…" className="mt-1 w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm"/>
   </label>
   <label className="text-sm font-semibold text-slate-700">اللغة
    <select aria-label="تصفية لغة الروابط المنشورة" value={language} onChange={e=>setLanguage(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
     <option value="all">جميع اللغات</option><option value="ar">العربية</option><option value="en">English</option><option value="zh">中文</option>
    </select>
   </label>
   <label className="text-sm font-semibold text-slate-700">النوع
    <select aria-label="تصفية نوع المحتوى المنشور" value={kind} onChange={e=>setKind(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
     <option value="all">كل الأنواع</option>
     {Object.entries(KIND).map(([key,label])=><option key={key} value={key}>{label}</option>)}
    </select>
   </label>
   <label className="text-sm font-semibold text-slate-700">مصدر النشر
    <select aria-label="تصفية مصدر النشر" value={source} onChange={e=>setSource(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
     <option value="all">جميع المصادر</option><option value="آلي">آلي</option>
     <option value="يدوي">يدوي</option><option value="غير معروف">غير معروف</option>
    </select>
   </label>
  </div>
  <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
   {visible.map(item=><article key={item.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <h3 className="break-words font-semibold text-navy-900">{item.title}</h3>
    <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:text-sm">
     <div><dt className="text-slate-500">اللغة</dt><dd className="font-medium">{LANG[item.language]}</dd></div>
     <div><dt className="text-slate-500">النوع</dt><dd className="font-medium">{KIND[item.kind]||item.kind}</dd></div>
     <div><dt className="text-slate-500">تاريخ النشر / الاعتماد</dt><dd className="font-medium">{date(item.publishedAt)}</dd></div>
     <div><dt className="text-slate-500">المصدر</dt><dd className="font-medium">{item.publicationSource}</dd></div>
    </dl>
    <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
     <code className="max-w-full break-all text-xs text-slate-600" dir="ltr">{item.path}</code>
     <a href={item.path} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs" aria-label={'فتح المحتوى المنشور: '+item.title}>فتح الرابط / معاينة المنشور</a>
    </div>
   </article>)}
  </div>
  {visible.length===0&&<p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">لا توجد عناصر منشورة تطابق معايير البحث. لا تعني النتيجة الصفرية عدم وجود سجلات.</p>}
  <details id="unpublished-previews" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
   <summary className="cursor-pointer font-semibold text-navy-900">معاينة مسودات غير منشورة ({unpublished.length})</summary>
   <p className="mt-3 text-xs text-amber-800">معاينة نصية خاصة بالإدارة؛ لا تُنشأ روابط عامة للمسودات ولا تُخلط مع المحتوى المنشور.</p>
   <ul className="mt-3 space-y-2">{unpublished.map(item=><li key={item.id} className="rounded-lg bg-slate-50 p-3 text-sm">
    <div className="font-semibold">{item.title}</div><div className="mt-1 text-xs text-slate-500">{item.kind} · {item.language} · {item.status}</div>
    <p className="mt-2 whitespace-pre-wrap break-words text-slate-600">{item.preview.slice(0,600)}</p>
   </li>)}</ul>
   {unpublished.length===0&&<p className="mt-2 text-sm text-slate-500">لا توجد مسودات انتظار متاحة للمعاينة.</p>}
  </details>
 </section>;
}
