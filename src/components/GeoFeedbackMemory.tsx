'use client';
import React,{useCallback,useEffect,useState} from 'react';

type Kind='keyword'|'competitor'|'opportunity'|'editorial'|'publication'|'faq';
type Decision='irrelevant'|'inaccurate'|'duplicate'|'valid';
type Entry={id:string;subject_type:Kind;subject_key:string;language:'ar'|'en'|'zh'|null;
 decision:Decision;reason:string;created_at:string;source:'admin'|'seed'};
const labels:Record<Kind,string>={
 keyword:'كلمة بحث',competitor:'منافس / نطاق',opportunity:'فرصة',editorial:'مقترح محتوى',
 publication:'صفحة / مسار نشر',faq:'سؤال شائع'
};
const decisions:Record<Decision,string>={
 irrelevant:'غير مرتبط بنشاطنا',inaccurate:'غير دقيق',duplicate:'مكرر',valid:'صحيح ومقبول'
};
/** Dedicated admin tool; never displays or fetches service-role secrets in browser. */
export default function GeoFeedbackMemory({adminSecret,initial}:{adminSecret:string;
 initial?:{kind:Kind;key:string;language?:'ar'|'en'|'zh'|null}|null}){
 const [kind,setKind]=useState<Kind>('keyword');
 const [key,setKey]=useState('');
 const [language,setLanguage]=useState('');
 const [decision,setDecision]=useState<Decision>('irrelevant');
 const [reason,setReason]=useState('');
 const [history,setHistory]=useState<Entry[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const load=useCallback(async()=>{
  if(!adminSecret)return;
  const res=await fetch('/api/admin/geo-feedback',{headers:{'x-admin-secret':adminSecret},cache:'no-store'});
  const value=await res.json();
  if(!res.ok)throw Error(value.error||'تعذر قراءة سجل التصحيحات');
  setHistory(Array.isArray(value.history)?value.history:[]);
 },[adminSecret]);
 useEffect(()=>{load().catch(e=>setError(String(e.message||e)))},[load]);
 useEffect(()=>{
  if(!initial)return;
  setKind(initial.kind);
  setKey(initial.key);
  setLanguage(initial.language||'');
  setNotice('حدد سبب التصحيح ثم احفظه؛ لا يتم حذف السجل الأصلي.');
 },[initial]);
 const submit=async()=>{
  if(busy)return;
  if(key.trim().length<2||reason.trim().length<5){setError('أدخل المصطلح أو المسار وسببًا واضحًا لا يقل عن 5 أحرف.');return}
  setBusy(true);setError('');setNotice('');
  try{
   const res=await fetch('/api/admin/geo-feedback',{method:'POST',headers:{
    'x-admin-secret':adminSecret,'Content-Type':'application/json'
   },body:JSON.stringify({subject_type:kind,subject_key:key,language:language||null,decision,reason}),cache:'no-store'});
   const value=await res.json();
   if(!res.ok||!value.saved)throw Error(value.error||'تعذر تأكيد حفظ التصحيح');
   await load();
   setNotice('تم حفظ قرارك وسببه في الذاكرة. ستطبقه الدورات اللاحقة دون حذف البيانات الحالية.');
   setReason('');
  }catch(e){setError(e instanceof Error?e.message:'تعذر حفظ التصحيح')}
  finally{setBusy(false)}
 };
 return <section className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm sm:p-6" dir="rtl">
  <h2 className="mb-2 text-xl font-bold text-slate-900">ذاكرة تصحيح الوكيل</h2>
  <p className="mb-4 text-sm text-slate-600">
   علّم الوكيل لماذا تُعد نتيجة البحث غير مناسبة، أو صحح قرارًا سابقًا باختيار «صحيح ومقبول».
   يسري أحدث قرار عند الاكتشاف وفرز النتائج والنشر اللاحق. السجلات السابقة لا تُحذف.
  </p>
  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
   <label className="text-sm font-medium">نوع النتيجة
    <select aria-label="نوع النتيجة" className="mt-1 w-full rounded-lg border p-2"
     value={kind} onChange={e=>setKind(e.target.value as Kind)}>
     {Object.entries(labels).map(([v,label])=><option key={v} value={v}>{label}</option>)}
    </select>
   </label>
   <label className="text-sm font-medium">اللغة (اختياري)
    <select aria-label="لغة التصحيح" className="mt-1 w-full rounded-lg border p-2"
     value={language} onChange={e=>setLanguage(e.target.value)}>
     <option value="">جميع اللغات / غير محددة</option>
     <option value="ar">العربية</option><option value="en">الإنجليزية</option><option value="zh">الصينية</option>
    </select>
   </label>
   <label className="text-sm font-medium">الحكم
    <select aria-label="قرار التصحيح" className="mt-1 w-full rounded-lg border p-2"
     value={decision} onChange={e=>setDecision(e.target.value as Decision)}>
     {Object.entries(decisions).map(([v,label])=><option key={v} value={v}>{label}</option>)}
    </select>
   </label>
  </div>
  <label className="mt-3 block text-sm font-medium">المصطلح أو عنوان الفرصة أو معرّف المقترح أو مسار الصفحة
   <input aria-label="موضوع التصحيح" className="mt-1 w-full rounded-lg border p-3 text-sm"
    value={key} onChange={e=>setKey(e.target.value)} placeholder="saudi arabia formation football"/>
  </label>
  <label className="mt-3 block text-sm font-medium">لماذا هذا القرار؟
   <textarea aria-label="سبب التصحيح" rows={2} className="mt-1 w-full rounded-lg border p-3 text-sm"
    value={reason} onChange={e=>setReason(e.target.value)}
    placeholder="مصطلح رياضي لا يتعلق بتأسيس الشركات أو الاستثمار الأجنبي"/>
  </label>
  <button type="button" onClick={submit} disabled={busy||!key.trim()||reason.trim().length<5}
   className="btn-primary mt-3 disabled:opacity-50">{busy?'جارٍ الحفظ...':'حفظ التصحيح وتعليم الوكيل'}</button>
  {error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  {notice&&<p role="status" className="mt-2 text-sm text-emerald-700">{notice}</p>}
  <details className="mt-5 rounded-lg border border-slate-200 p-3">
   <summary className="cursor-pointer font-semibold">سجل التصحيحات المحفوظة ({history.length})</summary>
   <p className="mt-2 text-xs text-slate-500">سجل زمني غير قابل للحذف من هذه الواجهة. يمكن تصحيح أي قرار بإضافة قرار أحدث لنفس المصطلح واللغة.</p>
   <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
    {history.slice(0,60).map(e=><div key={e.id} className="rounded-lg bg-slate-50 p-3 text-sm">
     <p className="break-all font-medium">{e.subject_key} <span className="text-slate-500">— {labels[e.subject_type]}</span></p>
     <p>{decisions[e.decision]} · {e.language||'جميع اللغات'} · {new Date(e.created_at).toLocaleString('ar-SA')}</p>
     <p className="text-slate-600">{e.reason}</p>
    </div>)}
    {!history.length&&<p className="text-slate-500">لا توجد تصحيحات مسجلة.</p>}
   </div>
  </details>
 </section>;
}
