import type {Section} from './types';
import {enc,url} from './encoding';

export async function pdf(s:Section[]){
 await document.fonts.ready;
 const w=842,h=595,m=30,scale=1.5,body=w-2*m;
 const canvas=document.createElement('canvas');canvas.width=w*scale;canvas.height=Math.round(h*scale);
 const context=canvas.getContext('2d');if(!context)throw Error('تعذر إنشاء PDF');const ctx:CanvasRenderingContext2D=context;ctx.scale(canvas.width/w,canvas.height/h);
 type PDFLink={url:string;x:number;y:number;width:number;height:number};
 const pages:{image:Uint8Array;links:PDFLink[]}[]=[];let y=0,links:PDFLink[]=[];
 const write=(v:string,x:number,yy:number,size=11,bold=false,color='#172334',ltr=false)=>{
  ctx.font=(bold?'bold ':'')+size+'px Arial, sans-serif';ctx.fillStyle=color;ctx.textAlign=ltr?'left':'right';ctx.direction=ltr?'ltr':'rtl';ctx.fillText(v,x,yy);
 };
 const start=()=>{ctx.fillStyle='white';ctx.fillRect(0,0,w,h);ctx.fillStyle='#075746';ctx.fillRect(0,0,w,60);write('التقرير الإداري الشامل',w-m,26,19,true,'white');write('Invest in Saudi',m,37,16,true,'white',true);write('ملخص الأداء والفرص والمحتوى',w-m,44,10,false,'white');y=76;links=[]};
 const finish=()=>{write('صفحة '+(pages.length+1),w-m,h-14,10,false,'#64748b');const data=atob(canvas.toDataURL('image/jpeg',0.76).split(',')[1]);pages.push({image:Uint8Array.from(data,c=>c.charCodeAt(0)),links})};
 function wrap(t:string,width:number,size=11,bold=false){
  ctx.font=(bold?'bold ':'')+size+'px Arial, sans-serif';
  const lines:string[]=[];
  for(const paragraph of t.split(/\r?\n/)){
   let current='';
   for(const word of paragraph.split(/\s+/)){
    const candidate=current?current+' '+word:word;
    if(ctx.measureText(candidate).width<=width){current=candidate;continue}
    if(current){lines.push(current);current=''}
    for(const ch of Array.from(word)){if(current&&ctx.measureText(current+ch).width>width){lines.push(current);current=''}current+=ch}
   }lines.push(current);
  }return lines;
 }
 const widths=(s:Section):number[]=>{
  const weights=s.name==='سجل التحليل القديم'?[.17,.18,.49,.16]:s.name==='الكلمات المفتاحية'?[.60,.20,.20]:s.name==='روابط المحتوى المنشور'?[.48,.15,.37]:s.name==='فرص الكلمات'?[.50,.34,.16]:s.name==='الأهداف'?[.42,.42,.16]:s.name==='الأسئلة الشائعة'?[.35,.65]:s.cols.length===2?[.73,.27]:s.cols.map(()=>1/s.cols.length);
  if(s.name==='المنافسون')return [body*.48,body*.52];
  return weights.map(v=>v*body);
 };
 function heading(s:Section,ws:number[],continued=false){
  ctx.fillStyle='#075746';ctx.fillRect(m,y,body,23);write(s.name+(continued?' — تابع':' ('+s.rows.length+')'),w-m-8,y+16,12,true,'white');y+=23;
  ctx.fillStyle='#e0e9e8';ctx.fillRect(m,y,body,22);let x=w-m;
  s.cols.forEach((col,j)=>{write(col,x-7,y+15,10,true);x-=ws[j]});y+=22;
 }
 start();
 const summary=s[0];
 write('ملخص البيانات',w-m,y+16,17,true,'#075746');y+=29;
 write(String(summary.rows[0]?.[1]||''),w-m,y+12,11,false,'#64748b');y+=23;
 const cards=summary.rows.slice(1);
 cards.forEach((r,i)=>{const cw=body/4-6,x=w-m-(i%4+1)*(body/4)+3,yy=y+Math.floor(i/4)*64;ctx.fillStyle='#eaf3f1';ctx.fillRect(x,yy,cw,56);write(String(r[0]),x+cw-8,yy+18,11,true,'#075746');write(String(r[1]),x+cw-8,yy+42,18,true,'#075746')});
 y+=Math.ceil(cards.length/4)*64+12;
 for(const section of s.slice(1)){
  const ws=widths(section);
  if(y+65>h-28){finish();start()}
  heading(section,ws);
  if(!section.rows.length){write('لا توجد سجلات',w-m-7,y+14);y+=25;}
  section.rows.forEach((row,index)=>{
   const cells=row.map((v,k)=>wrap(String(v),ws[k]-14));
   const total=Math.max(1,...cells.map(v=>v.length));let offset=0;
   while(offset<total){
    let room=Math.floor((h-28-y-8)/15);
    if(room<1||(offset===0&&total<=Math.floor((h-28-76-45-8)/15)&&total>room)){finish();start();heading(section,ws,true);room=Math.floor((h-28-y-8)/15)}
    const count=Math.min(room,total-offset),rh=count*15+8;
    ctx.fillStyle=index%2?'#f0f5f4':'#ffffff';ctx.fillRect(m,y,body,rh);
    let x=w-m;
    row.forEach((v,k)=>{
     const width=ws[k],u=url(v);
     ctx.strokeStyle='#d6dfdf';ctx.lineWidth=.5;ctx.strokeRect(x-width,y,width,rh);
     cells[k].slice(offset,offset+count).forEach((line,n)=>write(line,u?x-width+7:x-7,y+14+n*15,11,false,u?'#0759b0':'#172334',!!u));
     if(u&&cells[k].length>offset)links.push({url:u,x:x-width+3,y,width:width-6,height:rh});
     x-=width;
    });y+=rh;offset+=count;
   }
  });y+=12;
 }finish();
 const chunks:Uint8Array[]=[];let length=0;const offsets:number[]=[0];let next=3;const ids=pages.map(p=>({page:next++,image:next++,stream:next++,links:p.links.map(()=>next++)}));
 const append=(a:string|Uint8Array)=>{const b=typeof a==='string'?enc.encode(a):a;chunks.push(b);length+=b.length};
 const obj=(id:number,body:string|Uint8Array,head='',tail='')=>{offsets[id]=length;append(id+' 0 obj\n'+head);append(body);append(tail+'\nendobj\n')};
 append('%PDF-1.4\n');obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,'<< /Type /Pages /Count '+pages.length+' /Kids ['+ids.map(i=>i.page+' 0 R').join(' ')+'] >>');
 pages.forEach((p,i)=>{const id=ids[i];obj(id.page,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+w+' '+h+'] /Resources << /XObject << /Im0 '+id.image+' 0 R >> >> /Contents '+id.stream+' 0 R /Annots ['+id.links.map(n=>n+' 0 R').join(' ')+'] >>');obj(id.image,p.image,'<< /Type /XObject /Subtype /Image /Width '+canvas.width+' /Height '+canvas.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+p.image.length+' >>\nstream\n','\nendstream');const stream='q '+w+' 0 0 '+h+' 0 0 cm /Im0 Do Q\n';obj(id.stream,stream,'<< /Length '+enc.encode(stream).length+' >>\nstream\n','endstream');p.links.forEach((l,j)=>{const uri=l.url.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');obj(id.links[j],'<< /Type /Annot /Subtype /Link /Rect ['+l.x+' '+(h-l.y-l.height)+' '+(l.x+l.width)+' '+(h-l.y)+'] /Border [0 0 0] /A << /S /URI /URI ('+uri+') >> >>')})});
 const xref=length;append('xref\n0 '+next+'\n0000000000 65535 f \n');for(let i=1;i<next;i++)append(String(offsets[i]).padStart(10,'0')+' 00000 n \n');append('trailer\n<< /Size '+next+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
 return new Blob(chunks.map(x=>new Uint8Array(x).buffer),{type:'application/pdf'});
}
