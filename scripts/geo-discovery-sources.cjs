'use strict';
// Read-only evidence collection for the OpenCode GEO pipeline. Zero synthetic results.
// Google Suggest supplies queries, NOT ranking or confirmed competitors. Bing RSS supplies
// candidate websites with source URLs. All research is subject to further verification.
const MAX_REQ_MS=6000;
const seeds=[
 {q:'تأسيس شركة في السعودية للأجانب',language:'ar',locale:'ar-SA'},
 {q:'company formation Saudi Arabia foreign investor',language:'en',locale:'en-US'},
 {q:'沙特外国投资公司注册',language:'zh',locale:'zh-CN'}
];
const decode=s=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/g,"'").replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const keyword=(s)=>/(company formation|business setup|company registration|company incorporation|investor services|investment licen[sc]|misa licen[sc]|تأسيس شرك|ترخيص استثمار|رخصة استثمار|公司注册|投资许可)/i.test(s);
const region=(s)=>/(saudi|ksa|misa|السعود|المملكة|沙特)/i.test(s);
function parseRss(xml,query,language,max=5){
 if(!/<rss\b/i.test(xml)||!/<channel\b/i.test(xml))return [];
 let results=[];const seen=new Set();
 for(const m of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)){
  const tag=n=>m[1].match(new RegExp('<'+n+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+n+'>','i'))?.[1]||'';
  const title=decode(tag('title')),snippet=decode(tag('description'));
  if(!keyword(title+' '+snippet)||!region(title+' '+snippet))continue;
  try{
   const u=new URL(decode(tag('link')));if(!['http:','https:'].includes(u.protocol))continue;
   const host=u.hostname.replace(/^www\./,'').toLowerCase();
   if(!host||seen.has(host)||host.endsWith('.gov.sa')||/(news|gazette|wikipedia|youtube|aljazeera|alarabiya|saudia\.com)/i.test(host))continue;
   seen.add(host);u.hash='';
   results.push({url:u.href,title:title.slice(0,250),snippet:snippet.slice(0,400),language,query,source:'bing-rss',collected_at:new Date().toISOString()});
   if(results.length>=max)break;
  }catch{}
 }
 return results;
}
async function collect({fetchFn=fetch}={}){
 const competitors=[],suggestions=[],diagnostics=[],domains=new Set(),terms=new Set();
 for(const seed of seeds){
  try{
   const url='https://suggestqueries.google.com/complete/search?client=firefox&hl='+seed.language+'&q='+encodeURIComponent(seed.q);
   const r=await fetchFn(url,{signal:AbortSignal.timeout(MAX_REQ_MS)});
   if(!r.ok)throw new Error('http_'+r.status);
   const data=await r.json();let added=0;
   for(const term of (Array.isArray(data?.[1])?data[1]:[]).slice(0,10)){
    if(typeof term!=='string')continue;const normalized=term.trim();
    const key=seed.language+':'+normalized.toLowerCase();
    if(!normalized||terms.has(key))continue;terms.add(key);added++;
    suggestions.push({term:normalized,language:seed.language,query:seed.q,source:'google-suggest',collected_at:new Date().toISOString()});
   }
   diagnostics.push({source:'google-suggest',language:seed.language,status:r.status,count:added});
  }catch(e){diagnostics.push({source:'google-suggest',language:seed.language,status:'unavailable',reason:String(e?.name==='TimeoutError'?'timeout':e?.message||'error').slice(0,70),count:0})}
 }
 // Four-provider shared engine; only one bounded search request per language by
 // default. Fallback is automatic when a provider errors or returns no evidence.
 const providerEngine=require('../src/lib/provider-search.cjs');
 const queries=seeds.map(seed=>({query:seed.q,language:seed.language}));
 if(providerEngine.configured().length){
  const outcome=await providerEngine.search({queries,maxCalls:3,maxResults:15,fetchFn});
  for(const hit of outcome.results){
   if(domains.has(hit.domain))continue;domains.add(hit.domain);
   competitors.push({...hit,source:hit.source,verification:'candidate'});
  }
  for(const d of outcome.diagnostics)diagnostics.push({
   source:d.provider,language:d.language,status:d.http_status||d.status,
   count:d.added,reason:d.status==='ok'?undefined:d.status
  });
 }else{
  // The old open RSS fallback is only used when no configured API is available.
  // It is not allowed to masquerade as a paid search result.
  for(const seed of seeds){
   try{
    const url='https://www.bing.com/search?format=rss&q='+encodeURIComponent(seed.q)+'&setlang='+seed.locale;
    const r=await fetchFn(url,{signal:AbortSignal.timeout(MAX_REQ_MS),headers:{Accept:'application/rss+xml'}});
    if(!r.ok)throw new Error('http_'+r.status);
    const found=parseRss(await r.text(),seed.q,seed.language,5);
    for(const candidate of found){const domain=new URL(candidate.url).hostname;if(domains.has(domain))continue;domains.add(domain);competitors.push(candidate);}
    diagnostics.push({source:'bing-rss',language:seed.language,status:r.status,count:found.length});
   }catch(e){diagnostics.push({source:'bing-rss',language:seed.language,status:'unavailable',reason:String(e?.name==='TimeoutError'?'timeout':e?.message||'error').slice(0,70),count:0})}
  }
 }
 return {competitors:competitors.slice(0,15),suggestions:suggestions.slice(0,30),diagnostics,
   status:competitors.length?'success':suggestions.length?'partial':'blocked'};
}
module.exports={collect,parseRss};
