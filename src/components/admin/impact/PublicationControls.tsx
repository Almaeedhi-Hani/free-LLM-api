'use client';
import type {PublicationControlsModel} from './usePublicationControls';

export default function PublicationControls({autoStatus,autoBusy,autoNotice,autoLimit,setAutoLimit,autoAction,changeAuto,changeSensitive,date}:PublicationControlsModel&{date:(v:string|null)=>string}){
 return (
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
 );
}
