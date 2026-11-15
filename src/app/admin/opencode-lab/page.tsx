'use client';
import { useEffect, useState } from 'react';
type Model={id:string;free:boolean};
type Entry={role:'user'|'assistant';text:string;time?:number};
export default function OpenCodeLab(){
 const [secret,setSecret]=useState('');
 const [models,setModels]=useState<Model[]>([]);
 const [model,setModel]=useState('');
 const [search,setSearch]=useState('');
 const [filter,setFilter]=useState('all');
 const [input,setInput]=useState('');
 const [history,setHistory]=useState<Entry[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 async function load(){
  setLoading(true);setError('');
  try{
   const r=await fetch('/api/admin/opencode-lab',{headers:{'x-admin-secret':secret},cache:'no-store'});
   const d=await r.json();if(!r.ok)throw Error(d.detail||d.error||'فشل الاتصال');
   setModels(d.models||[]);setModel(v=>d.models?.some((m:Model)=>m.id===v)?v:(d.models?.[0]?.id||''));
  }catch(e){setError(String(e));}finally{setLoading(false);}
 }
 async function send(){
  if(!input.trim()||!model||busy)return;
  const msg=input;setInput('');setHistory(v=>[...v,{role:'user',text:msg}]);setBusy(true);setError('');
  try{
   const r=await fetch('/api/admin/opencode-lab',{method:'POST',headers:{'Content-Type':'application/json','x-admin-secret':secret},body:JSON.stringify({model,message:msg})});
   const d=await r.json();
   if(!r.ok)throw Error(d.detail||d.error||'تعذر الاتصال');
   setHistory(v=>[...v,{role:'assistant',text:d.reply||'(لا توجد استجابة)',time:d.durationMs}]);
   if(!d.ok)setError('انتهت محاولة OpenCode برمز '+d.exitCode);
  }catch(e){setError(String(e));}finally{setBusy(false);}
 }
 const visible=models.filter(m=>(filter==='all'||(filter==='free'?m.free:!m.free))&&m.id.toLowerCase().includes(search.toLowerCase()));
 return <main dir="rtl" className="mx-auto max-w-5xl p-4 md:p-8 text-slate-100 min-h-screen bg-slate-950">
  <div className="flex justify-between items-center gap-3 mb-6"><div><h1 className="text-2xl font-bold">مختبر OpenCode</h1><p className="text-slate-400 text-sm mt-2">محادثة تشخيصية مع النماذج المكتشفة تلقائيًا. لا ينشر محتوى أو يغير بيانات الموقع.</p></div><a className="text-orange-300 underline" href="/admin/dashboard">العودة للوحة الإدارة</a></div>
  <div className="grid md:grid-cols-3 gap-4">
   <aside className="bg-slate-900 rounded-xl p-4 space-y-3 md:col-span-1">
    <label className="block text-sm">مفتاح المدير (يبقى في هذه الصفحة فقط)<input type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)} className="w-full mt-1 p-2 rounded bg-slate-800 border border-slate-700"/></label>
    <button onClick={load} disabled={!secret||loading} className="w-full rounded-lg p-2 bg-orange-600 disabled:opacity-50">{loading?'جارٍ التحديث...':'تحديث جميع النماذج'}</button>
    <input placeholder="ابحث عن نموذج أو مزود" value={search} onChange={e=>setSearch(e.target.value)} className="w-full p-2 rounded bg-slate-800 border border-slate-700"/>
    <select aria-label="تصفية النماذج" value={filter} onChange={e=>setFilter(e.target.value)} className="w-full p-2 rounded bg-slate-800"><option value="all">جميع النماذج</option><option value="free">المجانية</option><option value="paid">غير المؤكدة / المدفوعة</option></select>
    <p className="text-sm text-slate-400">{visible.length} من {models.length} نموذج</p>
    <select aria-label="النموذج المختار" size={Math.min(Math.max(visible.length,3),12)} value={model} onChange={e=>setModel(e.target.value)} className="w-full bg-slate-800 rounded p-2 text-sm">{visible.map(m=><option key={m.id} value={m.id}>{m.id}{m.free?' · مجاني':''}</option>)}</select>
    <p className="text-xs text-amber-300">يمكن عرض كل النماذج. تشغيل النماذج المدفوعة أو غير المؤكدة محظور لحماية التكلفة حتى اعتماد آلية موافقة مستقلة.</p>
   </aside>
   <section className="md:col-span-2 bg-slate-900 rounded-xl p-4 flex flex-col min-h-[530px]">
    <div className="flex justify-between gap-2 border-b border-slate-700 pb-3"><span className="text-sm text-slate-300 break-all">{model||'اختر نموذجًا'}</span><button onClick={()=>setHistory([])} className="text-xs underline text-slate-400">مسح المحادثة</button></div>
    <div className="flex-1 space-y-3 overflow-y-auto py-4 max-h-[500px]" aria-live="polite">{history.length===0&&<p className="text-slate-500">اختر نموذجًا، واكتب رسالة لاختبار الاستجابة.</p>}{history.map((m,i)=><div key={i} className={'rounded-xl p-3 whitespace-pre-wrap break-words text-sm '+(m.role==='user'?'bg-slate-800 mr-8':'bg-slate-950 ml-8')}><div className="text-xs text-orange-300 mb-2">{m.role==='user'?'أنت':'OpenCode'}{m.time!==undefined?' · '+(m.time/1000).toFixed(1)+' ثانية':''}</div>{m.text}</div>)}{busy&&<p className="text-orange-300 text-sm">النموذج يعالج الرسالة...</p>}</div>
    {error&&<p role="alert" className="text-red-300 bg-red-950/40 p-2 rounded text-sm mb-3 break-words">{error}</p>}
    <form onSubmit={e=>{e.preventDefault();void send();}} className="flex gap-2"><textarea aria-label="رسالة الاختبار" value={input} onChange={e=>setInput(e.target.value)} maxLength={8000} rows={3} placeholder="اكتب رسالتك..." className="flex-1 min-w-0 p-3 bg-slate-800 rounded-lg border border-slate-700"/><button type="submit" disabled={busy||!model||!secret||!input.trim()} className="px-5 rounded-lg bg-orange-600 disabled:opacity-40">إرسال</button></form>
   </section>
  </div>
 </main>;
}
