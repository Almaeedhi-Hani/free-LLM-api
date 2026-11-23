'use client';
import React, {useState, useEffect} from 'react';

type RecordItem = Record<string, unknown>;
type Props = {
  secret: string;
  runs: RecordItem[];
  competitors: RecordItem[];
  keywords: RecordItem[];
  opportunities: RecordItem[];
  goals: RecordItem[];
  sources: RecordItem[];
  loading: boolean;
  refresh: () => void;
};
const providers = ['Exa','Tavily','Parallel','Firecrawl'];
const str = (value: unknown) => typeof value === 'string' ? value : '';
export default function GeoEngineMonitor({secret,runs,competitors,keywords,opportunities,goals,sources,loading,refresh}:Props) {
  const [workflow,setWorkflow]=useState<{configured?:boolean;
    schedule?:{cadence:string;cron_utc:string;saudi_time:string;transitionSaudi:string;time_zone:string;state:string;active:boolean|null};
    llmIndex?:{available:boolean;url:string;runs:Array<{id:number;status:string;conclusion:string|null;html_url?:string}>};
    lastAnalysis?:{lastRun:string|null;status:string;available:boolean;languages:Record<string,string>};
    runs?:Array<{id:number;status:string;conclusion:string|null;created_at?:string;html_url?:string}>;message?:string}>({});
  const [busy,setBusy]=useState(false);
  const [feedback,setFeedback]=useState('');
  const loadWorkflow=async()=>{
    try {
      const response=await fetch('/api/admin/geo-engine',{headers:{'x-admin-secret':secret},cache:'no-store'});
      const data=await response.json();
      setWorkflow(response.ok?data:{message:data.message||'تعذر قراءة حالة GitHub'});
    } catch {setWorkflow({message:'تعذر الاتصال بـ GitHub'});}
  };
  useEffect(()=>{if(secret) void loadWorkflow();},[secret]);
  const active=workflow.runs?.some(run=>['queued','in_progress','waiting','pending','requested'].includes(run.status))||false;
  const start=async()=>{
    if(busy||active||!workflow.configured)return;
    setBusy(true);setFeedback('');
    try{
      const response=await fetch('/api/admin/geo-engine',{method:'POST',headers:{'x-admin-secret':secret}});
      const data=await response.json();
      setFeedback(response.ok?'تم قبول طلب التشغيل؛ النتيجة لم تتأكد بعد.':data.message||'فشل طلب التشغيل');
      await loadWorkflow();
    }catch{setFeedback('تعذر الاتصال بالخادم');}finally{setBusy(false);}
  };
  const latest = [...runs].sort((a,b) => Date.parse(str(b.started_at)||'1970-01-01')-Date.parse(str(a.started_at)||'1970-01-01'))[0];
  const status = latest ? str(latest.status) || 'غير معروف' : 'لم يُسجل تشغيل';
  const completedRuns = runs.filter(run => ['success','completed'].includes(str(run.status).toLowerCase())).length;
  const failedRuns = runs.filter(run => ['failed','error'].includes(str(run.status).toLowerCase())).length;
  const runningRuns = runs.filter(run => ['running','in_progress'].includes(str(run.status).toLowerCase())).length;
  const uniqueSources = new Set(sources.map(source => str(source.url) || str(source.link) || str(source.source_url)).filter(Boolean));
  const counts = [
    ['المنافسون',competitors.length],['الكلمات المفتاحية',keywords.length],
    ['الفرص',opportunities.length],['الأهداف',goals.length],['السجل القديم',runs.length]
  ] as const;
  return <section dir="rtl" className="rounded-xl border border-slate-200 p-5 space-y-4">
    <div className="flex flex-wrap justify-between items-center gap-3">
      <div><h2 className="font-bold text-lg">مراقبة محرك GEO الجديد</h2>
        <p className="text-sm text-slate-500">مؤشرات من السجلات المحفوظة؛ لا تمثل اتصالاً حيًا بالمزودين أو إثباتًا لتشغيل المحرك الآن.</p></div>
      <button type="button" disabled={loading} onClick={refresh} className="rounded-lg border px-4 py-2 disabled:opacity-50">{loading?'جارٍ التحديث':'تحديث البيانات'}</button>
    </div>
    <p className="text-sm">آخر حالة في سجل السوق القديم (وليست GitHub): <strong>{status}</strong> — {latest?.started_at ? new Date(str(latest.started_at)).toLocaleString('ar-SA') : 'لا يوجد وقت مسجل'}</p>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{counts.map(([label,count])=><div key={label} className="rounded-lg border p-3"><div className="text-sm text-slate-500">{label}</div><div className="text-xl font-bold">{count}</div></div>)}</div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
      <div className="rounded-lg border p-3">تشغيلات ناجحة مسجلة: <strong>{completedRuns}</strong></div>
      <div className="rounded-lg border p-3">تشغيلات فاشلة مسجلة: <strong>{failedRuns}</strong></div>
      <div className="rounded-lg border p-3">تشغيلات مسجلة كجارية: <strong>{runningRuns}</strong></div>
    </div>
    <p className="text-xs text-slate-500">الحالات مستخرجة من السجلات المحفوظة، وقد تكون قديمة؛ لا تعني وجود تشغيل حي.</p>
    <div className="rounded-lg border p-3 space-y-2">
      <h3 className="font-semibold">التحكم الآمن بمحرك GEO</h3>
      <p className="text-sm">{workflow.configured?'GitHub Actions متصل':'غير مهيأ: '+(workflow.message||'يلزم إعداد GEO_GITHUB_TOKEN')}</p>
      <p className="text-sm font-semibold" role="status">{!workflow.schedule?
        'جدولة السلاح السري: الحالة غير متاحة':
        workflow.schedule.active===true?'جدولة الإنتاج الموحدة مفعّلة: كل 10 دقائق، مع مراقبة وجودة وGSC مستقلة':
        workflow.schedule.active===false?'ملف التشغيل الإنتاجي الموحد معطّل في GitHub Actions':
        'تعذّر تأكيد تفعيل جدولة الإنتاج الموحدة من GitHub'}</p>
      <p className="text-xs text-slate-500">Master الإنتاجي يعمل كل 10 دقائق ويستدعي أنظمة Radar وGEO والنشر الحقيقي بالتوالي، مع استقلال LLM Feed والصيانة. تتحقق بوابة الاستحقاق قبل أي استدعاء مكلف وفق جدولة الأربع ساعات وحدود المزودين السابقة؛ فلا تُستدعى API أو تُنشر مواد جديدة في كل نبضة. GSC وSafety Monitor وQuality Watch تعمل بجداول مستقلة. نجاح GitHub وحده لا يثبت حفظ بيانات جديدة.</p>
      <div className="rounded-lg border border-slate-200 p-3 text-xs space-y-1">
        <p className="font-semibold">توزيع الأنظمة في الهيكلة الهجينة</p>
        <p>Master الإنتاجي كل 10 دقائق: Radar ← GEO ← النشر الحقيقي عند الاستحقاق، مع استمرار GEO إذا فشل Radar. W05 والصيانة تعملان باستقلال.</p>
        <p>عند موعد الاستحقاق المحدد مسبقًا، يُنفّذ Radar وGEO والنشر وLLM Feed والصيانة العمليات الإنتاجية الحقيقية؛ أما بقية نبضات الـ10 دقائق فتتحقق من بوابة التوقيت ولا تستهلك حصص AI.</p>
        <p>GSC: مزامنة تلقائية مستقلة (03:45 و09:00 و13:00 و17:00 و21:00 و01:00 بتوقيت السعودية) مع منع تكرار الأيام في الخادم.</p>
        <p>LLM Feed: فحص حيّ لملف /llms.txt دون إنشاء PR.</p>
        <p>Safety Monitor يعمل كل 6 ساعات ويكشف غياب Master حتى لو توقف تمامًا؛ Quality Watch يوميًا، وكلاهما مستقل عن نجاح Radar.</p>
        <p><a href="https://github.com/Almaeedhi-Hani/free-LLM-api/actions/workflows/v3-unified-sequential-test.yml" target="_blank" rel="noopener noreferrer" className="underline">عرض التشغيلات الموحدة في GitHub</a></p>
        <p><a href="/llms.txt" target="_blank" rel="noopener noreferrer" className="underline">فتح فهرس LLM المنشور</a></p>
        {workflow.llmIndex?.runs?.slice(0,2).map(run=><p key={run.id}>
          {run.html_url?<a href={run.html_url} target="_blank" rel="noopener noreferrer" className="underline">مراجعة LLM #{run.id}</a>:'LLM #'+run.id}
          : {run.status} — {run.conclusion||'لم يكتمل بعد'}
        </p>)}
      </div>
      <div className="rounded-lg border p-3 space-y-2" aria-label="حالة اللغات في آخر تحليل محفوظ">
       <p className="text-sm font-semibold">اللغات — آخر تحليل محفوظ {workflow.lastAnalysis?.lastRun?
          '('+new Date(workflow.lastAnalysis.lastRun).toLocaleString('ar-SA')+')':''}</p>
       {!workflow.lastAnalysis?.available?<p className="text-xs text-slate-500">لم تُحفظ نتائج منفصلة للغات بعد؛ راجع تقرير GitHub.</p>:
       <div className="grid grid-cols-3 gap-2">
        {([['ar','العربية'],['en','English'],['zh','中文']] as const).map(([lang,label])=>{
         const state=workflow.lastAnalysis?.languages[lang]||'not_run';
         return <div key={lang} className="rounded-lg border p-2 text-xs">
          <p className="font-semibold">{label}</p>
          <p className={state==='analyzed'?'text-emerald-700':'text-amber-800'}>
           {state==='analyzed'?'اكتمل':state==='model_unavailable'?'النموذج غير متاح':
            state==='missing_evidence'?'لا توجد أدلة كافية':'لم يُسجل تحليل'}
          </p>
         </div>;
        })}
       </div>}
       <p className="text-xs text-slate-500">هذه نتائج آخر تحليل محفوظ في Supabase؛ قد تختلف عن أحدث تشغيل جارٍ في GitHub.</p>
      </div>
      <button type="button" disabled={busy||active||!workflow.configured} onClick={()=>void start()} className="rounded-lg border px-4 py-2 disabled:opacity-50">تشغيل محرك GEO</button>
      <button type="button" onClick={()=>void loadWorkflow()} className="rounded-lg border px-4 py-2 mx-2">تحديث الحالة</button>
      {feedback&&<p role="status" className="text-sm">{feedback}</p>}
      {workflow.runs?.slice(0,3).map(run=><p key={run.id} className="text-xs">{run.html_url?<a href={run.html_url} rel="noopener noreferrer" target="_blank" className="underline">تشغيل #{run.id}</a>:'تشغيل #'+run.id}: {run.status} — {run.conclusion||'لم ينته'}</p>)}
      <p className="text-xs text-slate-500">التشغيل محمي بمفتاح المدير ويتطلب GEO_GITHUB_TOKEN بصلاحية Actions:write. إعدادات النشر التلقائي ومتابعة المنشورات تُدار منفصلًا من مركز المحتوى والأثر.</p>
    </div>
    <h3 className="font-semibold">مزودو البحث</h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{providers.map(name=>{
      const recorded=sources.some(s=>JSON.stringify(s).toLowerCase().includes(name.toLowerCase()));
      return <div key={name} className="rounded-lg border p-3"><strong>{name}</strong><p className="text-xs text-slate-500">{recorded?'مذكور في سجلات الاكتشاف؛ الاتصال غير مفحوص':'لا يوجد رصد محفوظ؛ الاتصال غير مفحوص'}</p></div>;
    })}</div>
    <h3 className="font-semibold">رصد مصادر الأدلة</h3>
    <p className="text-sm">سجلات المصادر: <strong>{sources.length}</strong> — روابط فريدة معروفة: <strong>{uniqueSources.size}</strong></p>
    <p className="text-xs text-slate-500">السجلات التي لا تتضمن رابطًا معروفًا لا تُحتسب ضمن الروابط الفريدة. لا يمكن استنتاج التكرارات الفعلية أو تغطية خمس صفحات لكل كلمة ولغة من هذه الأعداد.</p>
    <h3 className="font-semibold">آخر سجلات التشغيل</h3>
    {runs.length === 0 ? <p className="text-sm text-slate-500">لا توجد سجلات تشغيل محفوظة حتى الآن.</p> :
      <div className="overflow-x-auto"><table className="w-full text-sm text-right"><thead><tr className="border-b"><th className="p-2">وقت البدء</th><th className="p-2">الحالة المسجلة</th><th className="p-2">المعرف</th></tr></thead><tbody>
        {[...runs].sort((a,b)=>Date.parse(str(b.started_at)||'1970-01-01')-Date.parse(str(a.started_at)||'1970-01-01')).slice(0,10).map((run,index)=><tr key={str(run.id)||index} className="border-b"><td className="p-2">{str(run.started_at)||'غير مسجل'}</td><td className="p-2">{str(run.status)||'غير معروف'}</td><td className="p-2 font-mono">{str(run.id)||'—'}</td></tr>)}
      </tbody></table></div>}
    <p className="text-xs text-slate-500">هذه سجلات التحليل القديم وقد تكون فارغة. سجل تشغيلات GitHub الفعلي موجود في «التشغيل والإعدادات ← سجل التشغيل».</p>
    <p className="text-xs text-slate-500">التحكم اليدوي في محرك GEO متاح من زر التشغيل أعلاه عندما يكون اتصال GitHub مهيأ. الأرقام المحفوظة لا تؤكد جودة تغطية النتائج أو ترتيب Google الفعلي.</p>
  </section>;
}
