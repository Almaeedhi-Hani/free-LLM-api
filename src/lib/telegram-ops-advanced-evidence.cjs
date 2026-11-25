'use strict';
const {createHash}=require('node:crypto');
const manifest=require('../data/content-tree.json');
const configured=Array.from(new Set(manifest.nodes.flatMap(n=>n.official_sources||[])));
const hosts=new Set(configured.map(u=>new URL(u).hostname));
const norm=s=>String(s||'').normalize('NFC').replace(/\s+/gu,' ').trim();
const parts=fields=>Array.from(new Set(fields.flatMap(s=>String(s||'').split(/[.!?。！？؟]+\s*|\n+/)).map(norm).filter(Boolean)));
const digest=(kind,fields)=>createHash('sha256').update(JSON.stringify([kind,fields])).digest('hex');
function safeUrl(raw){
 try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&hosts.has(u.hostname)?u.href:null}catch{return null}
}
function topicUrls(target){
 const relevant=manifest.nodes.filter(n=>n.route==='/services/'+target||n.id===target);
 return Array.from(new Set(relevant.flatMap(n=>n.official_sources||[]).map(safeUrl).filter(Boolean)));
}
async function readBounded(res,limit,mime){
 if(!res.ok||!mime.test(res.headers.get('content-type')||'')||Number(res.headers.get('content-length')||0)>limit||!res.body)return null;
 const reader=res.body.getReader(),dec=new TextDecoder();let bytes=0,out='';
 try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>limit){await reader.cancel();return null}out+=dec.decode(value,{stream:true})}return out+dec.decode()}finally{reader.releaseLock()}
}
async function page(url,request=fetch){
 if(!safeUrl(url))return [];
 try{
  const res=await request(url,{method:'GET',redirect:'manual',cache:'no-store',headers:{Accept:'text/html'},signal:AbortSignal.timeout(8000)});
  const html=await readBounded(res,600000,/^text\/html(?:;|$)/i);if(!html)return [];
  const clean=html.replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|noscript|template|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ');
  return parts(Array.from(clean.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi),m=>norm(m[1].replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&apos;|&#39;/gi,"'"))));
 }catch{return []}
}
function match(fields,pages){
 const unique=parts(fields);const proofs=[];const seen=new Set();
 for(const claim of unique){
  if(claim.length<28||claim.length>450)continue;
  const matches=pages.filter(p=>p.sentences.includes(claim)&&safeUrl(p.url));
  const p=matches.find(p=>!seen.has(new URL(p.url).hostname))||matches[0];
  if(!p||proofs.length>=10)continue;
  seen.add(new URL(p.url).hostname);proofs.push({claim,quote:claim,url:p.url});
 }
 return {total:unique.length,matched:proofs.length,proofs,complete:unique.length>0&&proofs.length===unique.length&&seen.size>=2};
}
function eligible(meta,kind,fields,now=Date.now()){
 return !!meta&&meta.status==='ready'&&meta.digest===digest(kind,fields)&&Number.isFinite(Date.parse(meta.checked_at))&&Date.parse(meta.checked_at)<=now&&now-Date.parse(meta.checked_at)<86400000;
}
function due(meta,kind,fields,now=Date.now()){
 if(!meta||meta.digest!==digest(kind,fields))return true;
 const age=now-Date.parse(meta.checked_at);
 return !Number.isFinite(age)||age<0||age>=(meta.status==='ready'?86400000:7*86400000);
}
module.exports={parts,digest,safeUrl,topicUrls,readBounded,page,match,eligible,due};
