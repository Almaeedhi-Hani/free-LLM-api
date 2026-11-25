'use strict';
const {createHash}=require('node:crypto');
const manifest=require('../data/content-tree.json');
const configured=Array.from(new Set(manifest.nodes.flatMap(n=>n.official_sources||[])));
const hosts=new Set(configured.map(u=>new URL(u).hostname));
const norm=s=>String(s||'').normalize('NFC').replace(/\s+/gu,' ').trim();
const parts=fields=>Array.from(new Set(fields.flatMap(s=>String(s||'').split(/[.!?]+(?:\s+|$)|[。！？؟]+\s*|\n+/)).map(norm).filter(Boolean)));
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
 if(meta.archived===true&&meta.status==='blocked')return false;
 const age=now-Date.parse(meta.checked_at);
 return !Number.isFinite(age)||age<0||age>=(meta.status==='ready'?86400000:7*86400000);
}
// Bind public identity, headings and link destinations without hashing mutable
// verification results, timestamps or approval state.
function editorialIdentityFields(item,copyFields){
 return ['review-v2',item.id,item.kind,item.lang,item.target,item.risk_level,
  item.slug||'',item.related_service||'',item.topic_node_id||'',item.primary_keyword||'',
  item.h1_suggestion||'',JSON.stringify(item.secondary_keywords||[]),
  JSON.stringify(item.sections||[]),JSON.stringify((item.internal_links||[]).map(l=>[l.node_id,l.anchor])),
  JSON.stringify(item.schema_suggestions||[]),...copyFields];
}
// Give both content queues capacity, then use spare capacity for the oldest
// remaining due entries. Never raise the existing four-item cap.
function selectReviewBatch(dueItems){
 const sorted=[...dueItems].sort((a,b)=>(a.item.review_preflight?.checked_at||'').localeCompare(b.item.review_preflight?.checked_at||''));
 const chosen=[...sorted.filter(x=>x.kind==='faq').slice(0,2),...sorted.filter(x=>x.kind==='editorial').slice(0,2)];
 for(const x of sorted){if(chosen.length>=4)break;if(!chosen.includes(x))chosen.push(x)}
 return chosen;
}
module.exports={parts,digest,safeUrl,topicUrls,readBounded,page,match,eligible,due,editorialIdentityFields,selectReviewBatch};
