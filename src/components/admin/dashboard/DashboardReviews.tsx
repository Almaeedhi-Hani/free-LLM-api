'use client';
import {useState} from 'react';
import type {ContentFAQ,ContentDraft} from '@/lib/content-store';
import {faqAnchor} from '@/lib/publication-anchors';
export default function DashboardReviews({content,saving,onDeleteFaq}:{content:{faqs:ContentFAQ[];drafts:ContentDraft[]};saving:boolean;onDeleteFaq:(q:string)=>Promise<boolean>}){
 const [query,setQuery]=useState('');
 const published=content.faqs.filter(f=>f.q.trim()&&f.a.trim()&&!/^STORAGE_TEST_/i.test(f.q));
 const pending=content.drafts.filter(d=>d.status==='pending').length;
 const visible=published.filter(f=>f.q.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
  <h2 className="text-xl font-bold">الأسئلة المنشورة</h2>
  <p className="mt-2 text-sm text-slate-600">يعالج الوكيل المسودات تلقائيًا، ولا ينشرها إلا بعد استيفاء التحقق المطلوب. لا يلزم اعتماد يدوي من هذه الشاشة.</p>
  <p className="my-3 text-sm">منشور: {published.length} · قيد المعالجة أو التحقق الآلي: {pending}</p>
  <input aria-label="البحث في الأسئلة المنشورة" placeholder="بحث بالسؤال..." className="mb-4 w-full rounded-lg border border-slate-300 p-2" value={query} onChange={e=>setQuery(e.target.value)}/>
  <ul className="space-y-3">{visible.map(f=><li key={f.q} className="min-w-0 rounded-xl border border-slate-200 p-4">
   <p className="text-xs text-slate-600">{f.approval_method==='automated'?'منشور آليًا':'منشور'}</p>
   <h3 className="my-2 font-semibold break-words">{f.q}</h3>
   <div className="flex flex-wrap gap-2">
    <a href={'/#'+faqAnchor(f.q)} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs">معاينة المنشور</a>
    <button disabled={saving} className="btn-secondary text-xs text-red-700" onClick={()=>{if(window.confirm('حذف السؤال المنشور ومسوداته المطابقة بعد حفظها في ذاكرة الوكيل؟'))void onDeleteFaq(f.q)}}>حذف</button>
   </div>
  </li>)}</ul>
  {!visible.length&&<p className="py-4 text-sm text-slate-600">لا توجد أسئلة منشورة مطابقة حاليًا.</p>}
 </section>;
}
