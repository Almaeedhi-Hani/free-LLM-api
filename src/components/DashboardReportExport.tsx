'use client';
import {useState} from 'react';
import {build} from '@/lib/admin/reports/model';
import {excel} from '@/lib/admin/reports/xlsx';
import {pdf} from '@/lib/admin/reports/pdf';

export default function DashboardReportExport({secret,disabled}:{secret:string;disabled:boolean}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function download(format:'pdf'|'xlsx'){
  if(busy)return;setBusy(true);setOpen(false);setError('');
  try{
   const r=await fetch('/api/admin/dashboard-export',{headers:{'x-admin-secret':secret},cache:'no-store'});
   if(!r.ok)throw Error('تعذر جلب بيانات التقرير ('+r.status+')');
   const s=build(await r.json());const file=format==='pdf'?await pdf(s):excel(s);
   const href=URL.createObjectURL(file),a=document.createElement('a');a.href=href;a.download='Invest-in-Saudi-'+new Date().toISOString().slice(0,10)+'.'+format;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
  }catch(e){setError(e instanceof Error?e.message:'تعذر تنزيل التقرير')}finally{setBusy(false)}
 }
 return <div className="relative">
  <button type="button" aria-expanded={open} disabled={disabled||busy} onClick={()=>setOpen(!open)} className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-2 sm:px-3 text-xs sm:text-sm font-medium text-navy-900 disabled:opacity-50 whitespace-nowrap">{busy?'جارٍ التحميل...':'تحميل التقرير ▾'}</button>
  {open&&<div className="absolute left-0 top-full z-30 mt-1 w-32 max-w-[calc(100vw-1.25rem)] rounded-md border bg-white p-1 shadow-lg"><button type="button" className="block w-full rounded px-3 py-2 text-right text-sm hover:bg-slate-100" onClick={()=>download('pdf')}>PDF</button><button type="button" className="block w-full rounded px-3 py-2 text-right text-sm hover:bg-slate-100" onClick={()=>download('xlsx')}>Excel</button></div>}
  {error&&<p role="alert" className="absolute left-0 top-full z-30 mt-1 w-64 max-w-[calc(100vw-1.25rem)] rounded border border-red-200 bg-white p-2 text-xs text-red-700">{error}</p>}
 </div>;
}
