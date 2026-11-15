import type {ReactNode} from 'react';

// The same meaning always uses the same color in the admin review surfaces.
// These are presentation roles, NOT claims of verification or publication.
export type DataRoleTone='content'|'system'|'research'|'verification'|'warning'|'technical';
const COLOR:Record<DataRoleTone,{panel:string;heading:string;dot:string;tag:string}>={
  content:{panel:'bg-emerald-50/70 border-emerald-200',heading:'text-emerald-950',dot:'bg-emerald-600',tag:'bg-emerald-100 text-emerald-900 border-emerald-200'},
  system:{panel:'bg-slate-50 border-slate-200',heading:'text-slate-900',dot:'bg-slate-600',tag:'bg-slate-100 text-slate-800 border-slate-200'},
  research:{panel:'bg-blue-50/80 border-blue-200',heading:'text-blue-950',dot:'bg-blue-600',tag:'bg-blue-100 text-blue-900 border-blue-200'},
  verification:{panel:'bg-amber-50/80 border-amber-300',heading:'text-amber-950',dot:'bg-amber-600',tag:'bg-amber-100 text-amber-900 border-amber-200'},
  warning:{panel:'bg-rose-50 border-rose-300',heading:'text-rose-900',dot:'bg-rose-600',tag:'bg-rose-100 text-rose-900 border-rose-200'},
  technical:{panel:'bg-violet-50/80 border-violet-200',heading:'text-violet-950',dot:'bg-violet-600',tag:'bg-violet-100 text-violet-900 border-violet-200'}
};
const LEGEND:{tone:DataRoleTone;label:string}[]=[
  {tone:'content',label:'محتوى مقترح للاستخدام'},
  {tone:'system',label:'بيانات من النظام'},
  {tone:'research',label:'روابط رصد وبحث'},
  {tone:'verification',label:'مصادر تحتاج تحققًا'},
  {tone:'warning',label:'تنبيه لا يدخل ضمن النص'},
  {tone:'technical',label:'توصيات SEO وتقنية'}
];
export function DataRoleTag({tone,children}:{tone:DataRoleTone;children:ReactNode}){
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-relaxed ${COLOR[tone].tag}`}>
    <span className={`h-2 w-2 shrink-0 rounded-full ${COLOR[tone].dot}`} aria-hidden="true"/>
    {children}
  </span>;
}
export function DataRoleLegend(){
  return <div role="note" aria-label="دليل ألوان بيانات لوحة الإدارة" className="rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
    <p className="mb-2 text-xs font-bold text-slate-800">دليل الألوان — لمعرفة ما سيُستخدم في الموقع وما أضافه النظام:</p>
    <div className="flex flex-wrap gap-2">{LEGEND.map(x=><DataRoleTag key={x.tone} tone={x.tone}>{x.label}</DataRoleTag>)}</div>
  </div>;
}
export function DataRolePanel({tone,title,description,children,className=''}:{tone:DataRoleTone;title:string;description?:string;children:ReactNode;className?:string}){
  return <section aria-label={title} className={`min-w-0 rounded-xl border p-3 sm:p-4 ${COLOR[tone].panel} ${className}`}>
    <h4 className={`mb-1 flex items-center gap-2 text-sm font-bold ${COLOR[tone].heading}`}>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLOR[tone].dot}`} aria-hidden="true"/>
      {title}
    </h4>
    {description&&<p className={`mb-3 text-xs leading-relaxed ${COLOR[tone].heading}`}>{description}</p>}
    <div className="min-w-0 break-words text-sm leading-7">{children}</div>
  </section>;
}
