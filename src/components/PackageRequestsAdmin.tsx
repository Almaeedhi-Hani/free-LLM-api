"use client";
import { useEffect, useState } from "react";

type RequestRow = {id:string;created_at:string;package_slug:string;package_price:number;locale:string;name:string;email:string;phone:string;country:string;activity:string;company:string;budget:string;notes:string;status:string};
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
 return <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200" dir="rtl">
  <div className="flex justify-between gap-3 items-center mb-4"><h2 className="text-xl font-bold">طلبات الباقات ({rows.length})</h2><button type="button" onClick={refresh} disabled={loading} className="rounded-lg border px-4 py-2">{loading?"جارٍ التحميل...":"تحديث الطلبات"}</button></div>
  {error&&<p role="alert" className="text-red-700">{error}</p>}
  {!loading&&!rows.length&&!error&&<p>لا توجد طلبات محفوظة حتى الآن.</p>}
  <div className="space-y-4">{rows.map(r=><article key={r.id} className="border rounded-xl p-4">
   <p className="font-semibold">{r.name} — {r.package_slug} ({Number(r.package_price).toLocaleString("en-US")} SAR)</p>
   <p className="text-sm">{new Date(r.created_at).toLocaleString("ar-SA")} · {r.status} · {r.locale}</p>
   <p>الهاتف: <a href={"tel:"+r.phone} className="underline" dir="ltr">{r.phone}</a></p>
   <p>البريد: <a href={"mailto:"+r.email} className="underline">{r.email}</a></p>
   <p>الإقامة: {r.country||"—"} · النشاط: {r.activity}</p>
   <p>شركة خارج السعودية: {r.company} · الميزانية: {r.budget}</p>
   {r.notes&&<p className="whitespace-pre-wrap">ملاحظات: {r.notes}</p>}
   <p className="text-xs break-all text-slate-500">رقم الطلب: {r.id}</p>
  </article>)}</div>
 </section>
}
