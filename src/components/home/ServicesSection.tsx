import { DiscoveryContent, serviceDiscoveryIcon } from "@/components/discovery/DiscoveryCard";
import { localizedPath } from "@/lib/site-language";
import type { HomeModel } from "@/lib/home/model";

export default function ServicesSection({lang, t, serviceList}: Pick<HomeModel, "lang" | "t" | "serviceList">) {
  return (
    <>
      <section id="services" className="section-wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t.label}</p>
            <h2>{t.heading}</h2>
          </div>
          <p>{t.description}</p>
        </div>
        <div className="service-grid discovery-grid">
          {serviceList.map((s, i) => (
            <a
              className="service-card discovery-card"
              key={s.slug}
              href={localizedPath(lang, `/services/${s.slug}`)}
            >
              <DiscoveryContent icon={serviceDiscoveryIcon(s.slug)} number={i+1} title={s.title[lang]} description={s.summary[lang]} action={t.detail} heading/>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
