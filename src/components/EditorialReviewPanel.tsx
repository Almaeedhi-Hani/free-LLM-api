'use client';
import React,{useState} from 'react';
import type {EditorialItem} from '@/lib/editorial-workflow';
import {validateEditorialItem,officialSourceCandidates,editorialPublicationIssues} from '@/lib/editorial-workflow';
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
export default function EditorialReviewPanel({items,saving,onSaveItems,adminSecret}:{items:EditorialItem[];saving:boolean;onSaveItems:(items:EditorialItem[])=>Promise<boolean>;adminSecret:string}){
 const [editing,setEditing]=useState<{id:string;title:string;summary:string;body:string}|null>(null);
 const [error,setError]=useState('');
 const [filter,setFilter]=useState('all');
 const [query,setQuery]=useState('');
 const [page,setPage]=useState(0);
 const [sourceDrafts,setSourceDrafts]=useState<Record<string,string>>({});
 const [reviewedSources,setReviewedSources]=useState<Record<string,string[]>>({});
 const [sourceResults,setSourceResults]=useState<Record<string,Array<{url:string;title:string;snippet:string}>>>({});
 const [searching,setSearching]=useState<string|null>(null);
 const [notice,setNotice]=useState('');
 const [expanded,setExpanded]=useState<string|null>(null);
 const pageSize=10;
 const filtered=items.filter(x=>(filter==='all'||x.status===filter)&&(!query.trim()||[x.title,x.summary,x.target,x.lang,x.kind].join(' ').toLowerCase().includes(query.trim().toLowerCase())));
 const visible=filtered.slice(page*pageSize,(page+1)*pageSize);
 const counts={pending:items.filter(x=>x.status==='pending').length,approved:items.filter(x=>x.status==='approved').length,rejected:items.filter(x=>x.status==='rejected').length};
 const update=async(next:EditorialItem[])=>{try{setError('');return await onSaveItems(next)}catch(e){setError(e instanceof Error?e.message:'تعذر حفظ التغييرات');return false}};
 const editItem=async(item:EditorialItem)=>{
   if(!editing||item.id!==editing.id)return;
   const next={...item,id:item.status==='approved'?item.id+'-rev-'+Date.now().toString(36):item.id,title:editing.title.trim(),summary:editing.summary.trim(),body:editing.body.trim(),status:'pending' as const,reviewedAt:undefined,verified_sources:[],updatedAt:new Date().toISOString()};
   try{validateEditorialItem(next)}catch(e){setError(e instanceof Error?e.message:'المحتوى غير مكتمل');return}
   // A new review never unpublishes the old approved page before replacement approval.
   const updated=item.status==='approved'?[...items,next]:items.map(x=>x.id===item.id?next:x);
   if(await update(updated)){
     setEditing(null);
     setReviewedSources(current=>{const copy={...current};delete copy[item.id];return copy;});
   }
 };
 const searchSources=async(item:EditorialItem)=>{
   setError('');setNotice('');setSearching(item.id);
   try{
     // Guides use unpublished article slugs; search the authority for their known parent service.
     const authorityTarget=item.related_service||item.target;
     const response=await fetch('/api/admin/editorial-sources',{method:'POST',headers:{'Content-Type':'application/json','x-admin-secret':adminSecret},body:JSON.stringify({title:item.title,lang:item.lang,primary_keyword:item.primary_keyword||'',target:authorityTarget})});
     const data=await response.json();
     if(!response.ok)throw Error(data.error||'تعذر البحث');
     setSourceResults(x=>({...x,[item.id]:data.results||[]}));
     setNotice(data.notice||'راجع المصادر المقترحة قبل إضافتها.');
   }catch(e){setError(e instanceof Error?e.message:'فشل البحث عن المصادر')}
   finally{setSearching(null)}
 };
 const addSource=async(item:EditorialItem)=>{
   const raw=(sourceDrafts[item.id]||'').trim();
   let url:URL;
   try{url=new URL(raw)}catch{setError('أدخل رابطًا حكوميًا صحيحًا يبدأ بـ https://');return}
   const host=url.hostname.toLowerCase();
   if(url.protocol!=='https:'||url.username||url.password||url.port||!(host==='gov.sa'||host.endsWith('.gov.sa'))){setError('يُقبل هنا فقط رابط HTTPS رسمي ضمن نطاق gov.sa.');return}
   if((item.evidence_refs||[]).length>=12){setError('بلغ المقترح الحد الأقصى للمراجع. راجع المراجع الحالية قبل إضافة أخرى.');return}
   if(!window.confirm('هل راجعت الصفحة الحكومية بنفسك وتأكدت أنها تدعم المعلومات المقترحة؟ إضافة الرابط لا تعني اعتماد المحتوى أو نشره.'))return;
   const next={...item,evidence_refs:[...item.evidence_refs,{id:'manual-'+Date.now().toString(36),label:url.hostname,source:'human-review',kind:'official-manual',url:url.href}],updatedAt:new Date().toISOString()};
   try{validateEditorialItem(next)}catch(e){setError(e instanceof Error?e.message:'تعذر إضافة المصدر');return}
   if(await update(items.map(x=>x.id===item.id?next:x))){setSourceDrafts(d=>({...d,[item.id]:''}));setNotice('حُفظ المصدر للمراجعة. افتح الرابط وتحقق من صحة المعلومات قبل النشر.');}
 };
 const deleteItem=async(item:EditorialItem)=>{
   if(!window.confirm(item.status==='approved'?'تحذير: حذف هذا المحتوى المنشور سيزيله من الموقع ومن قائمة المراجعة نهائيًا. هل تريد المتابعة؟':'حذف هذا المقترح نهائيًا من المحتوى المحفوظ؟ لا يمكن التراجع عن الحذف.'))return;
   if(!window.confirm('تأكيد أخير: هل تريد حذف هذا المحتوى نهائيًا؟'))return;
   if(await update(items.filter(x=>x.id!==item.id))){setExpanded(null);setPage(0);setNotice('تم حذف المقترح بعد حفظ التغييرات.')}
 };
 const approve=async(item:EditorialItem)=>{
   if(item.kind==='technical_seo'||item.kind==='internal_link'){setError('المهام التقنية والروابط المقترحة تحتاج تنفيذًا واختبارًا في الكود، وليس نشرًا تلقائيًا.');return;}
   const official=officialSourceCandidates(item.evidence_refs);
   if(!official.length){setError('لم يرصد النظام رابطًا حكوميًا رسميًا مرتبطًا بهذا المقترح. يبقى بانتظار البحث والمراجعة بدل النشر دون دليل.');return}
   const issues=editorialPublicationIssues(item);
   if(issues.length){setError('النص يتضمن تعليمات للمحرر وليست محتوى صالحًا للنشر. حرر النص أولًا، ثم أعد المراجعة.');return}
   const verified=(reviewedSources[item.id]||[]).filter(url=>official.includes(url));
   if(!verified.length){setError('افتح تفاصيل المقترح، ثم حدد المصدر الحكومي الذي راجعت مضمونه بنفسك. لن نعتمد كل الروابط المرصودة تلقائيًا.');return}
   const next={...item,status:'approved' as const,reviewedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),verified_sources:verified};
   try{validateEditorialItem(next)}catch(e){setError(e instanceof Error?e.message:'مصادر المراجعة غير صحيحة');return}
   if(!window.confirm('تأكيد بشري: هل فتحت روابط الجهات الحكومية المرصودة وتحققت أن المعلومات الواردة في المقترح تدعمها هذه الصفحات فعلًا؟ لا يكفي وجود الرابط وحده.'))return;
   if(await update(items.map(x=>x.id===item.id?next:(x.status==='approved'&&x.lang===item.lang&&x.kind===item.kind&&x.target===item.target&&x.slug===item.slug?{...x,status:'rejected' as const,updatedAt:new Date().toISOString()}:x))))setNotice('تم حفظ الاعتماد. يمكنك الآن معاينة الصفحة المنشورة.');
 };
 const reject=async(item:EditorialItem)=>{
   if(!window.confirm(item.status==='approved'?'إلغاء نشر هذا المحتوى من الموقع مع إبقاء سجله؟':'رفض هذا المقترح مع الاحتفاظ به في السجل؟'))return;
   await update(items.map(x=>x.id===item.id?{...x,status:'rejected' as const,updatedAt:new Date().toISOString()}:x));
 };
 return <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
  <h2 className="text-xl font-bold mb-2">محرك المحتوى متعدد المسارات</h2>
  <p className="text-slate-600 text-sm mb-3">مراجعة المقترحات قبل النشر. تفاصيل النص والمصادر وSEO تظهر عند فتح البطاقة فقط.</p>
  <p className="text-sm mb-3">بانتظار المراجعة: {counts.pending} · منشور: {counts.approved} · مرفوض/مسحوب: {counts.rejected}</p>
  <div className="flex flex-wrap gap-2 mb-4"><input aria-label="البحث في المقترحات" placeholder="بحث بالعنوان أو المسار..." className="border border-slate-300 rounded-lg p-2 flex-1 min-w-44" value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}}/>
  <select className="border border-slate-300 rounded-lg p-2" value={filter} onChange={e=>{setFilter(e.target.value);setPage(0)}} aria-label="تصفية حالة المقترحات">
   <option value="all">كل الحالات</option><option value="pending">تحت المراجعة</option><option value="approved">منشور</option><option value="rejected">مرفوض</option>
  </select></div>
  {notice&&<p role="status" className="text-emerald-800 text-sm mb-3">{notice}</p>}
  {error&&<p role="alert" className="text-red-700 text-sm mb-3">{error}</p>}
  {filtered.length===0&&<p className="text-slate-600">لا توجد مقترحات محفوظة بعد. يبدأ إنشاء المقترحات متعددة المسارات من تشغيلات GEO التالية؛ الأسئلة القديمة محفوظة بصورة منفصلة.</p>}
  <ul className="space-y-3">{visible.map(item=><li key={item.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 space-y-2">
   <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 text-xs text-slate-800"><DataRoleTag tone="system">بيانات نظام</DataRoleTag><span>{NAMES[item.kind]||item.kind} · {l(item.lang)} · {item.target}</span><DataRoleTag tone={item.status==='approved'?'content':item.status==='rejected'?'warning':'verification'}>{item.status==='approved'?(item.approval_method==='automated'?'منشور آليًا':'منشور بعد المراجعة'):item.status==='rejected'?'مرفوض':'بانتظار مراجعة'}</DataRoleTag></div>
   <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold text-slate-900 break-words">{item.title}</h3><p className="text-sm text-slate-600 line-clamp-2">{item.summary}</p></div><button className="btn-secondary text-xs shrink-0" aria-expanded={expanded===item.id} onClick={()=>setExpanded(expanded===item.id?null:item.id)}>{expanded===item.id?'إخفاء التفاصيل':'مراجعة التفاصيل'}</button></div>
   <div className="flex flex-wrap gap-2 items-center">
     {item.status==='approved'&&linkFor(item)&&<a href={linkFor(item)} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs">معاينة الصفحة</a>}
     {item.status==='pending'&&item.kind!=='technical_seo'&&item.kind!=='internal_link'&&<button className="btn-primary text-xs" disabled={saving} onClick={()=>void approve(item)}>اعتماد ونشر</button>}
     {item.status==='approved'&&<button className="btn-secondary text-xs" disabled={saving} onClick={()=>void reject(item)}>إلغاء النشر</button>}
     {item.status==='pending'&&<button className="btn-secondary text-xs" disabled={saving} onClick={()=>void reject(item)}>رفض</button>}
     <button className="btn-secondary text-xs text-red-700" disabled={saving} onClick={()=>void deleteItem(item)}>حذف</button>
     {item.status==='pending'&&officialSourceCandidates(item.evidence_refs).length===0&&<span className="text-xs text-amber-800">يلزم توثيق المصادر قبل النشر — اضغط «اعتماد ونشر» لمعرفة السبب أو افتح التفاصيل للبحث</span>}
   </div>
   {expanded===item.id&&(editing?.id===item.id?<DataRolePanel tone="content" title="تحرير النص المقترح" description="هذه حقول تحرير نص المحتوى. الحفظ لا ينشره تلقائيًا."><div className="space-y-2">
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
      {item.status==='pending'&&<div className="space-y-3 border-t border-slate-200 pt-3">
        <div className="flex flex-wrap gap-2"><button className="btn-secondary text-xs" disabled={saving||searching!==null} onClick={()=>void searchSources(item)}>{searching===item.id?'جارٍ البحث...':'بحث ذكي عن مصادر حكومية'}</button></div>
        {(sourceResults[item.id]||[]).length>0&&<ul className="space-y-2">{sourceResults[item.id].map(result=><li key={result.url} className="border rounded-lg p-2 text-xs"><a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-800 underline break-all">{result.title||result.url}</a><p className="text-slate-600">{result.snippet}</p><button className="btn-secondary text-xs mt-2" onClick={()=>setSourceDrafts(d=>({...d,[item.id]:result.url}))}>اختيار الرابط لإضافته بعد المراجعة</button></li>)}</ul>}
        <div className="flex flex-wrap gap-2"><input aria-label="رابط مصدر حكومي رسمي" className="border rounded-lg p-2 flex-1 min-w-40 text-sm" dir="ltr" placeholder="https://...gov.sa/..." value={sourceDrafts[item.id]||''} onChange={e=>setSourceDrafts(d=>({...d,[item.id]:e.target.value}))}/><button className="btn-secondary text-xs" disabled={saving||!sourceDrafts[item.id]?.trim()} onClick={()=>void addSource(item)}>إضافة مصدر موثق</button></div>
        <div className="flex flex-wrap items-center gap-2">
          <DataRoleTag tone="verification">{officialSourceCandidates(item.evidence_refs).length>0?'رصد آلي لروابط جهات حكومية':'بانتظار رصد مصادر حكومية'}</DataRoleTag>
          {officialSourceCandidates(item.evidence_refs).length===0&&<span className="text-xs text-amber-800">لم يُرفق مصدر رسمي بعد. استخدم البحث الذكي أو أضف رابطًا يدويًا، ثم راجعه قبل النشر.</span>}
        </div>
        {officialSourceCandidates(item.evidence_refs).length>0&&<div className="space-y-2">
          <p className="text-xs text-amber-900">لا يعني وجود نطاق حكومي صحة أي معلومة. افتح كل مصدر وتحقق من دعم النص، ثم حدد فقط المصادر التي راجعتها قبل الضغط على «اعتماد ونشر».</p>
          <ul className="space-y-2">
            {officialSourceCandidates(item.evidence_refs).map(url=><li key={url} className="text-xs break-all">
              <label className="flex items-start gap-2">
                <input type="checkbox" aria-label={'راجعت المصدر '+url}
                  checked={(reviewedSources[item.id]||[]).includes(url)}
                  onChange={e=>setReviewedSources(current=>{
                    const selected=current[item.id]||[];
                    return {...current,[item.id]:e.target.checked?Array.from(new Set([...selected,url])):selected.filter(x=>x!==url)};
                  })}/>
                <span>راجعت المصدر وتأكدت من صلته بالمحتوى: <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-800 underline underline-offset-2">{url}</a></span>
              </label>
            </li>)}
          </ul>
        </div>}
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary text-xs" disabled={saving} onClick={()=>setEditing({id:item.id,title:item.title,summary:item.summary,body:item.body})}>تحرير المقترح</button>

  
        </div>
      </div>}
      {item.status==='approved'&&<div className="flex gap-3 flex-wrap border-t border-slate-200 pt-3">

        <button className="btn-secondary text-xs" disabled={saving} onClick={()=>setEditing({id:item.id,title:item.title,summary:item.summary,body:item.body})}>إنشاء تعديل للمراجعة</button>

      </div>}
    </>)}
   </li>)}</ul>
   <div className="flex justify-between items-center mt-4 text-sm"><span>عرض {filtered.length===0?0:page*pageSize+1}–{Math.min(filtered.length,(page+1)*pageSize)} من {filtered.length}</span><div className="flex gap-2"><button className="btn-secondary text-xs" disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>السابق</button><button className="btn-secondary text-xs" disabled={(page+1)*pageSize>=filtered.length} onClick={()=>setPage(p=>p+1)}>التالي</button></div></div>
 </section>;
}
