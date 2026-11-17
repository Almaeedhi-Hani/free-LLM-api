/** Search suggestions are discovery candidates, NEVER verified legal evidence. */
export type OfficialSearchLocale='ar'|'en'|'zh';
export type OfficialSourceSearchInput={
  title:string;lang:OfficialSearchLocale;primary_keyword?:string;target?:string;
};
const authorityTerms:Record<string,Record<OfficialSearchLocale,string>>={
  'company-formation':{ar:'وزارة التجارة تأسيس الشركات',en:'Saudi Ministry of Commerce company formation',zh:'沙特 商业部 公司 设立'},
  'misa-license':{ar:'وزارة الاستثمار ترخيص الاستثمار',en:'Saudi Ministry of Investment licensing',zh:'沙特 投资部 投资 许可'},
  'corporate-banking':{ar:'البنك المركزي السعودي حسابات الشركات',en:'Saudi Central Bank corporate banking',zh:'沙特 中央银行 企业账户'},
  'contract-drafting':{ar:'وزارة التجارة عقد التأسيس',en:'Saudi Ministry of Commerce articles of association',zh:'沙特 商业部 公司章程'},
  'premium-residency':{ar:'الإقامة المميزة السعودية',en:'Saudi premium residency official requirements',zh:'沙特 高级居留 官方 条件'},
  'investment-funds':{ar:'هيئة السوق المالية صناديق الاستثمار',en:'Saudi capital market authority investment funds',zh:'沙特 资本市场 投资基金'},
};
const fallback:Record<OfficialSearchLocale,string>={
 ar:'جهة حكومية سعودية',en:'Saudi government authority',zh:'沙特 政府 官方',
};
function searchPhrase(value:unknown):string {
 if(typeof value!=='string')return '';
 return value.replace(/[\u0000-\u001f<>"']/g,' ')
   .replace(/\bsite:\S+/gi,' ')
   .replace(/\s+/g,' ').trim().slice(0,95);
}
/** At most 2 manually triggered queries, with a strict official-domain operator. */
export function officialSourceQueries(input:OfficialSourceSearchInput):string[]{
 if(!input||!['ar','en','zh'].includes(input.lang))return [];
 const title=searchPhrase(input.title);
 const keyword=searchPhrase(input.primary_keyword);
 if(!title)return [];
 const slug=typeof input.target==='string'
   ?input.target.replace(/^\/services\//,'').trim():'';
 const authority=(authorityTerms[slug]||fallback)[input.lang];
 const phrases=[
   [keyword||title,authority].filter(Boolean).join(' '),
   [title,authority].filter(Boolean).join(' ')
 ];
 return Array.from(new Set(phrases.map(p=>(p+' site:gov.sa').slice(0,240)))).slice(0,2);
}
function decodeSnippet(value:string):string {
 return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
  .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"')
  .replace(/&#39;|&apos;/gi,"'")
  .replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
}
/** Domain checks only establish an official-site candidate, NOT factual verification. */
export function isSaudiGovernmentCandidate(value:string):boolean{
 try{
  const url=new URL(value);
  return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&
   (url.hostname==='gov.sa'||url.hostname.endsWith('.gov.sa'));
 }catch{return false;}
}
export type OfficialSourceResult={url:string;title:string;snippet:string};
export function officialResultsFromRss(xml:string,limit=5):OfficialSourceResult[]{
 const result:OfficialSourceResult[]=[];
 if(typeof xml!=='string'||!Number.isFinite(limit))return result;
 const cap=Math.min(5,Math.max(0,Math.trunc(limit)));
 if(cap===0)return result;
 for(const item of xml.slice(0,250000).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)){
  const field=(tag:string)=>decodeSnippet(item[1].match(
    new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i')
   )?.[1]||'');
  const rawUrl=field('link');
  if(!isSaudiGovernmentCandidate(rawUrl))continue;
  const url=new URL(rawUrl).href;
  if(result.some(x=>x.url===url))continue;
  result.push({url,title:field('title').slice(0,180),snippet:field('description').slice(0,260)});
  if(result.length>=cap)break;
 }
 return result;
}
