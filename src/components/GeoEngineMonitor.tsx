'use client';
import React from 'react';

type RecordItem = Record<string, unknown>;
type Props = {
  runs: RecordItem[];
  competitors: RecordItem[];
  keywords: RecordItem[];
  opportunities: RecordItem[];
  goals: RecordItem[];
  sources: RecordItem[];
  loading: boolean;
  refresh: () => void;
};
const providers = ['Exa','Tavily','Parallel','Firecrawl'];
const str = (value: unknown) => typeof value === 'string' ? value : '';
export default function GeoEngineMonitor({runs,competitors,keywords,opportunities,goals,sources,loading,refresh}:Props) {
  const latest = [...runs].sort((a,b) => Date.parse(str(b.started_at)||'1970-01-01')-Date.parse(str(a.started_at)||'1970-01-01'))[0];
  const status = latest ? str(latest.status) || 'غير معروف' : 'لم يُسجل تشغيل';
  const completedRuns = runs.filter(run => ['success','completed'].includes(str(run.status).toLowerCase())).length;
  const failedRuns = runs.filter(run => ['failed','error'].includes(str(run.status).toLowerCase())).length;
  const runningRuns = runs.filter(run => ['running','in_progress'].includes(str(run.status).toLowerCase())).length;
  const counts = [
    ['المنافسون',competitors.length],['الكلمات المفتاحية',keywords.length],
    ['الفرص',opportunities.length],['الأهداف',goals.length],['سجلات التشغيل',runs.length]
  ] as const;
  return <section dir="rtl" className="rounded-xl border border-slate-200 p-5 space-y-4">
    <div className="flex flex-wrap justify-between items-center gap-3">
      <div><h2 className="font-bold text-lg">مراقبة محرك GEO الجديد</h2>
        <p className="text-sm text-slate-500">مؤشرات من السجلات المحفوظة؛ لا تمثل اتصالاً حيًا بالمزودين أو إثباتًا لتشغيل المحرك الآن.</p></div>
      <button type="button" disabled={loading} onClick={refresh} className="rounded-lg border px-4 py-2 disabled:opacity-50">{loading?'جارٍ التحديث':'تحديث البيانات'}</button>
    </div>
    <p className="text-sm">آخر حالة مسجلة: <strong>{status}</strong> — {latest?.started_at ? new Date(str(latest.started_at)).toLocaleString('ar-SA') : 'لا يوجد وقت مسجل'}</p>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{counts.map(([label,count])=><div key={label} className="rounded-lg border p-3"><div className="text-sm text-slate-500">{label}</div><div className="text-xl font-bold">{count}</div></div>)}</div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
      <div className="rounded-lg border p-3">تشغيلات ناجحة مسجلة: <strong>{completedRuns}</strong></div>
      <div className="rounded-lg border p-3">تشغيلات فاشلة مسجلة: <strong>{failedRuns}</strong></div>
      <div className="rounded-lg border p-3">تشغيلات مسجلة كجارية: <strong>{runningRuns}</strong></div>
    </div>
    <p className="text-xs text-slate-500">الحالات مستخرجة من السجلات المحفوظة، وقد تكون قديمة؛ لا تعني وجود تشغيل حي.</p>
    <h3 className="font-semibold">مزودو البحث</h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{providers.map(name=>{
      const recorded=sources.some(s=>JSON.stringify(s).toLowerCase().includes(name.toLowerCase()));
      return <div key={name} className="rounded-lg border p-3"><strong>{name}</strong><p className="text-xs text-slate-500">{recorded?'مذكور في سجلات الاكتشاف؛ الاتصال غير مفحوص':'لا يوجد رصد محفوظ؛ الاتصال غير مفحوص'}</p></div>;
    })}</div>
    <h3 className="font-semibold">آخر سجلات التشغيل</h3>
    {runs.length === 0 ? <p className="text-sm text-slate-500">لا توجد سجلات تشغيل محفوظة حتى الآن.</p> :
      <div className="overflow-x-auto"><table className="w-full text-sm text-right"><thead><tr className="border-b"><th className="p-2">وقت البدء</th><th className="p-2">الحالة المسجلة</th><th className="p-2">المعرف</th></tr></thead><tbody>
        {[...runs].sort((a,b)=>Date.parse(str(b.started_at)||'1970-01-01')-Date.parse(str(a.started_at)||'1970-01-01')).slice(0,10).map((run,index)=><tr key={str(run.id)||index} className="border-b"><td className="p-2">{str(run.started_at)||'غير مسجل'}</td><td className="p-2">{str(run.status)||'غير معروف'}</td><td className="p-2 font-mono">{str(run.id)||'—'}</td></tr>)}
      </tbody></table></div>}
    <p className="text-xs text-slate-500">هذه سجلات تاريخية وليست حالة لحظية. لا يوجد زر تشغيل حتى يتوفر مسار خادم محمي يمنع التكرار.</p>
    <p className="text-xs text-slate-500">عدد صفحات المنافسين الخمس لكل كلمة ولغة لا يُؤكد إلا من سجلات الصفحات المخصصة؛ إجمالي المنافسين أعلاه ليس عدد الصفحات المحللة. التشغيل اليدوي غير متاح من هذه الواجهة حتى توفير نقطة تشغيل آمنة ومحمية.</p>
  </section>;
}
