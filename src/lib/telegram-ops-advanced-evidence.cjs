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
// Infer only recognized service topics from multilingual FAQ titles.
// Unknown questions do not receive unrelated government references.
function faqTopicTargets(title){
 const s=norm(title);
 const rules=[
  ['corporate-banking',/corporate bank|bank account|banking|\bkyc\b|حساب.{0,16}(?:بنكي|مصرفي)|البنك المركزي|银行|开户/iu],
  ['misa-license',/investment registration|investment licen[cs]|\bmisa\b|التسجيل الاستثماري|ترخيص الاستثمار|وزارة الاستثمار|投资登记|投资许可|投资部/iu],
  ['premium-residency',/premium residency|الإقامة المميزة|高级居留|优质居留/iu],
  ['investment-funds',/investment funds?|صناديق الاستثمار|صندوق استثماري|投资基金/iu],
  ['contract-drafting',/articles of association|corporate contracts?|governance|عقد التأسيس|عقود الشركات|الحوكمة|公司章程|公司合同|治理/iu],
  ['company-formation',/company formation|company incorporation|establish.{0,24}compan|set up.{0,24}compan|تأسيس.{0,15}شرك|إنشاء.{0,15}شرك|设立公司|公司设立|公司注册|注册公司/iu]
 ];
 return rules.filter(([,rx])=>rx.test(s)).map(([target])=>target);
}
function selectOfficialCandidates(targets,saved,discovered){
 const primary=targets.flatMap(topicUrls);
 const nodes=manifest.nodes.filter(n=>targets.includes(n.id)||targets.some(t=>n.route==='/services/'+t));
 const related=nodes.flatMap(n=>(n.related_nodes||[]).flatMap(topicUrls));
 // Prioritize relevant manifest sources, then observed/search candidates,
 // then explicitly related manifest nodes. All remain unverified candidates.
 const urls=Array.from(new Set([...primary,...saved,...discovered,...related].map(safeUrl).filter(Boolean)));
 const chosen=[],seen=new Set();
 for(const url of urls){const host=new URL(url).hostname;if(!seen.has(host)){chosen.push(url);seen.add(host)}if(chosen.length===3)return chosen}
 for(const url of urls){if(!chosen.includes(url))chosen.push(url);if(chosen.length===3)break}
 return chosen;
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
// V2 proof routes first-party scope to the exact deployed catalog; official
// evidence remains live and allowlisted. No source-less or model-only receipt.
function matchPublication(fields,pages,lane,catalog){
 const unique=parts(fields),proofs=[];
 for(const claim of unique){
  const own=catalog&&lane!=='regulatory'&&lane!=='unknown'&&claim.length>=6&&claim.length<=450&&catalog.sentences.includes(claim);
  const source=own?catalog:lane==='commercial'?null:claim.length>=28&&claim.length<=450?pages.find(p=>safeUrl(p.url)&&p.sentences.includes(claim)):null;
  if(!source||proofs.length>=10)continue;
  proofs.push({claim,quote:claim,url:source.url});
 }
 return {total:unique.length,matched:proofs.length,proofs,complete:unique.length>0&&proofs.length===unique.length};
}
async function livePublicationReceipt(fields,claims,refs,lane,catalog,request=fetch){
 if(!Array.isArray(claims)||!claims.length||claims.length>10||!Array.isArray(refs))return null;
 const own=catalog?.url;
 const urls=[...new Set(claims.map(p=>p?.url))];
 if(urls.length>4||urls.some(u=>u!==own&&safeUrl(u)!==u))return null;
 if(claims.some(p=>typeof p.claim!=='string'||p.claim!==p.quote||
  !refs.some(r=>r.url===p.url&&(p.url===own?r.kind==='first_party_catalog':['official_candidate','official-manual'].includes(r.kind)))))return null;
 const pages=await Promise.all(urls.filter(u=>u!==own).map(async url=>({url,sentences:await page(url,request)})));
 const result=matchPublication(fields,pages,lane,catalog);
 if(!result.complete||claims.length!==result.proofs.length||!claims.every(p=>result.proofs.some(q=>q.claim===p.claim&&q.url===p.url)))return null;
 return {urls:[...urls].sort(),proofs:claims.map(p=>({...p,checked_at:new Date().toISOString(),verified_by:p.url===own?'first_party_catalog_exact':'live_official_exact_quote'}))};
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
// Risk is independent of the model's self-label. Absence of a keyword
// never establishes safety. Existing low-risk labels survive only with independent exact proof.
// Unknown, financial, legal and translated copy remains high risk.
const regulated=/(licen[sc]|legal|regulat|government fee|tax|ownership|shareholder|bank|residen|immigrat|visa|permit|approval|guarantee|cost estimate|paid service|service fee|sanction|penalt|موافقة|ترخيص|رخصة|نظام|قانون|رسوم|ضريبة|ملكية|إقامة|تأشيرة|بنك|مصرف|许可|执照|法律|税|收费|银行|居留|签证|股东|监管|审批)/iu;
function assessPublicationRisk(kind,item,copyFields,result){
 if(!item||item.status!=='pending'||!Array.isArray(copyFields)||copyFields.some(x=>typeof x!=='string'))return 'high';
 // A low classification requires full independent evidence and no regulated
 // indicators. The model's previous label is not authoritative.
 const text=[item.q,item.title,item.primary_keyword,item.target,item.related_service,...copyFields].filter(Boolean).join(' ').normalize('NFKC');
 if(regulated.test(text)||faqTopicTargets(text.replace(/-/g,' ')).length)return 'high';
 // Missing or incomplete proof never qualifies as low risk.
 if(!result?.complete||result.matched!==result.total||result.total<1)return 'high';
 return 'low';
}
// Reopen only the old missing-candidate outcome when a new deterministic
// topic mapping now produces actual allowlisted candidates. One attempt per
// discovery version, never reopen an archived record or bypass evidence gates.
const SOURCE_DISCOVERY_VERSION='manifest-topic-recovery-v1';
function discoveryRepairDue(x){
 const m=x?.item?.review_preflight;
 if(!m||m.status!=='blocked'||m.archived===true||m.reason!=='no_official_candidates'||m.source_discovery_version===SOURCE_DISCOVERY_VERSION)return false;
 const i=x.item;
 if(x.kind==='editorial'&&['technical_seo','internal_link'].includes(i.kind))return false;
 const targets=x.kind==='faq'?faqTopicTargets(i.q):[i.related_service||i.target,...faqTopicTargets([i.title,i.primary_keyword||''].join(' '))];
 return targets.some(t=>topicUrls(t).length>0);
}
function selectReviewBatch(dueItems,limit=4){
 const cap=Math.max(1,Math.min(12,Math.floor(limit)||4)),half=Math.floor(cap/2);
 // Exact duplicates only: retain every record and never merge similar
 // questions, translated content, different destinations or changed answers.
 const seen=new Set();
 const sorted=[...dueItems].sort((a,b)=>Number(discoveryRepairDue(b))-Number(discoveryRepairDue(a))||(a.item.review_preflight?.checked_at||'').localeCompare(b.item.review_preflight?.checked_at||'')).filter(x=>{
  if(x.kind==='editorial'&&['technical_seo','internal_link'].includes(x.item.kind))return false;
  const i=x.item;
  const key=x.kind==='faq'?JSON.stringify(['faq',norm(i.q),norm(i.a),i.risk_level]):
   JSON.stringify(['editorial',i.kind,i.lang,i.target,i.slug,i.related_service,i.topic_node_id,i.risk_level,norm(i.title),norm(i.summary),norm(i.body),i.h1_suggestion,i.primary_keyword,i.secondary_keywords,i.sections,i.internal_links,i.schema_suggestions]);
  // Incomplete malformed fixtures/records are distinct and must not hide other work.
  if(x.kind==='faq'?!(i.q&&i.a):!(i.title&&i.body&&i.target))return true;
  if(seen.has(key))return false;
  seen.add(key);return true;
 });
 const chosen=[...sorted.filter(x=>x.kind==='faq').slice(0,half),...sorted.filter(x=>x.kind==='editorial').slice(0,half)];
 for(const x of sorted){if(chosen.length>=cap)break;if(!chosen.includes(x))chosen.push(x)}
 return chosen;
}
// Verify each stored exact quotation against fresh official page text; never
// substitute unrelated newly found quotes for the saved version's proof.
async function liveProofReceipt(fields,claims,refs,request=fetch){
 if(!Array.isArray(claims)||claims.length<2||claims.length>10||!Array.isArray(refs))return null;
 const urls=Array.from(new Set(claims.map(p=>p?.url)));
 if(urls.length<2||urls.length>3||urls.some(u=>safeUrl(u)!==u))return null;
 if(claims.some(p=>typeof p.claim!=='string'||p.claim!==p.quote||
  !refs.some(r=>['official_candidate','official-manual'].includes(r.kind)&&r.url===p.url)))return null;
 const pages=await Promise.all(urls.map(async url=>({url,sentences:await page(url,request)})));
 const result=match(fields,pages);
 if(!result.complete||claims.length!==result.proofs.length||
  !claims.every(p=>result.proofs.some(q=>q.claim===p.claim&&q.url===p.url)))return null;
 const checked_at=new Date().toISOString();
 return {urls:[...urls].sort(),proofs:claims.map(p=>({claim:p.claim,quote:p.quote,url:p.url,checked_at,verified_by:'live_official_exact_quote'}))};
}
module.exports={matchPublication,livePublicationReceipt,SOURCE_DISCOVERY_VERSION,discoveryRepairDue,assessPublicationRisk,liveProofReceipt,parts,digest,safeUrl,topicUrls,readBounded,page,match,eligible,due,editorialIdentityFields,selectReviewBatch,faqTopicTargets,selectOfficialCandidates};
