import type {SiteContent} from './content-store';
import type {EditorialItem} from './editorial-types';
import {approvedEditorial} from './editorial-workflow';
import {services} from './service-catalog';
import {guides} from './service-guides';
import {packageOffers,packageDisclosure,packageUpdatedAt} from './package-offers';
import {isDisplayable} from './source-policy';
import {editorialPath} from './content-impact';
export const LOCALES=['ar','en','zh'] as const;
export type KnowledgeLocale=typeof LOCALES[number];
const TOPICS=['services','packages','faq','insights','updates'] as const;
type Topic=typeof TOPICS[number];
const prefix=(lang:KnowledgeLocale)=>lang==='ar'?'':'/'+lang;
const localeOf=(q:string):KnowledgeLocale=>/[\u3400-\u9fff]/.test(q)?'zh':/[\u0600-\u06ff]/.test(q)?'ar':'en';
const publicItems=(c:SiteContent,l:KnowledgeLocale)=>approvedEditorial(c.editorialItems,l).filter(e=>!!editorialPath(e));
const safeCitations=(urls:string[]|undefined,domains:string[]|null)=>domains===null?[]:Array.from(new Set((urls||[]).filter(u=>isDisplayable(u,domains))));
const validDate=(s:unknown):s is string=>typeof s==='string'&&Number.isFinite(Date.parse(s));
const dateOf=(e:EditorialItem)=>[e.updatedAt,e.reviewedAt].filter(validDate).sort().at(-1)||null;
const policy=[
 'Independent private Saudi investor services provider; not a government agency.',
 'Professional service fees exclude Saudi government charges, taxes, third-party costs and required capital.',
 'No guaranteed official approval, eligibility, timeline or financial outcome. Check current official rules with the responsible authority.',
 'Only currently published visitor content is included. Source links and publication method are not independent verification by this feed.'
];
export type KnowledgeSelection={kind:'index'|'full'|'locale'|'topic'|'page';locale?:KnowledgeLocale;topic?:Topic;page?:string};
export function parseKnowledgePath(parts:readonly string[]):KnowledgeSelection|null{
 if(parts.length===1){
  const n=parts[0];if(n==='index.txt')return {kind:'index'};
  if(LOCALES.some(l=>n===l+'.txt'))return {kind:'locale',locale:n.slice(0,-4) as KnowledgeLocale};
  if(TOPICS.some(t=>n===t+'.txt'))return {kind:'topic',topic:n.slice(0,-4) as Topic};
 }
 if(parts.length>=2&&parts.length<=3&&LOCALES.includes(parts[0] as KnowledgeLocale)){
  const locale=parts[0] as KnowledgeLocale,rest=parts.slice(1).join('/');
  if(rest==='home.md')return {kind:'page',locale,page:'/'};
  if(rest==='packages.md')return {kind:'page',locale,page:'/packages'};
  if(/^services\/[a-z0-9-]{1,90}\.md$/.test(rest)&&services.some(s=>rest==='services/'+s.slug+'.md'))return {kind:'page',locale,page:'/'+rest.slice(0,-3)};
  if(/^insights\/[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(rest)&&rest.length<=102)return {kind:'page',locale,page:'/'+rest.slice(0,-3)};
 }
 return null;
}
export const feedPaths=['/llms.txt','/llms-full.txt','/api/llm-version',...LOCALES.map(l=>'/llms/'+l+'.txt'),...TOPICS.map(t=>'/llms/'+t+'.txt')];
function mdPath(lang:KnowledgeLocale,path:string){return '/llms/'+lang+(path==='/'?'/home':path)+'.md'}
function localPath(lang:KnowledgeLocale,path:string){return prefix(lang)+path}
function article(e:EditorialItem,siteUrl:string,domains:string[]|null){
 return ['### '+e.title,'Language: '+e.lang,'Publication method: '+(e.approval_method==='automated'?'automated':'editorial'),
 'Public page: '+siteUrl+editorialPath(e),'Published/updated: '+(dateOf(e)||'unknown'),e.summary,e.body,
 ...(e.sections||[]).flatMap(s=>['#### '+s.h2,s.body,...(s.subsections||[]).flatMap(h=>['##### '+h.h3,h.body])]),
 'Source status: '+(e.source_verification||'not independently checked'),
 'Source URLs: '+safeCitations([...(e.cited_sources||[]),...(e.verified_sources||[])],domains).join('; ')].join('\n');
}
function serviceText(l:KnowledgeLocale,siteUrl:string,slug?:string){
 return services.filter(s=>!slug||s.slug===slug).map(s=>['### '+s.title[l],s.summary[l],guides[s.slug].insight[l],guides[s.slug].budget[l],guides[s.slug].q[l],guides[s.slug].a[l],
 ...Array.from(new Set([s.source,...guides[s.slug].references.map(ref=>ref.url)])).map(u=>'Authority reference (verify current status): '+u),
 'Public page: '+siteUrl+localPath(l,'/services/'+s.slug)].join('\n'));
}
function packageText(l:KnowledgeLocale,siteUrl:string){
 return ['Professional service fee policy: '+packageDisclosure[l],'Last package price review: '+packageUpdatedAt,
 ...packageOffers.map(o=>['### '+o.title[l],'Service fee: '+o.price+' SAR (professional services only)',o.audience[l],o.pitch[l],o.features.map(f=>f[l]).join('; '),o.requirements[l],o.exclusions[l],'Public offer: '+siteUrl+localPath(l,'/packages')+'#'+o.slug].join('\n'))];
}
function faqText(c:SiteContent,l:KnowledgeLocale,siteUrl:string){
 return c.faqs.filter(f=>!/^STORAGE_TEST_/i.test(f.q)&&localeOf(f.q)===l).map(f=>['Q: '+f.q,'A: '+f.a,'Source status: '+(f.source_verification||'not independently checked'),'Public FAQ location: '+siteUrl+'/'].join('\n'));
}
function editorials(c:SiteContent,l:KnowledgeLocale,siteUrl:string,domains:string[]|null,predicate:(e:EditorialItem)=>boolean){
 return publicItems(c,l).filter(predicate).map(e=>article(e,siteUrl,domains));
}
function scoped(c:SiteContent,l:KnowledgeLocale,t:Topic|undefined,siteUrl:string,domains:string[]|null){
 const out:string[]=[];
 if(!t||t==='services')out.push('## Services',...serviceText(l,siteUrl),...editorials(c,l,siteUrl,domains,e=>e.kind==='service'));
 if(!t||t==='packages')out.push('## Packages',...packageText(l,siteUrl),...editorials(c,l,siteUrl,domains,e=>e.kind==='packages'));
 if(!t||t==='faq')out.push('## FAQs',...faqText(c,l,siteUrl));
 if(!t||t==='insights')out.push('## Guides and comparisons',...editorials(c,l,siteUrl,domains,e=>e.kind==='guide'||e.kind==='comparison'));
 if(!t){out.push('## Homepage',...(l==='ar'?[c.goldenParagraph]:[]),...editorials(c,l,siteUrl,domains,e=>e.kind==='home'||e.kind==='trust'))}
 if(t==='updates'){
  out.push('## Current published revisions (not a historical event log)','Package price review: '+packageUpdatedAt);
  out.push(...publicItems(c,l).filter(e=>dateOf(e)).sort((a,b)=>dateOf(b)!.localeCompare(dateOf(a)!)).slice(0,20).map(e=>dateOf(e)+' — '+e.title+' — '+siteUrl+editorialPath(e)));
  out.push('FAQ revision timestamps are not available in the public FAQ schema.');
 }
 return out;
}
export function renderFull(c:SiteContent,siteUrl:string,domains:string[]|null=null):string{
 const content=c;
  const languages = LOCALES;
  const serviceGuides = languages.map(lang => services.map(s => [
      "## " + s.title[lang],
      s.summary[lang], guides[s.slug].insight[lang], guides[s.slug].budget[lang],
      guides[s.slug].q[lang], guides[s.slug].a[lang],
      ...Array.from(new Set([s.source,...guides[s.slug].references.map(ref=>ref.url)])).map(url=>"Authority source URL (verify current status): "+url),
      "Service URL: " + siteUrl + (lang==="ar"?"":"/"+lang) + "/services/" + s.slug,
    ].join("\n")));
  const offers = languages.map(lang => packageOffers.map(offer => [
    "### " + offer.title[lang],
    "Service fee: " + offer.price + " SAR (our professional services only; government charges are excluded)",
    "Previous listed professional fee: " + offer.previousPrice + " SAR (historical advertising not independently verified by this feed).",
    "Audience: " + offer.audience[lang],
    "Decision context: " + offer.pitch[lang],
    "Services: " + offer.features.map(f=>f[lang]).join("; "),
    "What to prepare: " + offer.requirements[lang],
    "Not included: " + offer.exclusions[lang],
    "Offer URL: " + siteUrl + (lang==="ar"?"":"/"+lang) + "/packages#" + offer.slug,
  ].join("\n")));
  const text = [
    "# Independent Saudi investor services — services, professional fees and source references",
    "Canonical machine-readable version: " + siteUrl + "/api/llm-version",
    "Concise AI-agent discovery index (quality-checked before index updates): " + siteUrl + "/llms.txt",
    "Last package price review: " + packageUpdatedAt,
    "This site is an independent private service provider, not the Ministry of Investment or a government agency.",
    "Official approvals, requirements and government fees are determined by Saudi authorities.",
    "Do not infer a guaranteed timeline, eligibility, legal outcome, bank approval or visa issuance from these service descriptions.",
    "All package amounts are our proposed professional service fees only, not government or statutory charges, taxes, third-party costs or required capital.",
    "Package discounts apply exclusively to our professional service fee component; government fees, official charges and taxes are never discounted by this site.",
    "Government charges are assessed by the competent Saudi authority; verify the current official amount independently when it becomes payable.",
    "Foreign investment registration may have sector-specific exclusions, including separate capital-market rules; verify the activity and current legislation with the relevant Saudi authority.",
    "Official investment registration information (check date 2026-11-15): https://misa.gov.sa/ar/frequently-asked-questions/",
    "Pricing and detailed scope are confirmed in writing before accepting any engagement.",
    "## Machine-readable content grouped by language",
    ...languages.flatMap((lang,index)=>[
      "## Language: " + lang,
      "### Professional service fee policy",
      packageDisclosure[lang],
      "### Packages",
      ...offers[index],
      "### Investor services and official reference URLs",
      ...serviceGuides[index],
    ]),
    "## How to choose a formation route",
    "1. Identify the intended Saudi business activity and its regulator.",
    "2. Assess investor identity, shareholding, foreign company status or eligible alternative route.",
    "3. Verify the requirements of MISA, Ministry of Commerce and sector regulators.",
    "4. Separate professional service fees, government fees, working capital and third-party costs.",
    "5. Request a written scope and fee breakdown before commencing work.",
    "## Published editorial content (publication method and source provenance retained)",
    ...languages.flatMap(lang=>approvedEditorial(content.editorialItems,lang).filter(e=>e.kind!=="technical_seo"&&e.kind!=="internal_link").map(e=>[
      "### "+e.title,"Language: "+lang,"Publication method: "+(e.approval_method==="automated"?"automated":"editorial"),"Placement: "+e.kind+" "+e.target,"Summary: "+e.summary,e.body,...(e.sections||[]).flatMap(s=>["#### "+s.h2,s.body,...(s.subsections||[]).flatMap(h=>["##### "+h.h3,h.body])]),
      "Citation URLs (not independently verified by this feed): "+safeCitations(e.cited_sources,domains).join("; "),
      "Editor-verified source URLs: "+safeCitations(e.verified_sources,domains).join("; "),
      "Public page: "+siteUrl+(lang==="ar"?"":"/"+lang)+(e.kind==="service"?"/services/"+e.target:e.kind==="packages"?"/packages":e.kind==="guide"||e.kind==="comparison"?"/insights/"+e.slug:"/")
    ].join("\n"))),
    "## Contact",
    "Phone: " + content.contact.phoneDisplay,
    ...(content.contact.email ? ["Email: " + content.contact.email] : []),
    "WhatsApp: " + content.contact.whatsapp,
    "## Additional Arabic editorial material (legacy FAQs are not independently verified in this feed)",
    content.goldenParagraph,
    ...content.faqs.filter(f=>!/^STORAGE_TEST_/i.test(f.q)).map(f=>"Q: "+f.q+"\nA: "+f.a),
    "Latest dated public editorial revision: " + (languages.flatMap(l=>publicItems(content,l).map(dateOf)).filter(validDate).sort().pop()||'unknown'),
  ].join("\n\n");

  return text;
}
export function renderKnowledge(c:SiteContent,sel:KnowledgeSelection,siteUrl:string,domains:string[]|null=null):string|null{
 if(sel.kind==='full')return renderFull(c,siteUrl,domains);
 const head=['# Invest in Saudi — '+(sel.kind==='index'?'AI knowledge index':sel.topic||sel.page||sel.locale||'Knowledge'),...policy,'Index: '+siteUrl+'/llms.txt'];
 if(sel.kind==='index'){
  const routes=LOCALES.flatMap(l=>[
   {p:'/',l},{p:'/packages',l},...services.map(s=>({p:'/services/'+s.slug,l})),
   ...publicItems(c,l).filter(e=>e.kind==='guide'||e.kind==='comparison').map(e=>({p:'/insights/'+e.slug,l}))
  ]);
  return [...head,'## Direct text feeds (choose only the relevant scope)',...feedPaths.filter(p=>p!=='/llms.txt').map(p=>'- ['+p+']('+siteUrl+p+')'),
  '## Page-specific Markdown and original HTML',...Array.from(new Set(routes.map(({p,l})=>'- ['+l+' '+p+']('+siteUrl+mdPath(l,p)+') — '+siteUrl+localPath(l,p)))),
  '## Updates','Current approved content is generated directly from the same site source.'].join('\n')+'\n';
 }
 if(sel.kind==='page'&&sel.locale&&sel.page){
  const l=sel.locale,p=sel.page,path=localPath(l,p);
  let body:string[]=[];
  if(p==='/')body=[...(l==='ar'?[c.goldenParagraph]:[]),...editorials(c,l,siteUrl,domains,e=>e.kind==='home'||e.kind==='trust'),...(l==='ar'?LOCALES.flatMap(locale=>faqText(c,locale,siteUrl)):[])];
  else if(p==='/packages')body=[...packageText(l,siteUrl),...editorials(c,l,siteUrl,domains,e=>e.kind==='packages')];
  else if(p.startsWith('/services/'))body=[...serviceText(l,siteUrl,p.slice(10)),...editorials(c,l,siteUrl,domains,e=>editorialPath(e)===path)];
  else if(p.startsWith('/insights/')){body=editorials(c,l,siteUrl,domains,e=>editorialPath(e)===path);if(!body.length)return null}
  else return null;
  return [...head,'Language: '+l,'Original HTML: '+siteUrl+path,...body].join('\n\n')+'\n';
 }
 const languages=sel.locale?[sel.locale]:LOCALES;
 return [...head,...languages.flatMap(l=>['## Language: '+l,...scoped(c,l,sel.topic,siteUrl,domains)])].join('\n\n')+'\n';
}
