import {packageOffers,packageDisclosure} from './package-offers';
import type {PackageLocale} from './package-offers';
const ROOT='https://free-llm-api-1-didl.onrender.com';
export function catalogProofUrl(locale:PackageLocale){return ROOT+(locale==='ar'?'':'/'+locale)+'/packages'}
export function isCatalogProofUrl(url:string){return (['ar','en','zh'] as const).some(l=>catalogProofUrl(l)===url)}
/** Only exact current approved product names, features and exclusions. No
 * general regulatory inference, prices, pitch/eligibility claims or new offers. */
export function catalogProofPage(locale:PackageLocale){
 const fields=[packageDisclosure[locale],...packageOffers.flatMap(p=>[p.title[locale],...p.features.map(f=>f[locale]),p.exclusions[locale]])];
 const sentences=Array.from(new Set(fields.flatMap(s=>s.split(/[.!?]+(?:\s+|$)|[。！？؟]+\s*|\n+/)).map(s=>s.normalize('NFC').replace(/\s+/g,' ').trim()).filter(Boolean)));
 return {url:catalogProofUrl(locale),sentences};
}

/** Narrow deterministic repair for the known fee-boundary FAQ. It copies only
 * the existing published disclosure, never a new statutory fee or legal rule. */
export function catalogFeeFaqAnswer(question:string,locale:PackageLocale):string|null{
 const q=question.normalize('NFKC').trim().toLowerCase().replace(/[?？؟]+$/,'').trim().replace(/\s+/g,' ');
 const questions:Record<PackageLocale,string[]>={en:['are professional package fees the same as saudi government fees'],ar:['هل أتعاب الباقات المهنية هي نفسها الرسوم الحكومية السعودية'],zh:['专业服务套餐费用与沙特政府规费相同吗']};
 return questions[locale].includes(q)?packageDisclosure[locale]:null;
}
