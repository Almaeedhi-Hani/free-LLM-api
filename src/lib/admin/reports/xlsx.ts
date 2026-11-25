import type {Section} from './types';
import {enc,url,xml} from './encoding';

function zip(files:Record<string,string>){
 const parts:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0,size=0;
 for(const [name,value] of Object.entries(files)){
  const n=enc.encode(name),b=enc.encode(value);let crc=0xffffffff;
  for(let k=0;k<b.length;k++){crc^=b[k];for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}crc=(crc^0xffffffff)>>>0;
  const h=new Uint8Array(30+n.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,crc,true);v.setUint32(18,b.length,true);v.setUint32(22,b.length,true);v.setUint16(26,n.length,true);h.set(n,30);
  const m=new Uint8Array(46+n.length),w=new DataView(m.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint32(16,crc,true);w.setUint32(20,b.length,true);w.setUint32(24,b.length,true);w.setUint16(28,n.length,true);w.setUint32(42,offset,true);m.set(n,46);
  parts.push(h,b);central.push(m);offset+=h.length+b.length;size+=m.length;
 }
 const e=new Uint8Array(22),v=new DataView(e.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,central.length,true);v.setUint16(10,central.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);
 return new Blob([...parts,...central,e].map(x=>new Uint8Array(x).buffer),{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
export function excel(s:Section[]){
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
