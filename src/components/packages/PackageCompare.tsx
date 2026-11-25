import {packageOffers,packageDisclosure,type PackageGroupId,type PackageLocale} from "@/lib/package-offers";
import {money} from "@/lib/packages/request-catalog";
export default function PackageCompare({lang,group,active,onSelect}:{lang:PackageLocale;group:PackageGroupId;active:string;onSelect:(id:string)=>void}){
  const offers=packageOffers.filter(p=>p.group===group);
  const t={ar:{title:"قارن خيارات هذا الترخيص",package:"الباقة",audience:"لمن تناسب",price:"أتعاب الخدمة (ر.س)",installments:"الدفعات",action:"عرض التفاصيل",selected:"محددة"},en:{title:"Compare options in this category",package:"Package",audience:"Who it suits",price:"Service fee (SAR)",installments:"Instalments",action:"View details",selected:"Selected"},zh:{title:"比较此类别的套餐",package:"套餐",audience:"适用对象",price:"服务费 (SAR)",installments:"分期次数",action:"查看详情",selected:"已选择"}}[lang];
  return <details className="investor-package-compare"><summary>{t.title}</summary>
    <p>{packageDisclosure[lang]}</p>
    <div className="investor-compare-scroll" tabIndex={0} role="region" aria-label={t.title}><table><caption className="sr-only">{t.title}</caption><thead><tr>{[t.package,t.audience,t.price,t.installments,t.action].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{offers.map(o=><tr key={o.slug}><th scope="row">{o.title[lang]}</th><td>{o.audience[lang]}</td><td><bdi>{money(o.price)}</bdi></td><td>{o.installments}</td><td><button type="button" aria-pressed={active===o.id} data-investor-event="offer_choose" onClick={()=>onSelect(o.id)}>{active===o.id?t.selected:t.action}</button></td></tr>)}</tbody></table></div>
  </details>;
}
