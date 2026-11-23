'use client';
import {useState} from 'react';
export default function WeeklyReportPage(){
 const [secret,setSecret]=useState('');
 const [report,setReport]=useState<any>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 async function load(save=false){
  setLoading(true);setError('');
  try{
   const response=await fetch('/api/admin/weekly-report',{method:save?'POST':'GET',headers:{'x-admin-secret':secret},cache:'no-store'});
   if(!response.ok)throw new Error(response.status===401?'بيانات الدخول غير صحيحة':'تعذر قراءة مصادر التقرير');
   const data=await response.json();setReport(data.report??data.saved?.report);
  }catch(e){setError(e instanceof Error?e.message:'تعذر تحميل التقرير');setReport(null)}
  finally{setLoading(false)}
 }
 return <main dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-5xl mx-auto">
 <h1 className="text-2xl font-bold mb-3">التقرير الأسبوعي — Invest in Saudi</h1>
 <p className="text-amber-300 mb-6">معاينة مباشرة من السجلات المحفوظة؛ الجدولة الأسبوعية موقوفة حتى تفعيل إعدادات الإنتاج. يمكن حفظ التقرير يدويًا والتحقق من سجله.</p>
 <label className="block mb-2" htmlFor="secret">رمز إدارة النظام</label>
 <input id="secret" type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)} className="bg-slate-800 border border-slate-600 rounded p-3 w-full mb-3" />
 <button onClick={()=>load(false)} disabled={loading||!secret} className="bg-orange-600 rounded px-5 py-3 disabled:opacity-50">{loading?'جارٍ التحميل':'عرض التقرير'}</button> <button onClick={()=>load(true)} disabled={loading||!secret} className="bg-slate-700 rounded px-5 py-3 mr-2 disabled:opacity-50">حفظ التقرير والتحقق</button>
 {error&&<p role="alert" className="text-red-300 mt-4">{error}</p>}
 {report&&<section className="mt-8 space-y-4">
 <h2 className="text-xl">الأسبوع: {report.week} — آخر توليد: {report.generatedAt}</h2>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{[['المسودات المعتمدة',report.faqDrafts?.approved],['المسودات المرفوضة',report.faqDrafts?.rejected],['التحرير قيد المراجعة',report.editorial?.pending],['سجلات GSC في العينة',report.metrics?.gsc?.sampleRows],['منشورات GEO في العينة',report.metrics?.publishedLinks?.published],['مشاهدات AI في العينة',report.metrics?.aiVisibility?.sampleSize]].map(([label,value])=><div key={String(label)} className="border border-slate-700 rounded-lg p-4"><p>{label}</p><strong className="text-2xl">{value??'غير متاح'}</strong></div>)}</div>
 <h2 className="text-lg">حالة الأنظمة</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{report.health?.map((s:any)=><div className="border border-slate-700 rounded p-3" key={s.name}>{s.name}: {s.status==='unavailable'?'غير متاح':s.status}</div>)}</div>
 <h2 className="text-lg">التنبيهات</h2>{report.warnings?.map((w:string,i:number)=><p key={i} className="text-amber-300">{w}</p>)}
 </section>}
 </main>
}
