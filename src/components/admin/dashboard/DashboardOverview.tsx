'use client';
import type {Tab} from "@/lib/admin/dashboard/navigation";
import {readable} from "@/lib/admin/dashboard/presentation";
// The existing dashboard payload is dynamic; preserve the parent data contract.
type Props={competitors:unknown[];keywords:unknown[];keywordDerivedOpps:number;competitorBackedOpps:number;goals:unknown[];pendingDrafts:number;runs:any[];content:any;setTab:(value:Tab)=>void};

export default function DashboardOverview({competitors,keywords,keywordDerivedOpps,competitorBackedOpps,goals,pendingDrafts,runs,content,setTab}:Props) {
  return <>
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'المنافسون', value: competitors.length, color: 'text-navy-900' },
                    { label: 'الكلمات المفتاحية', value: keywords.length, color: 'text-navy-900' },
                    { label: 'الفرص (كلمات)', value: keywordDerivedOpps, color: 'text-emerald-700' },
                    { label: 'الفرص (منافسون)', value: competitorBackedOpps, color: 'text-emerald-700' },
                    { label: 'الأهداف', value: goals.length, color: 'text-gold-600' },
                    { label: 'المسودات المعلقة', value: pendingDrafts, color: 'text-amber-600' },
                    { label: 'سجلات التحليل القديم', value: runs.length, color: 'text-slate-700' },
                    { label: 'أسئلة شائعة', value: content.faqs?.length || 0, color: 'text-slate-700' },
                  ].map((c, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                      <p className="text-xs text-slate-500">{c.label}</p>
                      <p className={`text-2xl font-extrabold ${c.color}`}>{c.value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <div className="flex flex-wrap justify-between gap-2 items-center mb-2"><h2 className="text-lg font-bold">الفقرة التعريفية الرئيسية</h2><button className="text-sm text-blue-700 underline" onClick={()=>setTab('content')}>تعديل المحتوى</button></div>
                  <p className="text-slate-700 text-sm line-clamp-4">{content.goldenParagraph}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <div className="flex justify-between gap-2 items-center mb-2"><h2 className="text-lg font-bold">حالة وكيل GEO</h2><button onClick={()=>setTab('agent')} className="text-sm text-blue-700 underline">عرض التفاصيل</button></div>
                    <p className="text-sm">الحالة: <span className="font-bold text-emerald-700">{readable(content.agent?.status || 'idle')}</span></p>
                    <p className="text-sm">آخر تشغيل: {content.agent?.lastRun || '—'}</p>
                    <p className="text-sm">النتيجة: {content.agent?.lastResult || '—'}</p>
                    <p className="text-xs text-slate-400 mt-2">تُدار الجدولة من GitHub Actions. حالة هذه البطاقة لا تؤكد التشغيل التلقائي.</p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold mb-2">ملخص بيانات السوق</h2>
                    <p className="text-sm">المنافسون: {competitors.length} (لا توجد بيانات competitor-backed opportunities بدون منافسين).</p>
                    <p className="text-sm">الكلمات: {keywords.length}. فرص مستنتجة من الكلمات: {keywordDerivedOpps}.</p>
                    <p className="text-sm">آخر خطأ مسجل: {runs.find((r) => r.status === 'failed')?.error || 'لا توجد أخطاء مسجلة'}</p>
                  </div>
                </div>
              </div>
  </>;
}
