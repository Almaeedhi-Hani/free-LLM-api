'use client';
import {useState} from 'react';
type Cell=string|number;
type Section={name:string;cols:string[];rows:Cell[][]};
const text=(v:unknown):Cell=>v==null?'':typeof v==='number'?v:typeof v==='object'?JSON.stringify(v):String(v);
function build(d:Record<string,any>):Section[]{
 const make=(name:string,records:any[],fields:string[]):Section=>{
  if(!Array.isArray(records))throw Error('بيانات التقرير غير مكتملة');
  return {name,cols:fields,rows:records.map(r=>fields.map(k=>text(r[k])))};
 };
 const opp=['title','type','priority','status','score','confidence','languages','related_keywords','related_competitors','evidence','estimated_impact','created_at'];
 const s=[
 make('المنافسون',d.competitors,['name','domain','languages','market','status','source','notes','first_seen_at','last_seen_at']),
 make('الكلمات المفتاحية',d.keywords,['term','language','intent','cluster','source','search_volume','volume_source','volume_confidence','first_seen_at','last_seen_at']),
 make('الفرص - كلمات',d.opportunities.filter((r:any)=>r.type==='keyword_gap'),opp),
 make('الفرص - منافسون',d.opportunities.filter((r:any)=>r.type==='content_gap'),opp),
 make('فرص أخرى',d.opportunities.filter((r:any)=>!['keyword_gap','content_gap'].includes(r.type)),opp),
 make('الأهداف',d.goals,['title','description','priority','status','confidence','success_metrics','evidence','created_at']),
 make('مسودات الأسئلة المعلقة',d.drafts,['q','a','risk_level','evidence_refs','createdAt']),
 make('مسودات تحريرية معلقة',d.editorialDrafts,['title','lang','summary','body','sections','evidence_refs','risk_level','createdAt']),
 make('سجلات التحليل',d.runs,['id','run_type','status','started_at','finished_at','triggered_by','summary','error']),
 make('الأسئلة الشائعة',d.faqs,['q','a','approval_method']),
 make('روابط المحتوى المنشور',d.links.map((r:any)=>({...r,url:new URL(r.path,window.location.origin).href})),['title','language','kind','publishedAt','publicationSource','url']),
 {name:'كلمات الموقع',cols:['term'],rows:d.siteKeywords.map((v:unknown)=>[text(v)])}
 ];
 return [{name:'ملخص التقرير',cols:['القسم','العدد أو القيمة'],rows:[['تاريخ الاستخراج',text(d.generatedAt)],['آخر تعديل',text(d.updatedAt)],['أحداث النشر',d.publicationEvidenceAvailable?'متاحة جزئيًا':'غير متاحة'],...s.map(x=>[x.name,x.rows.length] as Cell[])]},...s];
}
const enc=new TextEncoder();
const url=(v:Cell)=>{try{const u=new URL(String(v));return /^https?:$/.test(u.protocol)&&!u.username&&!u.password?u.href:null}catch{return null}};
const xml=(v:Cell)=>String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
function zip(files:Record<string,string>){
 const parts:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0,size=0;
 for(const [name,value] of Object.entries(files)){
  const n=enc.encode(name),b=enc.encode(value);let crc=0xffffffff;
  for(const x of b){crc^=x;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}crc=(crc^0xffffffff)>>>0;
  const h=new Uint8Array(30+n.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,crc,true);v.setUint32(18,b.length,true);v.setUint32(22,b.length,true);v.setUint16(26,n.length,true);h.set(n,30);
  const m=new Uint8Array(46+n.length),w=new DataView(m.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint32(16,crc,true);w.setUint32(20,b.length,true);w.setUint32(24,b.length,true);w.setUint16(28,n.length,true);w.setUint32(42,offset,true);m.set(n,46);
  parts.push(h,b);central.push(m);offset+=h.length+b.length;size+=m.length;
 }
 const e=new Uint8Array(22),v=new DataView(e.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,central.length,true);v.setUint16(10,central.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);
 return new Blob([...parts,...central,e].map(x=>new Uint8Array(x).buffer),{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function excel(s:Section[]){
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main',rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships',pkg='http://schemas.openxmlformats.org/package/2006/relationships';
 const f:Record<string,string>={};
 f['[Content_Types].xml']='<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+s.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>';
 f['_rels/.rels']='<Relationships xmlns="'+pkg+'"><Relationship Id="rId1" Type="'+rel+'/officeDocument" Target="xl/workbook.xml"/></Relationships>';
 f['xl/workbook.xml']='<workbook xmlns="'+ns+'" xmlns:r="'+rel+'"><sheets>'+s.map((x,i)=>'<sheet name="'+xml(x.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>';
 f['xl/_rels/workbook.xml.rels']='<Relationships xmlns="'+pkg+'">'+s.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="'+rel+'/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'</Relationships>';
 s.forEach((x,i)=>{
  const links:{ref:string;url:string}[]=[];
  const data=[x.cols,...x.rows].map((r,j)=>'<row r="'+(j+1)+'">'+r.map((c,k)=>{
   const ref=String.fromCharCode(65+k)+(j+1),u=j?url(c):null;if(u)links.push({ref,url:u});
   if(typeof c==='string'&&c.length>32767)throw Error('خلية أطول من حد Excel؛ استخدم PDF للنص الكامل');
   return typeof c==='number'?'<c r="'+ref+'"><v>'+c+'</v></c>':'<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+xml(c)+'</t></is></c>';
  }).join('')+'</row>').join('');
  f['xl/worksheets/sheet'+(i+1)+'.xml']='<worksheet xmlns="'+ns+'" xmlns:r="'+rel+'"><sheetViews><sheetView workbookViewId="0" rightToLeft="1"/></sheetViews><cols>'+x.cols.map((_,j)=>'<col min="'+(j+1)+'" max="'+(j+1)+'" width="35" customWidth="1"/>').join('')+'</cols><sheetData>'+data+'</sheetData>'+(links.length?'<hyperlinks>'+links.map((l,j)=>'<hyperlink ref="'+l.ref+'" r:id="rId'+(j+1)+'"/>').join('')+'</hyperlinks>':'')+'</worksheet>';
  if(links.length)f['xl/worksheets/_rels/sheet'+(i+1)+'.xml.rels']='<Relationships xmlns="'+pkg+'">'+links.map((l,j)=>'<Relationship Id="rId'+(j+1)+'" Type="'+rel+'/hyperlink" Target="'+xml(l.url)+'" TargetMode="External"/>').join('')+'</Relationships>';
 });
 return zip(f);
}
async function pdf(s:Section[]){
 await document.fonts.ready;
 const w=595,h=842,m=40,scale=2;
 const canvas=document.createElement('canvas');canvas.width=w*scale;canvas.height=h*scale;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('تعذر إنشاء PDF');ctx.scale(scale,scale);
 const pages:{image:Uint8Array;links:{url:string;y:number}[]}[]=[];let y=0,links:{url:string;y:number}[]=[];
 const start=()=>{ctx.fillStyle='white';ctx.fillRect(0,0,w,h);ctx.fillStyle='#173c3a';ctx.fillRect(0,0,w,64);ctx.fillStyle='white';ctx.font='bold 17px Arial';ctx.direction='rtl';ctx.textAlign='right';ctx.fillText('Invest in Saudi | تقرير لوحة التحكم',w-m,40);y=90;links=[]};
 const finish=()=>{ctx.fillStyle='#64748b';ctx.font='11px Arial';ctx.textAlign='center';ctx.fillText(String(pages.length+1),w/2,h-20);const data=atob(canvas.toDataURL('image/jpeg',0.88).split(',')[1]);pages.push({image:Uint8Array.from(data,c=>c.charCodeAt(0)),links})};
 const ensure=(n:number)=>{if(y+n>h-42){finish();start()}};
 function line(t:string,size=12,bold=false,u:string|null=null){
  ctx.font=(bold?'bold ':'')+size+'px Arial, sans-serif';
  const wrapped:string[]=[];
  for(const p of t.split(/\r?\n/)){
   let current='';
   for(const word of p.split(/\s+/)){
    const candidate=current?current+' '+word:word;
    if(ctx.measureText(candidate).width<=w-2*m){current=candidate;continue}
    if(current){wrapped.push(current);current=''}
    for(const ch of Array.from(word)){if(current&&ctx.measureText(current+ch).width>w-2*m){wrapped.push(current);current=''}current+=ch}
   }wrapped.push(current);
  }
  for(const v of wrapped){ensure(size+7);ctx.font=(bold?'bold ':'')+size+'px Arial, sans-serif';ctx.fillStyle=u?'#0759b0':bold?'#173c3a':'#172334';ctx.direction=u?'ltr':'rtl';ctx.textAlign=u?'left':'right';ctx.fillText(v,u?m:w-m,y);if(u){ctx.fillRect(m,y+2,Math.min(w-2*m,ctx.measureText(v).width),0.7);links.push({url:u,y})}y+=size+7}
 }
 start();
 for(const section of s){ensure(60);y+=8;line(section.name+' ('+section.rows.length+')',17,true);if(!section.rows.length)line('لا توجد سجلات');
  section.rows.forEach((r,i)=>{ensure(48);line('سجل '+(i+1),12,true);r.forEach((v,j)=>{if(v==='')return;const u=url(v);if(u){line(section.cols[j]+':',12,true);line(String(v),11,false,u)}else line(section.cols[j]+': '+String(v))});y+=8});
 }finish();
 const chunks:Uint8Array[]=[];let length=0;const offsets:number[]=[0];let next=3;const ids=pages.map(p=>({page:next++,image:next++,stream:next++,links:p.links.map(()=>next++)}));
 const append=(a:string|Uint8Array)=>{const b=typeof a==='string'?enc.encode(a):a;chunks.push(b);length+=b.length};
 const obj=(id:number,body:string|Uint8Array,head='',tail='')=>{offsets[id]=length;append(id+' 0 obj\n'+head);append(body);append(tail+'\nendobj\n')};
 append('%PDF-1.4\n');obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,'<< /Type /Pages /Count '+pages.length+' /Kids ['+ids.map(i=>i.page+' 0 R').join(' ')+'] >>');
 pages.forEach((p,i)=>{const id=ids[i];obj(id.page,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+w+' '+h+'] /Resources << /XObject << /Im0 '+id.image+' 0 R >> >> /Contents '+id.stream+' 0 R /Annots ['+id.links.map(n=>n+' 0 R').join(' ')+'] >>');obj(id.image,p.image,'<< /Type /XObject /Subtype /Image /Width '+canvas.width+' /Height '+canvas.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+p.image.length+' >>\nstream\n','\nendstream');const stream='q '+w+' 0 0 '+h+' 0 0 cm /Im0 Do Q\n';obj(id.stream,stream,'<< /Length '+enc.encode(stream).length+' >>\nstream\n','endstream');p.links.forEach((l,j)=>{const uri=l.url.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');obj(id.links[j],'<< /Type /Annot /Subtype /Link /Rect ['+m+' '+(h-l.y-4)+' '+(w-m)+' '+(h-l.y+13)+'] /Border [0 0 0] /A << /S /URI /URI ('+uri+') >> >>')})});
 const xref=length;append('xref\n0 '+next+'\n0000000000 65535 f \n');for(let i=1;i<next;i++)append(String(offsets[i]).padStart(10,'0')+' 00000 n \n');append('trailer\n<< /Size '+next+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
 return new Blob(chunks.map(x=>new Uint8Array(x).buffer),{type:'application/pdf'});
}
export default function DashboardReportExport({secret,disabled}:{secret:string;disabled:boolean}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function download(format:'pdf'|'xlsx'){
  if(busy)return;setBusy(true);setOpen(false);setError('');
  try{
   const r=await fetch('/api/admin/dashboard-export',{headers:{'x-admin-secret':secret},cache:'no-store'});
   if(!r.ok)throw Error('تعذر جلب بيانات التقرير ('+r.status+')');
   const s=build(await r.json());const file=format==='pdf'?await pdf(s):excel(s);
   const href=URL.createObjectURL(file),a=document.createElement('a');a.href=href;a.download='Invest-in-Saudi-'+new Date().toISOString().slice(0,10)+'.'+format;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
  }catch(e){setError(e instanceof Error?e.message:'تعذر تنزيل التقرير')}finally{setBusy(false)}
 }
 return <div className="relative">
  <button type="button" aria-expanded={open} disabled={disabled||busy} onClick={()=>setOpen(!open)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-navy-900 disabled:opacity-50 whitespace-nowrap">{busy?'جارٍ إعداد التقرير...':'تحميل التقرير ▾'}</button>
  {open&&<div className="absolute left-0 z-30 mt-1 min-w-32 rounded-md border bg-white p-1 shadow-lg"><button type="button" className="block w-full rounded px-3 py-2 text-right text-sm hover:bg-slate-100" onClick={()=>download('pdf')}>PDF</button><button type="button" className="block w-full rounded px-3 py-2 text-right text-sm hover:bg-slate-100" onClick={()=>download('xlsx')}>Excel</button></div>}
  {error&&<p role="alert" className="absolute left-0 z-30 mt-1 w-64 rounded border border-red-200 bg-white p-2 text-xs text-red-700">{error}</p>}
 </div>;
}
