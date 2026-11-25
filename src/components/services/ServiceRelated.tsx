import { DiscoveryContent, DiscoveryLink, serviceDiscoveryIcon } from "@/components/discovery/DiscoveryCard";
import {localizedPath} from "@/lib/site-language";
import {services} from "@/lib/service-catalog";
import {EditorialBlock} from "@/components/EditorialBlock";
import type {ServiceModel} from "@/lib/services/model";
export default function ServiceRelated({lang,content,slug,relatedGuides}:Pick<ServiceModel,"lang"|"content"|"slug"|"relatedGuides">) {
  return <>
      <EditorialBlock items={content.editorialItems} lang={lang} kind="service" target={slug} inside/>
      {relatedGuides.length>0&&
        <section className="service-related">
          <h2>{lang==='ar'?'محتوى معرفي ذو صلة':lang==='zh'?'更多实用指南':'Further investor resources'}</h2>
          {relatedGuides.map(e=>
            <DiscoveryLink key={e.id} href={localizedPath(lang,'/insights/'+e.slug)} title={e.title} icon={e.kind==="comparison"?"comparison":"guide"}/>)}
        </section>}
      <section className="service-related" aria-labelledby="service-related-heading">
        <p className="eyebrow">{lang === "ar" ? "استكشف خدماتنا" : lang === "zh" ? "探索其他服务" : "EXPLORE SERVICES"}</p>
        <h2 id="service-related-heading">{lang === "ar" ? "خدمات مرتبطة بخطوتك التالية" : lang === "zh" ? "与下一步相关的服务" : "Related services for your next step"}</h2>
        <div className="service-related-grid discovery-grid">
          {services.filter((item) => item.slug !== slug).slice(0, 3).map((item) => (
            <a key={item.slug} href={localizedPath(lang, `/services/${item.slug}`)} className="discovery-card">
              <DiscoveryContent icon={serviceDiscoveryIcon(item.slug)} eyebrow={item.authority} title={item.title[lang]} description={item.summary[lang]} action={lang==="ar"?"عرض الدليل":lang==="zh"?"查看指南":"View guide"}/>
            </a>
          ))}
        </div>
      </section>
  </>;
}
