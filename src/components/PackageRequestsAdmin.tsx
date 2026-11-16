"use client";
import { useEffect, useState } from "react";

type RequestRow = {id:string;created_at:string;package_slug:string;package_price:number;locale:string;name:string;email:string;phone:string;country:string;activity:string;company:string;budget:string;notes:string;status:string};
const labels: Record<string,string> = {saved:"جديد",contacted:"تم التواصل",closed:"مغلق"};
const display = (value: string | null | undefined) => value?.trim() || "—";
const price = (value:number) => Number(value).toLocaleString("en-US")+" SAR";
const date = (value:string) => new Date(value).toLocaleString("ar-SA",{dateStyle:"medium",timeStyle:"short"});
const detailRows = (r:RequestRow) => [
 ["الاسم الكامل",r.name],["البريد الإلكتروني",r.email],["رقم الهاتف",r.phone],
 ["دولة الإقامة",r.country],["النشاط",r.activity],["هل لديك شركة خارج السعودية؟",r.company],
 ["الميزانية الاستثمارية",r.budget],["ملاحظات",r.notes],
 ["تفاصيل الباقة",r.package_slug],["السعر",price(r.package_price)],
 ["اللغة",r.locale.toUpperCase()],["تاريخ الطلب",date(r.created_at)]
];
function shareText(r:RequestRow){
 return ["طلب باقة استثمارية", "رقم الطلب: "+r.id, ...detailRows(r).map(([key,value])=>key+": "+display(value)), "الحالة: "+(labels[r.status]||r.status)].join("\n");
}
function RequestCard({r}:{r:RequestRow}){
 const [expanded,setExpanded]=useState(false);
 function share(){
  const url="https://api.whatsapp.com/send?text="+encodeURIComponent(shareText(r));
  window.open(url,"_blank","noopener,noreferrer");
 }
 return <article className={`flex flex-col rounded-2xl border border-[#d9d9cd] bg-[#faf9f2] p-4 sm:p-5 text-[#163f38] shadow-sm ${expanded ? "h-[460px]" : ""}`}>
  <button type="button" aria-expanded={expanded} aria-controls={"request-details-"+r.id} onClick={()=>setExpanded(v=>!v)} className="w-full text-right focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#163f38]">
   <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
     <p className="text-xs text-[#647e77]">رقم الطلب <span dir="ltr" className="inline-block font-mono">{r.id.slice(0,8)}</span></p>
     <h3 className="mt-1 text-lg font-bold break-words">{display(r.name)}</h3>
    </div>
    <span className="shrink-0 rounded-full border border-[#cbd6c8] px-3 py-1 text-xs">{labels[r.status]||r.status}</span>
   </div>
   <p className="mt-3 font-semibold break-words">{r.package_slug}</p>
   <div className="mt-2 flex items-center justify-between gap-3">
    <span className="font-semibold" dir="ltr">{price(r.package_price)}</span>
    <span className="text-sm text-[#647e77]">{expanded?"إخفاء التفاصيل ▲":"عرض التفاصيل ▼"}</span>
   </div>
  </button>
  {!expanded&&<button type="button" onClick={share} className="mt-4 w-full rounded-full bg-[#c8a563] px-4 py-2.5 font-semibold text-[#163f38] hover:bg-[#b99654] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#163f38]">مشاركة الطلب عبر واتساب</button>}
  {expanded&&<div id={"request-details-"+r.id} className="mt-3 flex min-h-0 flex-1 flex-col border-t border-[#d9d9cd] pt-3">
   <h4 className="mb-2 shrink-0 text-lg font-semibold">مراجعة الطلب</h4>
   <dl className="min-h-0 flex-1 overflow-y-auto overscroll-contain pe-1">{detailRows(r).map(([label,value])=><div key={label} className="flex items-center justify-between gap-3 border-b border-[#d9d9cd] py-2">
    <dt className="min-w-0 flex-1 truncate text-right text-sm text-[#647e77]" title={label}>{label}</dt>
    <dd className="min-w-0 max-w-[55%] shrink-0 overflow-x-auto whitespace-nowrap text-left font-medium" dir={label==="البريد الإلكتروني"||label==="رقم الهاتف"?"ltr":undefined} title={display(value)}>{display(value)}</dd>
   </div>)}</dl>
   <p className="mt-2 shrink-0 truncate text-xs text-[#647e77]">المعرّف الداخلي: {r.id}</p>
   <button type="button" onClick={()=>setExpanded(false)} className="mt-2 shrink-0 self-start rounded-full border border-[#9cac9d] px-5 py-2">إغلاق التفاصيل</button>
  </div>}
 </article>;
}
export default function PackageRequestsAdmin({secret}:{secret:string}){
 const [rows,setRows]=useState<RequestRow[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 async function refresh(){
  setLoading(true);setError("");
  try{
   const res=await fetch("/api/admin/package-requests",{headers:{"x-admin-secret":secret},cache:"no-store"});
   if(!res.ok)throw Error("تعذر تحميل طلبات الباقات");
   const data=await res.json();setRows(Array.isArray(data.requests)?data.requests:[]);
  }catch(e){setError(e instanceof Error?e.message:"تعذر التحميل")}
  finally{setLoading(false)}
 }
 useEffect(()=>{void refresh()},[secret]);
 return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" dir="rtl">
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">طلبات الباقات ({rows.length})</h2><button type="button" onClick={refresh} disabled={loading} className="rounded-lg border px-4 py-2">{loading?"جارٍ التحميل...":"تحديث الطلبات"}</button></div>
  {error&&<p role="alert" className="text-red-700">{error}</p>}
  {!loading&&!rows.length&&!error&&<p>لا توجد طلبات محفوظة حتى الآن.</p>}
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">{rows.map(r=><RequestCard key={r.id} r={r}/>)}</div>
 </section>;
}
