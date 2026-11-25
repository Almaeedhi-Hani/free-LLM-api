import {investorEvents,type InvestorEvent} from "./investor-events";
export const pageLabels={home:"الرئيسية",packages:"الباقات",insights:"الأدلة",insight:"المقالات", "misa-license":"الترخيص الاستثماري","company-formation":"تأسيس الشركات","corporate-banking":"الحسابات البنكية","contract-drafting":"صياغة العقود","premium-residency":"الإقامة المميزة","investment-funds":"الصناديق الاستثمارية"} as const;
export const localeLabels={ar:"العربية",en:"الإنجليزية",zh:"الصينية"} as const;
export const eventLabels:Record<InvestorEvent,string>={page_view:"مشاهدات الصفحات",whatsapp_click:"نقرات واتساب",call_click:"نقرات الاتصال",packages_open:"فتح الباقات",category_open:"فتح التصنيف",offer_choose:"اختيار الباقة",request_start:"بدء الطلب",assessment_complete:"إكمال تقييم الإقامة"};
type Row={day:string;page:string;locale:string;total:number};
export type InvestorReport={from:string;to:string;firstRecordedDay:string|null;signals:(Row&{event:InvestorEvent})[];requests:Row[]};
export function reportFilters(days:string,locale:string,page:string){return ['7','30','90'].includes(days)&&(locale==='all'||Object.hasOwnProperty.call(localeLabels,locale))&&(page==='all'||Object.hasOwnProperty.call(pageLabels,page))}
export function summarizeReport(report:InvestorReport){
 const totals=Object.fromEntries(investorEvents.map(e=>[e,0])) as Record<InvestorEvent,number>;
 type Bucket={views:number;contacts:number;requests:number};
 const byPage:Record<string,Bucket>={},byLocale:Record<string,Bucket>={},byDay:Record<string,Bucket>={};
 const bucket=(map:Record<string,Bucket>,key:string)=>map[key]??(map[key]={views:0,contacts:0,requests:0});
 for(const r of report.signals){
  totals[r.event]+=r.total;
  for(const b of [bucket(byPage,r.page),bucket(byLocale,r.locale),bucket(byDay,r.day)]){
   if(r.event==='page_view')b.views+=r.total;
   if(r.event==='whatsapp_click'||r.event==='call_click')b.contacts+=r.total;
  }
 }
 let requests=0;for(const r of report.requests){requests+=r.total;for(const b of [bucket(byPage,r.page),bucket(byLocale,r.locale),bucket(byDay,r.day)])b.requests+=r.total}
 const contacts=totals.whatsapp_click+totals.call_click;
 return {totals,contacts,requests,ratio:totals.page_view?100*contacts/totals.page_view:null,byPage,byLocale,byDay};
}
