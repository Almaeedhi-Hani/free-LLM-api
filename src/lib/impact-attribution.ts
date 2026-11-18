/** Privacy-minimized attribution of confirmed, persisted package requests.
 * A browser-provided origin is a hint, NOT proof that a page caused a lead.
 * Never put personal details, query parameters or visitor IDs in analytics.
 */
export const impactOriginPattern=/^\/(?:en\/|zh\/)?(?:insights\/[a-z0-9]+(?:-[a-z0-9]+)*|services\/(?:company-formation|misa-license|corporate-banking|contract-drafting|premium-residency|investment-funds)|packages)?\/?$/;
export function canonicalImpactOrigin(value:unknown):string|null{
 if(typeof value!=='string'||value.length<1||value.length>180||!impactOriginPattern.test(value))return null;
 return value.length>1?value.replace(/\/$/,''):value;
}
export type ConfirmedLeadEvent={
 source_path:string;attribution:'client_reported'|'form_page';occurred_at:string;locale:'ar'|'en'|'zh';
};
export type LeadTotals={total:number;byPage:Record<string,{total:number;clientReported:number;formPage:number}>;status:'available'|'unavailable';message:string};
export function summarizeConfirmedLeads(rows:readonly ConfirmedLeadEvent[]):LeadTotals{
 const byPage:LeadTotals['byPage']={};
 for(const e of rows){
  const path=canonicalImpactOrigin(e.source_path);
  if(!path||!['client_reported','form_page'].includes(e.attribution)||
     !['ar','en','zh'].includes(e.locale)||!Number.isFinite(Date.parse(e.occurred_at)))
   throw Error('Invalid confirmed request event');
  const tally=byPage[path]||{total:0,clientReported:0,formPage:0};
  tally.total++;
  if(e.attribution==='client_reported')tally.clientReported++;
  else tally.formPage++;
  byPage[path]=tally;
 }
 return {total:rows.length,byPage,status:'available',
  message:'طلبات باقات محفوظة فعليًا فقط؛ صفحة الإحالة اختيارية ومقدّمة من المتصفح، ولا تثبت سبب التحويل أو جودة العميل.'};
}
