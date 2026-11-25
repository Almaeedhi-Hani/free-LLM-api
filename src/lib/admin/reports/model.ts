import type {Cell,Section} from './types';

const labels:Record<string,string>={ar:'العربية',en:'الإنجليزية',zh:'الصينية',critical:'حرجة',high:'عالية',medium:'متوسطة',low:'منخفضة',open:'مفتوح',in_progress:'قيد التنفيذ',done:'مكتمل',cancelled:'ملغى',pending:'بانتظار الاعتماد',running:'قيد التنفيذ',success:'ناجح',failed:'لم يكتمل',partial:'جزئي',radar:'رصد السوق',discovery:'الاكتشاف',keyword_collection:'الكلمات المفتاحية',gap_analysis:'تحليل الفرص',goal_generation:'توليد الأهداف',full:'تحليل شامل'};
const resultFields=[
 ['competitor_names_analyzed','competitors_analyzed','المنافسون الذين تم تحليلهم'],
 ['keyword_terms_analyzed','keywords_analyzed','الكلمات التي تم تحليلها'],
 ['opportunity_titles_created','opportunities_created','الفرص الجديدة'],
 ['goal_titles_created','goals_created','الأهداف الجديدة'],
 ['keyword_terms_saved','keywords_upserted','الكلمات المحفوظة أو المحدثة'],
 ['competitor_domains_discovered','competitors_discovered','المنافسون الذين تم رصدهم']
] as const;
function runResults(summary:Record<string,unknown>|null|undefined):string{
 const lines:string[]=[];
 const missing:string[]=[];
 for(const [key,count,label] of resultFields){
  const values=summary?.[key];
  const names=Array.isArray(values)?values.filter((x):x is string=>typeof x==='string'&&!!x.trim()):[];
  if(names.length)lines.push(label+': '+names.join('، '));
  else if(typeof summary?.[count]==='number'&&Number(summary[count])>0)missing.push(label);
 }
 if(summary?.opportunities_created===0&&summary?.goals_created===0)lines.push('لم تُنشأ فرص أو أهداف جديدة');
 else if(summary?.opportunities_created===0)lines.push('لم تُنشأ فرص جديدة');
 else if(summary?.goals_created===0)lines.push('لم تُنشأ أهداف جديدة');
 if(summary?.keywords_upserted===0)lines.push('لم تُحفظ أو تُحدّث كلمات');
 if(summary?.competitors_discovered===0)lines.push('لم يُرصد منافسون في هذه الدورة');
 if(missing.length)lines.push('لم تُحفظ أسماء النتائج في السجل: '+missing.join('، '));
 return lines.join('\n')||'لا تتوفر تفاصيل نتائج محفوظة لهذه الدورة';
}
const text=(v:unknown):Cell=>v==null?'غير متاح':typeof v==='number'?v:Array.isArray(v)?v.map(String).join('، '):String(v);
const label=(v:unknown)=>labels[String(v)]||'غير محدد';
const date=(v:unknown)=>{const d=new Date(String(v));return Number.isFinite(d.getTime())?d.toLocaleDateString('ar-SA',{calendar:'gregory',timeZone:'Asia/Riyadh'}):'غير متاح'};
const website=(v:unknown)=>{try{const raw=String(v||'').trim();if(!raw)return 'غير متاح';const u=new URL(raw.startsWith('https://')||raw.startsWith('http://')?raw:'https://'+raw);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password&&u.hostname.includes('.')?u.href:'غير متاح'}catch{return 'غير متاح'}};
export function build(d:Record<string,any>):Section[]{
 const make=(name:string,cols:string[],records:any[],row:(r:any)=>Cell[]):Section=>{
  if(!Array.isArray(records))throw Error('بيانات التقرير غير مكتملة');
  return {name,cols,rows:records.map(row)};
 };
 const opportunities=d.opportunities as any[];
 const s=[
 make('المنافسون',['اسم المنافس','رابط الموقع'],d.competitors,r=>[text(r.name),website(r.domain)]),
 make('الكلمات المفتاحية',['الكلمة المفتاحية','اللغة','حجم البحث'],d.keywords,r=>[text(r.term),label(r.language),text(r.search_volume)]),
 make('فرص الكلمات',['الفرصة','الكلمات المرتبطة','الأولوية'],opportunities.filter(r=>r.type==='keyword_gap'),r=>[text(r.title),Array.isArray(r.related_keywords)&&r.related_keywords.length?text(r.related_keywords):'لا توجد كلمات مرتبطة محفوظة',label(r.priority)]),
 make('فرص المنافسين',['الفرصة','الأولوية'],opportunities.filter(r=>r.type==='content_gap'),r=>[text(r.title),label(r.priority)]),
 make('فرص أخرى',['الفرصة','الأولوية'],opportunities.filter(r=>!['keyword_gap','content_gap'].includes(r.type)),r=>[text(r.title),label(r.priority)]),
 make('الأهداف',['الهدف','الوصف','الحالة'],d.goals,r=>[text(r.title),text(r.description),label(r.status)]),
 make('المسودات المعلقة',['عنوان المسودة','الحالة'],[...d.drafts,...d.editorialDrafts],r=>[text(r.title||r.q),label(r.status)]),
 make('سجل التحليل القديم',['تاريخ التحليل','نوع التحليل','أبرز النتائج','الحالة'],[...d.runs].sort((a,b)=>String(b.started_at).localeCompare(String(a.started_at))),r=>[date(r.started_at),label(r.run_type),runResults(r.summary),label(r.status)]),
 make('الأسئلة الشائعة',['السؤال','الإجابة'],d.faqs,r=>[text(r.q),text(r.a)]),
 make('روابط المحتوى المنشور',['عنوان المحتوى','اللغة','رابط الصفحة'],d.links,r=>[text(r.title),label(r.language),new URL(r.path,window.location.origin).href]),
 make('كلمات الموقع',['الكلمة'],d.siteKeywords,r=>[text(r)])
 ];
 return [{name:'ملخص البيانات',cols:['القسم','العدد'],rows:[['تاريخ التقرير',date(d.generatedAt)],...s.map(x=>[x.name,x.rows.length] as Cell[])]},...s];
}
