/** Shared, URL-safe WhatsApp advisor numbers. No customer information is sent. */
export type WhatsAppLanguage='ar'|'en'|'zh';
export type WhatsAppContact={
  whatsapp:string;
  whatsappNumbers?:Partial<Record<WhatsAppLanguage,string>>;
};
/** An international number, with country code, 8-15 digits. */
export function normalizeWhatsAppNumber(input:unknown):string|null{
 if(typeof input!=='string')return null;
 const trimmed=input.trim();
 if(!trimmed||!/^[+]?[\d\s()-]+$/.test(trimmed))return null;
 const digits=trimmed.replace(/[\s()+-]/g,'');
 return /^[1-9]\d{7,14}$/.test(digits)?digits:null;
}
export function defaultWhatsAppNumber(contact:WhatsAppContact):string|null{
 const match=/^https:\/\/wa\.me\/([1-9]\d{7,14})(?:\?[^#]*)?$/.exec(contact.whatsapp?.trim()||'');
 return match?match[1]:null;
}
/** Missing language-specific numbers always fall back to the existing general number. */
export function whatsAppNumberForLanguage(contact:WhatsAppContact,language:WhatsAppLanguage):string|null{
 return normalizeWhatsAppNumber(contact.whatsappNumbers?.[language])||defaultWhatsAppNumber(contact);
}
export function whatsAppUrlForLanguage(contact:WhatsAppContact,language:WhatsAppLanguage):string|null{
 const number=whatsAppNumberForLanguage(contact,language);
 return number?'https://wa.me/'+number:null;
}
