'use client';
import React,{useMemo} from 'react';
import type {ImpactItem,ImpactMeasurement} from '@/lib/content-impact';
import {prioritizeGeoWork} from '@/lib/geo-work-priorities';

type Props={
 items:ImpactItem[];
 measurement:ImpactMeasurement|null;
 loading:boolean;
 onPreview:(itemId:string)=>void;
 onVisibility:()=>void;
};
const languageNames:Record<string,string>={ar:'العربية',en:'English',zh:'中文',und:'غير محددة'};
const actionNames={
 review_content:'مراجعة المقترح',
 technical_handoff:'مهمة تطوير عبر GitHub',
 review_faq:'مراجعة مسودة سؤال'
};
const number=(n:number)=>n.toLocaleString('ar-SA');
export default function GeoWorkPriorities({items,measurement,loading,onPreview,onVisibility}:Props){
 const priorities=useMemo(()=>prioritizeGeoWork(items,measurement),[items,measurement]);
 const observed=priorities.filter(p=>p.basis!=='unmeasured').length;
 const gscReady=measurement?.status==='available';
 const sourceMessage=loading?'جارٍ قراءة بيانات القياس...':
  !measurement?'لم تُحمّل بيانات القياس بعد. لا يمكن استنتاج أداء الصفحات.':
  !gscReady?'لم تصل قياسات صفحات GSC؛ يعرض النظام ترتيب تجهيز محتوى فقط، وليس أولوية مبنية على النقرات.':
  'يستند ترتيب العناصر المقاسة إلى بيانات صفحة مسجلة، ولا يثبت سببية النقرات أو الطلبات.';
 return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
  dir="rtl" aria-label="طابور أولويات GEO">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div>
    <h3 className="text-lg font-bold text-navy-900">طابور أولويات GEO — الأدلة أولًا</h3>
    <p className="mt-1 max-w-3xl text-sm text-slate-600">
     ترتيب تلقائي للمقترحات المحفوظة التي تنتظر تنفيذًا أو مراجعة. يُعاد حسابه عند تحديث
     المقترحات أو قياسات GSC وطلبات العملاء؛ لا ينشر محتوى ولا ينفذ كودًا بمفرده.
    </p>
   </div>
   <button className="btn-secondary text-xs" type="button" onClick={onVisibility}>
    فحص إعدادات Google والظهور
   </button>
  </div>
  <div className="mt-3 grid gap-2 sm:grid-cols-3">
   <div className="rounded-lg border border-slate-200 p-3">
    <p className="text-xs text-slate-600">مقترحات في الطابور</p>
    <p className="text-xl font-bold">{number(priorities.length)}</p>
   </div>
   <div className="rounded-lg border border-slate-200 p-3">
    <p className="text-xs text-slate-600">مرتبطة بقياس أو إحالة مرصودة</p>
    <p className="text-xl font-bold">{number(observed)}</p>
   </div>
   <div className="rounded-lg border border-slate-200 p-3">
    <p className="text-xs text-slate-600">غير قابلة لقياس أثرها بعد</p>
    <p className="text-xl font-bold">{number(priorities.length-observed)}</p>
   </div>
  </div>
  <p className="mt-3 text-sm text-slate-700" role="status">{sourceMessage}</p>
  <p className="mt-1 text-xs text-slate-600">
   عند غياب القياسات يُقدّم المحتوى قبل المهام التقنية والأسئلة، ثم الأقدم داخل كل نوع.
   هذا ترتيب عمل تنظيمي وليس توقعًا للزيارات أو العملاء. الروابط والمراجع ليست شرطًا جديدًا للنشر.
  </p>
  <div className="mt-4 space-y-2">
   {priorities.slice(0,8).map(entry=>{
    const item=entry.item;
    return <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
     <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
       <p className="text-xs text-slate-600">
        {languageNames[item.lang]||item.lang} · {actionNames[entry.action]} ·
        {entry.basis==='reported_lead'?' إحالة عميل مسجلة':
         entry.basis==='observed_gsc'?' قياسات GSC متاحة':' أثر غير مقاس'}
       </p>
       <h4 className="mt-1 font-semibold text-slate-900">{item.title}</h4>
       <p className="mt-1 break-all text-xs text-slate-500" dir="auto">{item.targetPath||'لم تُحدد صفحة قياس لهذا المقترح'}</p>
       {entry.metric&&<p className="mt-1 text-xs text-slate-700">
        {number(entry.metric.clicks)} نقرة و{number(entry.metric.impressions)} ظهور مرصود
        على الصفحة المرتبطة (ليس للمقترح غير المنشور)
       </p>}
       {entry.clientReportedLeads!==null&&entry.clientReportedLeads>0&&
        <p className="mt-1 text-xs text-slate-700">
         {number(entry.clientReportedLeads)} طلب محفوظ مع إحالة متصفح لهذه الصفحة؛ ليس دليلًا على سبب التحويل
        </p>}
       <p className="mt-1 text-xs text-slate-600">
        مراجع أكدها المحرر: {number(entry.verifiedSources)}؛ معرّفات أدلة بحثية: {number(entry.evidenceIds)}.
        أرقام التوثيق للشفافية فقط، ولا تمنع النشر حسب السياسة الحالية.
       </p>
      </div>
      <button className="btn-secondary text-xs" type="button"
       onClick={()=>onPreview(item.id)}>معاينة المقترح</button>
     </div>
    </article>;
   })}
   {priorities.length===0&&<p className="text-sm text-slate-600">لا توجد مقترحات جديدة تنتظر العمل.</p>}
  </div>
  {priorities.length>8&&<p className="mt-3 text-xs text-slate-600">
   يُعرض أول {number(8)} من {number(priorities.length)} مقترحًا. بقية المقترحات متاحة في سجل المحتوى أدناه.
  </p>}
 </section>;
}
