import { packageOffers, packageDisclosure } from "./package-offers";
import type { PackageLocale } from "./package-offers";
export type PackageId = "establish" | "new-entity" | "trading";
export type { PackageLocale };
type Localized = Record<PackageLocale,string>;
/** Legacy projection from the single current offer source; do not maintain prices in two places. */
const mapping: Array<{id:PackageId;slug:string}> = [
  {id:"establish",slug:"services-branch"},
  {id:"new-entity",slug:"services-scratch"},
  {id:"trading",slug:"trading-scratch"},
];
export const investorPackages: Array<{id:PackageId;title:Localized;description:Localized;price:number;features:Localized[]}> =
  mapping.map(entry=>{
    const offer=packageOffers.find(item=>item.slug===entry.slug);
    if(!offer)throw new Error("Missing canonical package "+entry.slug);
    return {id:entry.id,title:offer.title,description:offer.pitch,price:offer.price,features:offer.features};
  });
export const packagePriceNote:Localized = packageDisclosure;
