"use client";
import { useEffect, useState } from "react";

type RequestRow = {id:string;request_number:number;created_at:string;package_slug:string;package_price:number;locale:string;name:string;email:string;phone:string;country:string;activity:string;company:string;budget:string;notes:string;status:string;viewed_at:string|null;share_opened_at:string|null};
const labels: Record<string,string> = {saved:"جديد",contacted:"تم التواصل",closed:"مغلق"};
const display = (value: string | null | undefined) => value?.trim() || "—";
const requestRef = (number:number) => "PR-"+String(number).padStart(4,"0");
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
 return ["طلب باقة استثمارية", "رقم الطلب: "+requestRef(r.request_number), ...detailRows(r).map(([key,value])=>key+": "+display(value)), "الحالة: "+(labels[r.status]||r.status)].join("\n");
}
function RequestCard({r,secret,onChange,onDelete}:{r:RequestRow;secret:string;onChange:(id:string,patch:Partial<RequestRow>)=>void;onDelete:(id:string)=>void}){
 const [expanded,setExpanded]=useState(false);
 const [busy,setBusy]=useState(false);
 const [actionError,setActionError]=useState("");
 const state = r.share_opened_at ? "مشاركة مفتوحة" : r.viewed_at ? "تمت المشاهدة" : "جديد · لم يُفتح";
 const stateStyle = r.share_opened_at ? "border-[#9cac9d] bg-[#e4eee6] text-[#275e43]" : r.viewed_at ? "border-[#cbd6c8] bg-[#edf1ed] text-[#49665f]" : "border-[#d4ad66] bg-[#fff0cf] text-[#81551c]";
 async function mark(action:"viewed"|"share_opened"){
  try {
   const response=await fetch("/api/admin/package-requests",{method:"PATCH",headers:{"x-admin-secret":secret,"Content-Type":"application/json"},body:JSON.stringify({id:r.id,action})});
   if(!response.ok)throw Error("تعذر حفظ حالة الطلب");
   const result=await response.json();
   if(result.timestamp)onChange(r.id,{[action==="viewed"?"viewed_at":"share_opened_at"]:result.timestamp});
  } catch(e){setActionError(e instanceof Error?e.message:"تعذر حفظ حالة الطلب");}
 }
 function toggle(){
  if(!expanded&&!r.viewed_at)void mark("viewed");
  setExpanded(v=>!v);
 }
 function share(){
  const url="https://api.whatsapp.com/send?text="+encodeURIComponent(shareText(r));
  const opened=window.open(url,"_blank");
  if(opened){opened.opener=null;void mark("share_opened");}
  else setActionError("تعذر فتح واتساب؛ اسمح بالنوافذ المنبثقة وحاول مجددًا");
 }
 async function remove(){
  if(!window.confirm("هل تريد حذف طلب "+display(r.name)+" نهائيًا؟ لا يمكن التراجع عن الحذف."))return;
  setBusy(true);setActionError("");
  try{
   const response=await fetch("/api/admin/package-requests",{method:"DELETE",headers:{"x-admin-secret":secret,"Content-Type":"application/json"},body:JSON.stringify({id:r.id})});
   if(!response.ok)throw Error("تعذر حذف الطلب");
   onDelete(r.id);
  }catch(e){setActionError(e instanceof Error?e.message:"تعذر حذف الطلب");}
  finally{setBusy(false);}
 }
 return <article style={expanded?{minHeight:"830px"}:undefined} className="flex flex-col rounded-2xl border border-[#d9d9cd] bg-[#faf9f2] p-4 sm:p-5 text-[#163f38] shadow-sm">
  <button type="button" aria-expanded={expanded} aria-controls={"request-details-"+r.id} onClick={toggle} className="w-full text-right focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#163f38]">
   <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
     <p className="text-xs text-[#647e77]">رقم الطلب <span dir="ltr" className="inline-block font-mono">{requestRef(r.request_number)}</span></p>
     <h3 className="mt-1 text-lg font-bold break-words">{display(r.name)}</h3>
    </div>
    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${stateStyle}`}>{state}</span>
   </div>
   <p className="mt-3 font-semibold break-words">{r.package_slug}</p>
   <div className="mt-2 flex items-center justify-between gap-3">
    <span className="font-semibold" dir="ltr">{price(r.package_price)}</span>
    <span className="text-sm text-[#647e77]">{expanded?"إخفاء التفاصيل ▲":"عرض التفاصيل ▼"}</span>
   </div>
  </button>
  {!expanded&&<button type="button" onClick={share} className="mt-4 w-full rounded-full bg-[#c8a563] px-4 py-2.5 font-semibold text-[#163f38] hover:bg-[#b99654] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#163f38]">مشاركة الطلب عبر واتساب</button>}
  {actionError&&<p role="alert" className="mt-2 text-sm text-red-700">{actionError}</p>}
  {expanded&&<div id={"request-details-"+r.id} className="mt-3 flex flex-1 flex-col border-t border-[#d9d9cd] pt-3">
   <h4 className="mb-2 shrink-0 text-lg font-semibold">مراجعة الطلب</h4>
   <dl className="flex-1">{detailRows(r).map(([label,value])=><div key={label} className="flex items-start justify-between gap-3 border-b border-[#d9d9cd] py-2">
    <dt className="min-w-0 flex-1 text-right text-sm leading-relaxed text-[#647e77]" title={label}>{label}</dt>
    <dd className="min-w-0 max-w-[55%] shrink-0 whitespace-pre-wrap break-words text-left font-medium leading-relaxed" dir={label==="البريد الإلكتروني"||label==="رقم الهاتف"?"ltr":undefined} title={display(value)}>{display(value)}</dd>
   </div>)}</dl>
   <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
    <button type="button" onClick={()=>setExpanded(false)} className="rounded-full border border-[#9cac9d] px-5 py-2">إغلاق التفاصيل</button>
    <button type="button" onClick={remove} disabled={busy} className="rounded-full border border-red-300 px-5 py-2 text-red-800 hover:bg-red-50 disabled:opacity-50">{busy?"جارٍ الحذف...":"حذف البطاقة"}</button>
   </div>
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
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">{rows.map(r=><RequestCard key={r.id} r={r} secret={secret} onChange={(id,patch)=>setRows(current=>current.map(item=>item.id===id?{...item,...patch}:item))} onDelete={id=>setRows(current=>current.filter(item=>item.id!==id))}/>)}</div>
 </section>;
}
