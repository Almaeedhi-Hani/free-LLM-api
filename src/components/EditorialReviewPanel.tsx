'use client';
import {useState} from 'react';
import type {EditorialItem} from '@/lib/editorial-types';
import {approvedEditorial} from '@/lib/editorial-workflow';
import {editorialPath} from '@/lib/content-impact';
import {editorialAnchor} from '@/lib/publication-anchors';
const LANG={ar:'العربية',en:'الإنجليزية',zh:'الصينية'};
export default function EditorialReviewPanel({items,saving,onDeleteItem}:{items:EditorialItem[];saving:boolean;onDeleteItem:(id:string)=>Promise<boolean>}){
 const [query,setQuery]=useState('');
 const live=(['ar','en','zh'] as const).flatMap(lang=>approvedEditorial(items,lang)).filter(i=>editorialPath(i));
 const pending=items.filter(i=>i.status==='pending');
 const technical=pending.filter(i=>['technical_seo','internal_link'].includes(i.kind)||i.review_preflight?.evidence_lane==='implementation').length;
 const visible=live.filter(i=>[i.title,i.lang,i.target].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
  <h2 className="text-xl font-bold">المحتوى المنشور</h2>
  <p className="mt-2 text-sm text-slate-600">يتولى النظام معالجة المحتوى والنشر عند اجتياز شروط التحقق. لا يلزم اعتماد يدوي من هذه الشاشة.</p>
  <p className="my-3 text-sm">منشور: {live.length} · قيد المعالجة أو التحقق الآلي: {pending.length-technical} · مهام تقنية: {technical}</p>
  <input aria-label="البحث في المنشورات" placeholder="بحث بالعنوان أو المسار..." className="mb-4 w-full rounded-lg border border-slate-300 p-2" value={query} onChange={e=>setQuery(e.target.value)}/>
  <ul className="space-y-3">{visible.map(item=>{
   const path=editorialPath(item)!;
   const href=['guide','comparison'].includes(item.kind)?path:path+'#'+editorialAnchor(item.id);
   return <li key={item.id} className="min-w-0 rounded-xl border border-slate-200 p-4">
    <p className="text-xs text-slate-600">{LANG[item.lang]} · {item.approval_method==='automated'?'منشور آليًا':'منشور'}</p>
    <h3 className="my-2 font-semibold break-words">{item.title}</h3>
    <div className="flex flex-wrap gap-2">
     <a href={href} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs">معاينة المنشور</a>
     <button className="btn-secondary text-xs text-red-700" disabled={saving} onClick={()=>{if(window.confirm('حذف هذا المحتوى من الموقع بعد حفظه في ذاكرة الوكيل؟'))void onDeleteItem(item.id)}}>حذف</button>
    </div>
   </li>;
  })}</ul>
  {!visible.length&&<p className="py-4 text-sm text-slate-600">لا توجد منشورات مطابقة حاليًا.</p>}
 </section>;
}
