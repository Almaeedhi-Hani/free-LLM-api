'use client';
import React,{useState} from 'react';
import type {EditorialItem} from '@/lib/editorial-workflow';
import {validateEditorialItem} from '@/lib/editorial-workflow';
import {topicNodeById} from '@/lib/content-tree';
import {DataRolePanel,DataRoleTag} from '@/components/AdminDataRoles';
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
  <ul className="space-y-5">{visible.map(item=><li key={item.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 space-y-3">
   <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 text-xs text-slate-800"><DataRoleTag tone="system">بيانات نظام</DataRoleTag><span>{NAMES[item.kind]||item.kind} · {l(item.lang)} · {item.target}</span><DataRoleTag tone={item.status==='approved'?'content':item.status==='rejected'?'warning':'verification'}>{item.status==='approved'?'منشور بعد المراجعة':item.status==='rejected'?'مرفوض':'بانتظار مراجعة'}</DataRoleTag></div>
   {editing?.id===item.id?<DataRolePanel tone="content" title="تحرير النص المقترح" description="هذه حقول تحرير نص المحتوى. الحفظ لا ينشره تلقائيًا."><div className="space-y-2">
      <input className="w-full border rounded p-2" aria-label="عنوان المحتوى" value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})}/>
      <textarea className="w-full border rounded p-2" rows={2} aria-label="ملخص المحتوى" value={editing.summary} onChange={e=>setEditing({...editing,summary:e.target.value})}/>
      <textarea className="w-full border rounded p-2" rows={7} aria-label="نص المحتوى" value={editing.body} onChange={e=>setEditing({...editing,body:e.target.value})}/>
      <button className="btn-primary text-xs" disabled={saving} onClick={()=>void editItem(item)}>حفظ للمراجعة</button>
      <button className="btn-secondary text-xs ml-2" onClick={()=>setEditing(null)}>إلغاء</button>
    </div></DataRolePanel>:<>
      <DataRolePanel tone={item.kind==='technical_seo'||item.kind==='internal_link'?'technical':'content'} title={item.kind==='technical_seo'||item.kind==='internal_link'?'وصف مهمة تقنية — ليس نصًا للنشر':'المحتوى المقترح للاستخدام في الموقع'} description="هذا النص أنتجه النموذج ويحتاج إلى مراجعة قبل نشره، بخلاف تنبيهات النظام وبيانات البحث أدناه.">
        <h3 className="mb-2 break-words text-base font-bold text-emerald-950">{item.title}</h3>
        <p className="mb-3 text-sm font-medium text-slate-700">{item.summary}</p>
        <p className="whitespace-pre-line break-words text-sm text-slate-900">{item.body}</p>
      </DataRolePanel>
      <DataRolePanel tone="system" title="بيانات التصنيف من النظام" description="هذه معلومات تنظيمية عن المقترح، وليست نصًا للنشر.">
        <div className="flex flex-wrap gap-2"><DataRoleTag tone="system">{NAMES[item.kind]||item.kind}</DataRoleTag><DataRoleTag tone="system">{l(item.lang)}</DataRoleTag><DataRoleTag tone={item.risk_level==='high'?'warning':'verification'}>مستوى المخاطر: {item.risk_level==='high'?'عالٍ':item.risk_level==='medium'?'متوسط':'منخفض'}</DataRoleTag></div>
        {item.topic_node_id&&<p className="mt-2 text-xs text-slate-700">شجرة المحتوى: {topicNodeById(item.topic_node_id)?.primary_keyword[item.lang]||item.topic_node_id} · النية: {topicNodeById(item.topic_node_id)?.intent||'غير مصنفة'}</p>}
      </DataRolePanel>
      {(item.primary_keyword||item.h1_suggestion||(item.sections||[]).length>0||(item.internal_links||[]).length>0||(item.schema_suggestions||[]).length>0)&&<DataRolePanel tone="technical" title="توصيات SEO وبنية الصفحة" description="عناوين وكلمات وروابط مقترحة، وليست جزءًا تلقائيًا من النص الذي ينشره النظام.">
        {item.primary_keyword&&<p className="mb-2 text-sm"><strong>الكلمة الأساسية المقترحة:</strong> {item.primary_keyword}</p>}
        {item.h1_suggestion&&<p className="mb-2 text-sm"><strong>عنوان H1 المقترح:</strong> {item.h1_suggestion} <span className="text-xs">(لا يُغيَّر العنوان الحالي تلقائيًا)</span></p>}
        {(item.sections||[]).map((section,i)=><div key={i} className="mb-2 rounded-lg border border-violet-200 bg-white/80 p-3">
          <p className="text-sm font-semibold">H2: {section.h2}</p>
          {section.body&&<p className="mt-1 whitespace-pre-line text-sm">{section.body}</p>}
          {(section.subsections||[]).map((sub,j)=><div key={j} className="mt-2 border-r-2 border-violet-300 pr-3">
            <p className="text-xs font-semibold">H3: {sub.h3}</p>
            {sub.body&&<p className="mt-1 whitespace-pre-line text-xs">{sub.body}</p>}
          </div>)}
        </div>)}
        {(item.internal_links||[]).map((link,i)=><p className="mb-1 break-words text-xs" key={i}>رابط داخلي مقترح: {link.anchor} ← <span dir="ltr" className="inline-block">{topicNodeById(link.node_id)?.route||'مسار غير متاح'}</span></p>)}
        {(item.schema_suggestions||[]).length>0&&<p className="mt-2 text-xs"><strong>Schema المقترحة:</strong> {item.schema_suggestions?.join(' / ')} (لا تُنفذ إلا بعد مطابقتها للمحتوى المنشور)</p>}
      </DataRolePanel>}
      <DataRolePanel tone="research" title="صفحات منافسة ونتائج بحث مرتبطة بالموضوع" description="روابط رصد للمقارنة، وليست مصادر رسمية موثقة. وجودها لا يعني أن النص منسوخ من المنافس أو أن النموذج قرأ الصفحة كاملة.">
        {(item.evidence_refs||[]).length>0?<ul className="space-y-2">{(item.evidence_refs||[]).map(ref=><li key={ref.id} className="rounded-lg border border-blue-100 bg-white/80 p-2 text-xs break-words">
          {ref.url?.startsWith('https://')?<a className="text-blue-800 underline underline-offset-2" href={ref.url} target="_blank" rel="noopener noreferrer">{ref.label}</a>:ref.label}
          <p className="mt-1 text-blue-700">نوع الرصد: {ref.kind} · مزوّد الاكتشاف: {ref.source||'غير معروف'}</p>
        </li>)}</ul>:<p className="text-xs text-blue-900">لم تُرفق روابط رصد محفوظة بهذا المقترح.</p>}
      </DataRolePanel>
      {item.risk_level==='high'&&<DataRolePanel tone="warning" title="تنبيه من النظام — ليس جزءًا من النص المرشح للنشر">
        <p className="text-xs text-rose-900">لا تعتمد المحتوى عالي المخاطر قبل مراجعة مختص والتحقق من المصادر الرسمية. هذا التنبيه من النظام ولا يدخل ضمن المحتوى المنشور.</p>
      </DataRolePanel>}
      <DataRolePanel tone="verification" title="التحقق من المصادر الأصلية قبل النشر" description="هذه خطوة مراجعة بشرية مستقلة. روابط المنافسين أعلاه ليست بديلًا عن المصادر الرسمية.">
        {item.status==='approved'&&item.verified_sources?.length?
          <ul className="space-y-1">{item.verified_sources.map((url,i)=><li key={i} className="break-all text-xs">{url}</li>)}</ul>:
          <p className="mb-2 text-xs">أدخل المصادر الرسمية أو الأصلية التي تحققت منها بنفسك قبل اعتماد المحتوى.</p>}
      {item.status==='pending'&&<>
        <textarea aria-label="روابط المصادر التي تحققت منها" className="w-full rounded-lg border border-amber-300 bg-white p-3 text-sm" rows={3} placeholder="روابط HTTPS للمصادر الأصلية التي راجعتها فعليًا، رابط لكل سطر" value={sources[item.id]||''} onChange={e=>setSources({...sources,[item.id]:e.target.value})}/>
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
      </DataRolePanel>
   </li>)}</ul>
 </section>;
}
