import {packageOffers} from './package-offers';
import type {PackageLocale} from './package-offers';
const ROOT='https://free-llm-api-1-didl.onrender.com';
export function catalogProofUrl(locale:PackageLocale){return ROOT+(locale==='ar'?'':'/'+locale)+'/packages'}
export function isCatalogProofUrl(url:string){return (['ar','en','zh'] as const).some(l=>catalogProofUrl(l)===url)}
/** Only exact current approved product names, features and exclusions. No
 * general regulatory inference, prices, pitch/eligibility claims or new offers. */
export function catalogProofPage(locale:PackageLocale){
 const fields=packageOffers.flatMap(p=>[p.title[locale],...p.features.map(f=>f[locale]),p.exclusions[locale]]);
 const sentences=Array.from(new Set(fields.flatMap(s=>s.split(/[.!?]+(?:\s+|$)|[。！？؟]+\s*|\n+/)).map(s=>s.normalize('NFC').replace(/\s+/g,' ').trim()).filter(Boolean)));
 return {url:catalogProofUrl(locale),sentences};
}
