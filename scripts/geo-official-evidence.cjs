'use strict';
// Only the owner-maintained content tree supplies fetch URLs. Search results,
// model text, redirects and arbitrary caller-provided URLs never select hosts.
const {createHash}=require('node:crypto');
const manifest=require('../src/data/content-tree.json');
const MAX_BYTES=600000;
function safeOfficialUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&(u.hostname==='gov.sa'||u.hostname.endsWith('.gov.sa'))?u.href:null}catch{return null}
}
function configuredSources(){
 const seen=new Set(),result=[];
 for(const node of manifest.nodes.filter(n=>n.route?.startsWith('/services/'))){
  for(const raw of node.official_sources||[]){
   const url=safeOfficialUrl(raw);if(!url||seen.has(url))continue;
   seen.add(url);result.push({url,nodeId:node.id});
  }
 }
 return result.slice(0,6);
}
const normalize=value=>String(value??'').normalize('NFC').replace(/\s+/gu,' ').trim();
function paragraphs(html){
 const cleaned=html.replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|noscript|template|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ');
 return Array.from(cleaned.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi),m=>normalize(m[1].replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&apos;|&#39;/gi,"'")))
 .filter(s=>s.length>=60&&s.length<=1400&&!/ignore (?:all |previous )?instructions|system prompt|تعليمات النظام|忽略.{0,8}指令/i.test(s));
}
function language(text){
 const a=(text.match(/[\u0600-\u06ff]/g)||[]).length,z=(text.match(/[\u3400-\u9fff]/g)||[]).length,e=(text.match(/[a-z]/gi)||[]).length;
 return a>e&&a>z?'ar':z>e&&z>a?'zh':e?'en':'multi';
}
async function readBounded(response){
 if(!response.ok||!/^text\/html(?:;|$)/i.test(response.headers.get('content-type')||''))return null;
 if(Number(response.headers.get('content-length')||0)>MAX_BYTES||!response.body)return null;
 const reader=response.body.getReader(),decoder=new TextDecoder();let bytes=0,html='';
 try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>MAX_BYTES){await reader.cancel();return null}html+=decoder.decode(value,{stream:true})}return html+decoder.decode()}finally{reader.releaseLock()}
}
async function collectOfficialEvidence(request=fetch){
 const sources=configuredSources();
 const results=await Promise.all(sources.map(async ({url,nodeId})=>{
  try{
   const response=await request(url,{method:'GET',redirect:'manual',headers:{Accept:'text/html'},signal:AbortSignal.timeout(8000)});
   const html=await readBounded(response);if(!html)return null;
   const p=paragraphs(html)[0];if(!p)return null;
   // This is an observed excerpt, not a claim-validation or publication verdict.
   const excerpt=p.slice(0,280).trim();
   if(excerpt.length<60)return null;
   return {id:'official_'+createHash('sha256').update(url+'|'+excerpt).digest('hex').slice(0,24),type:'official_candidate',source:'official_live_html',name:nodeId+' — '+new URL(url).hostname,url,language:language(excerpt),snippet:excerpt,collected_at:new Date().toISOString()};
  }catch{return null}
 }));
 return {attempted:sources.length,items:results.filter(Boolean)};
}
// Resolve model mappings only against observed, selected source text. A matching
// quote establishes provenance, not the truth of an unrelated paraphrase.
function bindClaimEvidence(raw,copy,ids,byId){
 if(!Array.isArray(raw))return [];
 const text=normalize(copy),result=[],seen=new Set();
 for(const item of raw.slice(0,10)){
  if(!item||typeof item.claim!=='string'||typeof item.quote!=='string'||typeof item.evidence_id!=='string'||!ids.includes(item.evidence_id))continue;
  const evidence=byId.get(item.evidence_id),claim=normalize(item.claim),quote=normalize(item.quote);
  if(!evidence||evidence.type!=='official_candidate'||evidence.source!=='official_live_html'||!safeOfficialUrl(evidence.url)||claim.length<25||claim.length>450||quote.length<28||quote.length>280||!text.includes(claim)||!normalize(evidence.snippet).includes(quote))continue;
  const key=JSON.stringify([claim,quote,evidence.url]);if(seen.has(key))continue;seen.add(key);
  result.push({claim,quote,url:evidence.url});
 }
 return result;
}
function editorialCopy(item){return [item.title,item.summary,item.body,...(Array.isArray(item.sections)?item.sections.flatMap(s=>[s?.h2,s?.body,...(Array.isArray(s?.subsections)?s.subsections.flatMap(h=>[h?.h3,h?.body]):[])]):[]),...(Array.isArray(item.internal_links)?item.internal_links.map(l=>l?.anchor):[])].filter(x=>typeof x==='string').join(' ')}
module.exports={collectOfficialEvidence,configuredSources,bindClaimEvidence,editorialCopy};
