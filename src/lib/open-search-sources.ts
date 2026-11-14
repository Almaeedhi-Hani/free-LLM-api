import type { Language } from './market-intelligence';
export interface SearchResult {domain:string;title:string;snippet:string;url:string;rank:number;source:string}
export interface SearchSource {id:string;free:boolean;requiresKey:string|null;supportedLanguages:Language[];deprecated?:boolean;collectSuggestions(q:string,l:Language):Promise<{term:string;language:Language;source:string}[]>;collectResults(q:string,l:Language,n:number):Promise<SearchResult[]>}
type Diagnostic={http_status:number;duration_ms:number;response_received:boolean;results_parsed:number;blocked_detected:boolean;failure_reason:string};
const blank=():Diagnostic=>({http_status:0,duration_ms:0,response_received:false,results_parsed:0,blocked_detected:false,failure_reason:''});
const clean=(s:string)=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const excluded=['google.com','bing.com','duckduckgo.com','youtube.com','linkedin.com','facebook.com','wikipedia.org','investing.com'];
function dest(s:string):{domain:string,url:string}|null {
 try {let u=new URL(clean(s),'https://html.duckduckgo.com');const redirect=u.searchParams.get('uddg');if(redirect&&u.hostname.endsWith('duckduckgo.com'))u=new URL(redirect);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return null;const domain=u.hostname.replace(/^www\./,'').toLowerCase();if(!domain.includes('.')||domain.endsWith('.gov.sa')||excluded.some(d=>domain===d||domain.endsWith('.'+d)))return null;u.hash='';return {domain,url:u.href};}catch{return null}
}
// Strictly classify a search hit as relevant before it can become a market competitor.
// This is a minimum heuristic, not proof that a business actually competes.
export function isRelevantInvestorService(title:string,snippet:string):boolean {
 const text=(title+' '+snippet).toLowerCase();
 const service=/(company formation|company incorporation|business setup|business registration|investment licen[sc]|misa licen[sc]|foreign investor|تأسيس شرك|ترخيص استثمار|رخصة استثمار|مستثمر أجنبي|外资|公司注册|投资许可)/i.test(text);
 const saudi=/(saudi|ksa|misa|السعود|استثمار أجنبي|المملكة|沙特)/i.test(text);
 return service && saudi;
}
export function parseDuckDuckGoHtml(html:string,limit=10):SearchResult[]{
 const result:SearchResult[]=[],seen=new Set<string>();
 for(const m of Array.from(html.matchAll(/<a\b([^>]*class=["'][^"']*result__a[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi))){
  const href=m[1].match(/href=["']([^"']+)["']/i), d=href&&dest(href[1]);if(!d||seen.has(d.domain))continue;
  const title=clean(m[2]);if(!title||!isRelevantInvestorService(title,''))continue;seen.add(d.domain);
  result.push({...d,title,snippet:'',rank:result.length+1,source:'duckduckgo-html'});if(result.length>=limit)break;
 }return result;
}
export function parseBingRss(xml:string,limit=10):SearchResult[]{
 if(!/<rss\b/i.test(xml)||!/<channel\b/i.test(xml))return [];
 const results:SearchResult[]=[],seen=new Set<string>();
 for(const m of Array.from(xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi))){
  const field=(tag:string)=>m[1].match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i'))?.[1]||'';
  const d=dest(field('link'));if(!d||seen.has(d.domain))continue;const title=clean(field('title'));const snippet=clean(field('description'));if(!title||!isRelevantInvestorService(title,snippet))continue;seen.add(d.domain);
  results.push({...d,title,snippet:clean(field('description')).slice(0,500),rank:results.length+1,source:'bing-rss'});if(results.length>=limit)break;
 }return results;
}
abstract class Base {
 lastDiagnostic:Diagnostic=blank();
 async collectSuggestions():Promise<[]> {return []}
 protected async request(url:string,parser:(x:string,n:number)=>SearchResult[],limit:number,init:RequestInit={}):Promise<SearchResult[]>{
  const t=Date.now();this.lastDiagnostic=blank();
  try{
   const res=await fetch(url,{...init,signal:AbortSignal.timeout(8000),cache:'no-store'});
   const body=await res.text();const blocked=[202,403,429,503].includes(res.status)||/captcha|anomaly-modal|verify you are human/i.test(body.slice(0,20000));
   const results=res.status===200&&!blocked?parser(body,Math.min(limit,20)):[];
   this.lastDiagnostic={http_status:res.status,duration_ms:Date.now()-t,response_received:true,results_parsed:results.length,blocked_detected:blocked,failure_reason:blocked?'blocked_or_throttled':res.status!==200?'http_'+res.status:results.length===0?'no_parseable_results':''};
   return results;
  }catch(e){this.lastDiagnostic={...blank(),duration_ms:Date.now()-t,failure_reason:e instanceof Error&&['TimeoutError','AbortError'].includes(e.name)?'timeout':'network_error'};return []}
 }
}
export class BingRssSearchSource extends Base implements SearchSource {
 id='bing-rss';free=true;requiresKey=null;supportedLanguages:Language[]=['ar','en','zh'];
 async collectResults(q:string,l:Language,n:number){return this.request('https://www.bing.com/search?format=rss&q='+encodeURIComponent(q)+'&setlang='+(l==='zh'?'zh-CN':l==='ar'?'ar-SA':'en-US'),parseBingRss,n,{headers:{Accept:'application/rss+xml, application/xml;q=0.9'}})}
}
export class DuckDuckGoHtmlSource extends Base implements SearchSource {
 id='duckduckgo-html';free=true;requiresKey=null;supportedLanguages:Language[]=['ar','en','zh'];
 async collectResults(q:string,l:Language,n:number){return this.request('https://html.duckduckgo.com/html/',parseDuckDuckGoHtml,n,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'q='+encodeURIComponent(q)+'&kl='+(l==='zh'?'cn-zh':l==='ar'?'ar':'us-en')})}
}
export function openSearchSources():SearchSource[]{return [new BingRssSearchSource(),new DuckDuckGoHtmlSource()]}
