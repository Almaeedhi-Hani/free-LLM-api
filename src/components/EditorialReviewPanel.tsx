'use client';
import React,{useState} from 'react';
import type {EditorialItem} from '@/lib/editorial-workflow';
import {validateEditorialItem} from '@/lib/editorial-workflow';
import {topicNodeById} from '@/lib/content-tree';
const NAMES:Record<string,string>={
 home:'الصفحة الرئيسية',service:'صفحات الخدمات',packages:'محتوى الباقات',guide:'دليل متخصص',
 comparison:'مقارنة أصلية',trust:'إثبات الخبرة والثقة',technical_seo:'مهمة تقنية SEO',internal_link:'ربط داخلي'
};
const l=(lang:string)=>({ar:'العربية',en:'الإنجليزية',zh:'الصينية'} as Record<string,string>)[lang]||lang;
function linkFor(item:EditorialItem):string|undefined{
 const base=item.lang==='ar'?'':'/'+item.lang;
 if(item.kind==='home'||item.kind==='trust')return base+'/';
 if(item.kind==='packages')return base+'/packages';
 if(item.kind==='service')return base+'/services/'+item.target;
 if((item.kind==='guide'||item.kind==='comparison')&&item.slug)return base+'/insights/'+item.slug;
}
export default function EditorialReviewPanel({items,saving,onSaveItems}:{items:EditorialItem[];saving:boolean;onSaveItems:(items:EditorialItem[])=>Promise<boolean>}){
 const [editing,setEditing]=useState<{id:string;title:string;summary:string;body:string}|null>(null);
 const [sources,setSources]=useState<Record<string,string>>({});
 const [error,setError]=useState('');
 const [filter,setFilter]=useState('all');
 const visible=items.filter(x=>filter==='all'||x.status===filter);
 const counts={pending:items.filter(x=>x.status==='pending').length,approved:items.filter(x=>x.status==='approved').length,rejected:items.filter(x=>x.status==='rejected').length};
 const update=async(next:EditorialItem[])=>{try{setError('');return await onSaveItems(next)}catch(e){setError(e instanceof Error?e.message:'تعذر حفظ التغييرات');return false}};
 const editItem=async(item:EditorialItem)=>{
   if(!editing||item.id!==editing.id)return;
   const next={...item,id:item.status==='approved'?item.id+'-rev-'+Date.now().toString(36):item.id,title:editing.title.trim(),summary:editing.summary.trim(),body:editing.body.trim(),status:'pending' as const,reviewedAt:undefined,verified_sources:[],updatedAt:new Date().toISOString()};
   try{validateEditorialItem(next)}catch(e){setError(e instanceof Error?e.message:'المحتوى غير مكتمل');return}
   // A new review never unpublishes the old approved page before replacement approval.
   const updated=item.status==='approved'?[...items,next]:items.map(x=>x.id===item.id?next:x);
   if(await update(updated))setEditing(null);
 };
 const approve=async(item:EditorialItem)=>{
   if(item.kind==='technical_seo'||item.kind==='internal_link'){setError('المهام التقنية والروابط المقترحة تحتاج تنفيذًا واختبارًا في الكود، وليس نشرًا تلقائيًا.');return;}
   const verified=(sources[item.id]||'').split(/[\n,]+/).map(x=>x.trim()).filter(Boolean);
   if(!verified.length){setError('أدخل رابط مصدر واحد على الأقل راجعته فعليًا، ثم أكد صحة المعلومات.');return}
   const next={...item,status:'approved' as const,reviewedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),verified_sources:verified};
   try{validateEditorialItem(next)}catch(e){setError(e instanceof Error?e.message:'مصادر المراجعة غير صحيحة');return}
   if(!window.confirm('تأكيد بشري: هل راجعت المعلومات والمصادر الأصلية فعلًا وتتحمل قرار نشرها في الصفحة المحددة؟'))return;
   await update(items.map(x=>x.id===item.id?next:(x.status==='approved'&&x.lang===item.lang&&x.kind===item.kind&&x.target===item.target&&x.slug===item.slug?{...x,status:'rejected' as const,updatedAt:new Date().toISOString()}:x)));
 };
 const reject=async(item:EditorialItem)=>{
   if(!window.confirm(item.status==='approved'?'إلغاء نشر هذا المحتوى من الموقع مع إبقاء سجله؟':'رفض هذا المقترح مع الاحتفاظ به في السجل؟'))return;
   await update(items.map(x=>x.id===item.id?{...x,status:'rejected' as const,updatedAt:new Date().toISOString()}:x));
 };
 return <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
  <h2 className="text-xl font-bold mb-2">محرك المحتوى متعدد المسارات</h2>
  <p className="text-slate-600 text-sm mb-3">تحليل السوق يوجّه المقترحات إلى صفحات الخدمات والباقات والرئيسية، أو أدلة مستقلة ومقارنات ومهام SEO. لا ينشر النظام أي مقترح دون مراجعة. الروابط والمهام التقنية لا تُنفذ عن طريق كتابة نص.</p>
  <p className="text-sm mb-3">بانتظار المراجعة: {counts.pending} · منشور: {counts.approved} · مرفوض/مسحوب: {counts.rejected}</p>
  <select className="border border-slate-300 rounded-lg p-2 mb-4" value={filter} onChange={e=>setFilter(e.target.value)} aria-label="تصفية حالة المقترحات">
   <option value="all">كل الحالات</option><option value="pending">تحت المراجعة</option><option value="approved">منشور</option><option value="rejected">مرفوض</option>
  </select>
  {error&&<p role="alert" className="text-red-700 text-sm mb-3">{error}</p>}
  {visible.length===0&&<p className="text-slate-600">لا توجد مقترحات محفوظة بعد. يبدأ إنشاء المقترحات متعددة المسارات من تشغيلات GEO التالية؛ الأسئلة القديمة محفوظة بصورة منفصلة.</p>}
  <ul className="space-y-4">{visible.map(item=><li key={item.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
   <p className="text-xs text-emerald-800 font-semibold">{NAMES[item.kind]||item.kind} · {l(item.lang)} · {item.target} · {item.status==='approved'?'منشور':item.status==='rejected'?'مرفوض':'بانتظار مراجعة'}</p>
   {editing?.id===item.id?<div className="space-y-2">
      <input className="w-full border rounded p-2" aria-label="عنوان المحتوى" value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})}/>
      <textarea className="w-full border rounded p-2" rows={2} aria-label="ملخص المحتوى" value={editing.summary} onChange={e=>setEditing({...editing,summary:e.target.value})}/>
      <textarea className="w-full border rounded p-2" rows={7} aria-label="نص المحتوى" value={editing.body} onChange={e=>setEditing({...editing,body:e.target.value})}/>
      <button className="btn-primary text-xs" disabled={saving} onClick={()=>void editItem(item)}>حفظ للمراجعة</button>
      <button className="btn-secondary text-xs ml-2" onClick={()=>setEditing(null)}>إلغاء</button>
    </div>:<>
      <h3 className="font-bold">{item.title}</h3><p className="text-sm text-slate-700">{item.summary}</p>
      <p className="text-sm whitespace-pre-line">{item.body}</p>
      <p className="text-xs text-slate-600">درجة الخطر: {item.risk_level} · روابط الرصد أدلة بحث غير موثقة وليست مراجع حكومية معتمدة.</p>
      {item.topic_node_id&&<p className="text-xs text-slate-700">شجرة المحتوى: {topicNodeById(item.topic_node_id)?.primary_keyword[item.lang]||item.topic_node_id} · النية: {topicNodeById(item.topic_node_id)?.intent||'غير مصنفة'}</p>}
      {item.primary_keyword&&<p className="text-xs text-slate-700">الكلمة الأساسية المقترحة: {item.primary_keyword}</p>}
      {item.h1_suggestion&&<p className="text-xs text-slate-700">H1 المقترح (لا يُغيّر العنوان الحالي آليًا): {item.h1_suggestion}</p>}
      {(item.sections||[]).map((section,i)=><div className="rounded-lg bg-white p-2 border border-slate-100" key={i}><p className="text-xs font-bold">H2: {section.h2}</p>{(section.subsections||[]).map((sub,j)=><p className="text-xs" key={j}>H3: {sub.h3}</p>)}</div>)}
      {(item.internal_links||[]).map((link,i)=><p className="text-xs" key={i}>رابط داخلي مقترح: {link.anchor} ← {topicNodeById(link.node_id)?.route}</p>)}
      {(item.schema_suggestions||[]).length>0&&<p className="text-xs text-slate-700">Schema المقترحة (لا تُنشأ إلا عند تطابقها مع المحتوى المنشور): {item.schema_suggestions?.join(' / ')}</p>}
      {(item.evidence_refs||[]).map(ref=><p key={ref.id} className="text-xs">{ref.url?.startsWith('https://')?<a className="text-blue-700 underline" href={ref.url} target="_blank" rel="noopener noreferrer">{ref.label}</a>:ref.label} — {ref.kind}</p>)}
      {!item.evidence_refs?.length&&<p className="text-xs text-amber-700">لا توجد مصادر بحث مرتبطة. تحقق من جهة أصلية قبل الاعتماد.</p>}
      {item.status==='pending'&&<>
        <textarea aria-label="روابط المصادر التي تحققت منها" className="w-full border rounded p-2 text-xs" rows={2} placeholder="روابط HTTPS للمصادر الأصلية التي راجعتها فعليًا، رابط لكل سطر" value={sources[item.id]||''} onChange={e=>setSources({...sources,[item.id]:e.target.value})}/>
        <div className="flex flex-wrap gap-2">
         <button className="btn-secondary text-xs" disabled={saving} onClick={()=>setEditing({id:item.id,title:item.title,summary:item.summary,body:item.body})}>تحرير المقترح</button>
         {item.kind!=='technical_seo'&&item.kind!=='internal_link'&&<button className="btn-primary text-xs" disabled={saving} onClick={()=>void approve(item)}>اعتماد المحتوى ونشره بصفحته</button>}
         <button className="btn-secondary text-xs" disabled={saving} onClick={()=>void reject(item)}>رفض</button>
        </div>
       </>}
      {item.status==='approved'&&<div className="flex gap-3 flex-wrap">
         {linkFor(item)&&<a className="text-blue-700 underline text-sm" href={linkFor(item)} target="_blank" rel="noopener noreferrer">فتح موضع النشر</a>}
         <button className="btn-secondary text-xs" disabled={saving} onClick={()=>setEditing({id:item.id,title:item.title,summary:item.summary,body:item.body})}>إنشاء تعديل للمراجعة</button>
         <button className="btn-secondary text-xs" disabled={saving} onClick={()=>void reject(item)}>إلغاء النشر</button>
       </div>}
    </>}
   </li>)}</ul>
 </section>;
}
