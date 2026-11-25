export type ContactForm={phone:string;phoneDisplay:string;whatsapp:string;email:string;whatsappAr:string;whatsappEn:string;whatsappZh:string;
 advisorNameAr:string;advisorTitleAr:string;advisorNameEn:string;advisorTitleEn:string;advisorNameZh:string;advisorTitleZh:string};
export const contactToForm=(raw?:{
 phone?:string;phoneDisplay?:string;whatsapp?:string;email?:string;
 whatsappNumbers?:{ar?:string;en?:string;zh?:string};
 whatsappAdvisors?:Partial<Record<'ar'|'en'|'zh',{name:string;title:string}>>
}):ContactForm=>({
 phone:raw?.phone||'',phoneDisplay:raw?.phoneDisplay||'',
 whatsapp:raw?.whatsapp||'',email:raw?.email||'',
 whatsappAr:raw?.whatsappNumbers?.ar||'',
 whatsappEn:raw?.whatsappNumbers?.en||'',
 whatsappZh:raw?.whatsappNumbers?.zh||'',
 advisorNameAr:raw?.whatsappAdvisors?.ar?.name||'',advisorTitleAr:raw?.whatsappAdvisors?.ar?.title||'',
 advisorNameEn:raw?.whatsappAdvisors?.en?.name||'',advisorTitleEn:raw?.whatsappAdvisors?.en?.title||'',
 advisorNameZh:raw?.whatsappAdvisors?.zh?.name||'',advisorTitleZh:raw?.whatsappAdvisors?.zh?.title||''
});
export const numberValid=(raw:string)=>!raw.trim()||/^\+?[0-9()\s-]+$/.test(raw.trim())&&
 /^[1-9][0-9]{7,14}$/.test(raw.trim().replace(/[\s()+-]/g,''));
export const digitsOnly=(raw:string)=>raw.trim().replace(/[\s()+-]/g,'');
