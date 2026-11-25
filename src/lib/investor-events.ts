/** Closed vocabulary. No visitor identifier, raw URL, free-text or form data. */
export const CONSENT_NAME="site-cookie-consent";
export const CONSENT_VERSION=2;
export const investorEvents=["page_view","whatsapp_click","call_click","packages_open","category_open","offer_choose","request_start","assessment_complete"] as const;
export type InvestorEvent=typeof investorEvents[number];
const pages=["home","packages","insights","insight","misa-license","company-formation","corporate-banking","contract-drafting","premium-residency","investment-funds"] as const;
type Page=typeof pages[number];
export type InvestorSignal={event:InvestorEvent;page:Page;locale:"ar"|"en"|"zh"};
export function parseConsent(raw:string|undefined|null):boolean{
 if(!raw)return false;
 try{let value;try{value=JSON.parse(raw)}catch{value=JSON.parse(decodeURIComponent(raw))}
 return value.version===CONSENT_VERSION&&value.necessary===true&&value.analytics===true&&typeof value.marketing==="boolean";
 }catch{return false}
}
export function allowsLanguagePreference(raw:string|undefined|null):boolean{
 if(!raw)return false;
 try{let value;try{value=JSON.parse(raw)}catch{value=JSON.parse(decodeURIComponent(raw))}
 return value.version===CONSENT_VERSION&&value.necessary===true&&value.preferences===true;
 }catch{return false}
}
export function publicPage(path:string):Page|null{
 const p=path.replace(/^\/(?:en|zh)(?=\/|$)/,"").replace(/\/$/,"")||"/";
 if(p==="/")return "home";
 if(p==="/packages")return "packages";
 if(p==="/insights")return "insights";
 if(/^\/insights\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p))return "insight";
 if(p.startsWith("/services/")){const slug=p.slice(10);return pages.slice(4).includes(slug as Page)?slug as Page:null}
 return null;
}
export function validateInvestorSignal(input:unknown):InvestorSignal|null{
 if(!input||typeof input!=="object"||Array.isArray(input))return null;
 const v=input as Record<string,unknown>;
 if(Object.keys(v).sort().join(",")!=="event,locale,page")return null;
 if(!investorEvents.includes(v.event as InvestorEvent)||!pages.includes(v.page as Page)||!["ar","en","zh"].includes(v.locale as string))return null;
 return {event:v.event,page:v.page,locale:v.locale} as InvestorSignal;
}
