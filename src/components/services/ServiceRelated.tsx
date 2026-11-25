import ArrowUpRight from "@/components/ArrowUpRight";
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
            <p key={e.id}><a href={localizedPath(lang,'/insights/'+e.slug)}>{e.title} <ArrowUpRight /></a></p>)}
        </section>}
      <section className="service-related" aria-labelledby="service-related-heading">
        <p className="eyebrow">{lang === "ar" ? "استكشف خدماتنا" : lang === "zh" ? "探索其他服务" : "EXPLORE SERVICES"}</p>
        <h2 id="service-related-heading">{lang === "ar" ? "خدمات مرتبطة بخطوتك التالية" : lang === "zh" ? "与下一步相关的服务" : "Related services for your next step"}</h2>
        <div className="service-related-grid">
          {services.filter((item) => item.slug !== slug).slice(0, 3).map((item) => (
            <a key={item.slug} href={localizedPath(lang, `/services/${item.slug}`)}>
              <span>{item.authority}</span>
              <strong>{item.title[lang]}</strong>
              <small>{lang === "ar" ? "عرض الدليل" : lang === "zh" ? "查看指南" : "View guide"} <ArrowUpRight /></small>
            </a>
          ))}
        </div>
      </section>
  </>;
}
