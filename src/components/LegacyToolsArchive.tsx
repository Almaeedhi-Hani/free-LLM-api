'use client';

import type {ReactNode} from 'react';

type Destination='keywords'|'evidence'|'opportunities'|'visibility'|'agent'|'runs'|'settings';
type ArchivedTool={
  id:string;name:string;formerLocation:string;purpose:string;reason:string;
  replacement:string;destination:Destination;lastUse:string;state:string;
};

/** Historical UI inventory. Do not invoke historical cron/API actions here.
 * The active administration and production APIs remain in their original owners. */
export const LEGACY_ADMIN_TOOLS:readonly ArchivedTool[]=[
  {id:'B15',name:'كلمات المحتوى القديمة',formerLocation:'V12 / content_store.keywords',
   purpose:'قائمة كلمات المحتوى قبل فصل الأبحاث السوقية',reason:'محرر القائمة أزيل سابقًا لتجنب مصدرين للكلمات',
   replacement:'V03 — كلمات البحث السوقية',destination:'keywords',lastUse:'غير معروف',state:'مؤرشف مسبقًا؛ البيانات محفوظة'},
  {id:'V04-partial',name:'توصيات الأدلة المؤقتة',formerLocation:'V04 — الأدلة ومصادر النتائج',
   purpose:'قراءة التوصيات غير الموثقة التي كانت تُخلط مع قرارات خطة العمل',
   reason:'القرارات المعتمدة لها سجل الفرص V05؛ الأدلة الأصلية في V04 لا تزال نشطة ولا تُخفى',
   replacement:'V05 — الفرص، مع إبقاء V04 للمصادر',destination:'opportunities',lastUse:'غير معروف',state:'جرد جزئي؛ V04 النشط محفوظ'},
  {id:'B08-D08',name:'عينات ظهور AI القديمة',formerLocation:'B08 / D08 — ai_citation_panel_observations',
   purpose:'نموذج سابق لعينة إشارة الذكاء الاصطناعي',reason:'لا تساوي عينات النموذج وحدها اقتباسًا أو إحالة موثقة',
   replacement:'V13 — القياس والظهور',destination:'visibility',lastUse:'غير معروف',state:'سجل تاريخي فقط؛ API والجدول محفوظان'},
  {id:'V07-manual',name:'أزرار تحليل السوق والرادار اليدوية السابقة',formerLocation:'V07 — وكيل GEO',
   purpose:'تشغيل POST قديم للتحليل/الرادار يدويًا',reason:'الدورات التشغيلية الآن مجدولة وتملك سجلات تشغيل مستقلة؛ طلب إضافي قد يستهلك الحصص',
   replacement:'V07 — مراقبة GEO و V08 — سجل التشغيل',destination:'agent',lastUse:'غير معروف',state:'مخفية خلف العلم؛ يمكن استعادتها فورًا'},
  {id:'cron-legacy',name:'واجهات cron-agent / cron-unified القديمة',formerLocation:'Legacy cron routes/orchestrator/worker',
   purpose:'مسارات تشغيل خلفية قديمة، وليست عنصر تنقل مثبتًا في هذه النسخة',
   reason:'لا يجوز اعتبار مسار API شاشة فعلية أو حذف تكامل لمجرد قدم التسمية',
   replacement:'V08 — سجل التشغيل الموحد',destination:'runs',lastUse:'غير معروف',state:'لا توجد واجهة تنقل قديمة مثبتة؛ المسارات محفوظة'},
  {id:'V18-shortcuts',name:'اختصارات الإعدادات المكررة',formerLocation:'V18 — إدارة النظام',
   purpose:'أزرار انتقال إلى الوكيل والتواصل والمراجعات الموجودة في القائمة',
   reason:'نفس الوجهات موجودة مرة واحدة في التنقل المصنف',
   replacement:'التنقل الجانبي المعتمد',destination:'settings',lastUse:'غير معروف',state:'اختصارات مخفية؛ الأقسام نشطة'}
];

export default function LegacyToolsArchive({onNavigate}:{onNavigate:(tab:Destination)=>void}):ReactNode {
  return <details id="admin-legacy-archive" className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" dir="rtl">
    <summary className="cursor-pointer select-none text-lg font-bold text-navy-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-600">
      الأدوات القديمة / الأرشيف
    </summary>
    <div className="mt-4 space-y-3">
      <p className="text-sm leading-7 text-slate-600">هذا جرد تشخيصي للواجهات السابقة، وليس مركز تشغيل بديلًا. جميع واجهات API والجداول والسجلات القديمة باقية. «غير معروف» يعني عدم توفر دليل مؤرخ لآخر استخدام، لا أنه لم يُستخدم قط.</p>
      {LEGACY_ADMIN_TOOLS.map(item=><article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-navy-900 px-2 py-1 text-xs font-semibold text-white" dir="ltr">{item.id}</span>
          <h3 className="font-semibold text-navy-900">{item.name}</h3>
        </div>
        <dl className="mt-2 grid min-w-0 grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div><dt className="font-semibold text-slate-700">الموقع السابق</dt><dd className="break-words text-slate-600">{item.formerLocation}</dd></div>
          <div><dt className="font-semibold text-slate-700">الوظيفة</dt><dd className="break-words text-slate-600">{item.purpose}</dd></div>
          <div><dt className="font-semibold text-slate-700">سبب الأرشفة</dt><dd className="break-words text-slate-600">{item.reason}</dd></div>
          <div><dt className="font-semibold text-slate-700">حالة الاستخدام / آخر استخدام مثبت</dt><dd className="text-slate-600">{item.state} — {item.lastUse}</dd></div>
        </dl>
        <button type="button" className="mt-3 text-sm font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-950 focus-visible:outline" onClick={()=>onNavigate(item.destination)}>
          البديل المعتمد: {item.replacement}
        </button>
      </article>)}
    </div>
  </details>;
}
