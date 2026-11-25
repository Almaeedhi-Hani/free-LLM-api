'use client';
import {useEffect,useState} from 'react';
type Report={metrics:{since:string;requests:number;botRequests:number;bodyBytes:number;averageServerMs:number|null;aiReferrals:number;byFeed:{path:string;requests:number;botRequests:number;bytes:number;averageServerMs:number|null}[]};feeds:string[];citations:{samples:number;citations:number}|null};
export default function AIKnowledgeReport({adminSecret}:{adminSecret:string}){
 const [data,setData]=useState<Report|null>(null),[error,setError]=useState(false),[refresh,setRefresh]=useState(0);
 useEffect(()=>{const controller=new AbortController();setError(false);fetch('/api/admin/ai-knowledge',{headers:{'x-admin-secret':adminSecret},cache:'no-store',signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(setData).catch(()=>{if(!controller.signal.aborted){setData(null);setError(true)}});return()=>controller.abort()},[adminSecret,refresh]);
 return <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3" aria-label="تغذية الذكاء الاصطناعي">
 <div className="flex items-center justify-between"><h3 className="font-bold">تغذية الذكاء الاصطناعي</h3><button className="btn-secondary text-xs" onClick={()=>setRefresh(n=>n+1)}>تحديث</button></div>
 <p className="text-xs text-slate-600">قياسات الطلبات في عملية الخادم الحالية فقط خلال آخر 24 ساعة تقريبًا، تُصفّر عند إعادة التشغيل. هوية الروبوت مستنتجة من الترويسة وليست مؤكدة. الحجم قبل الضغط، والوقت وقت الخادم، والإحالات مشاهدات وافقت على التحليلات وليست زوارًا فريدين.</p>
 {error?<p role="alert">القياسات غير متاحة</p>:!data?<p>جارٍ تحميل القياسات…</p>:<>
 <p className="text-xs">بداية القياس: {new Date(data.metrics.since).toLocaleString('ar-SA')}</p>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{[['طلبات التغذية',data.metrics.requests],['طلبات روبوت محتمل',data.metrics.botRequests],['الحجم قبل الضغط (بايت)',data.metrics.bodyBytes],['متوسط زمن الخادم (ms)',data.metrics.averageServerMs],['إحالات AI بموافقة',data.metrics.aiReferrals],['استشهادات موثقة / عينات (28 يوم)',data.citations?data.citations.citations+' / '+data.citations.samples:null]].map(([k,v])=><div key={String(k)} className="border rounded-lg p-2"><p className="text-xs">{k}</p><strong>{v??'غير متاح'}</strong></div>)}</div>
 <div className="overflow-x-auto"><table className="w-full text-xs text-right"><thead><tr><th>الملف</th><th>الطلبات</th><th>الروبوتات المحتملة</th><th>بايت</th><th>زمن ms</th></tr></thead><tbody>{data.metrics.byFeed.map(r=><tr key={r.path}><td dir="ltr">{r.path}</td><td>{r.requests}</td><td>{r.botRequests}</td><td>{r.bytes}</td><td>{r.averageServerMs??'—'}</td></tr>)}</tbody></table></div>
 <details><summary className="cursor-pointer text-sm">روابط التغذية العامة</summary><div className="flex flex-wrap gap-2 mt-2">{data.feeds.map(p=><a dir="ltr" key={p} href={p} target="_blank" rel="noopener noreferrer" className="text-xs underline">{p}</a>)}</div></details>
 </>}
 </section>
}
