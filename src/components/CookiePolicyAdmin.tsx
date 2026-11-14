"use client";
import React,{useEffect,useState} from "react";
type Policy={analyticsAvailable:boolean;marketingAvailable:boolean;consentDays:number};
const fallback:Policy={analyticsAvailable:true,marketingAvailable:true,consentDays:180};
export default function CookiePolicyAdmin({policy,onSave,saving}:{policy?:Partial<Policy>;onSave:(value:Policy)=>Promise<boolean>;saving:boolean}){
 const [draft,setDraft]=useState<Policy>({...fallback,...policy});
 useEffect(()=>{setDraft({...fallback,...policy})},[policy?.analyticsAvailable,policy?.marketingAvailable,policy?.consentDays]);
 const valid=Number.isInteger(draft.consentDays)&&draft.consentDays>=1&&draft.consentDays<=365;
 return <section dir="rtl" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
  <div><h2 className="text-xl font-bold">إدارة ملفات تعريف الارتباط</h2><p className="mt-2 text-sm text-slate-500">تتحكم هذه الإعدادات في الخيارات التي يمكن للزائر الموافقة عليها. لا تُشغّل أدوات قياس أو تسويق من تلقاء نفسها.</p></div>
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex justify-between"><strong>الكوكيز الضرورية</strong><span className="text-emerald-700">مفعّلة دائمًا</span></div><p className="mt-1 text-xs text-slate-500">لغة الموقع وتسجيل قرار الموافقة.</p></div>
  <label className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4"><span><strong>إتاحة موافقة التحليلات</strong><span className="block text-xs text-slate-500">تظهر للزائر كخيار اختياري. لا يبدأ أي تتبع قبل موافقته وربط مزود فعلي.</span></span><input type="checkbox" checked={draft.analyticsAvailable} onChange={e=>setDraft(p=>({...p,analyticsAvailable:e.target.checked}))}/></label>
  <label className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4"><span><strong>إتاحة موافقة التسويق</strong><span className="block text-xs text-slate-500">لا يُفعّل أي بكسل أو إعادة استهداف قبل الموافقة والربط الفعلي.</span></span><input type="checkbox" checked={draft.marketingAvailable} onChange={e=>setDraft(p=>({...p,marketingAvailable:e.target.checked}))}/></label>
  <label className="block space-y-2"><span className="font-semibold">مدة حفظ قرار الموافقة (بالأيام)</span><input type="number" min={1} max={365} value={draft.consentDays} onChange={e=>setDraft(p=>({...p,consentDays:Number(e.target.value)}))} className="block w-32 rounded-lg border border-slate-300 p-2"/></label>
  {!valid&&<p role="alert" className="text-sm text-red-700">اختر مدة صحيحة بين يوم و365 يومًا.</p>}
  <button className="btn-primary" disabled={saving||!valid} onClick={()=>void onSave(draft)}>{saving?"جارٍ الحفظ…":"حفظ إعدادات الكوكيز"}</button>
  <div className="border-t border-slate-200 pt-4 text-sm text-slate-600"><strong>حالة القياس</strong><p className="mt-1">لم تُربط أداة تحليلات أو تسويق في هذا القسم. لا تتوفر إحصاءات حقيقية للموافقات أو التحويلات بعد؛ ولن نعرض أرقامًا تقديرية.</p><p className="mt-2">تُخزن الموافقة محليًا في متصفح الزائر، ولا تُرسل إلى قاعدة بيانات الموقع حاليًا.</p></div>
 </section>;
}
