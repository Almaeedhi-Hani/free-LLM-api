import ArrowUpRight from "@/components/ArrowUpRight";
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
        <div className="service-grid">
          {serviceList.map((s, i) => (
            <a
              className="service-card"
              key={s.slug}
              href={localizedPath(lang, `/services/${s.slug}`)}
            >
              <div className="card-top">
                <span>0{i + 1}</span>
                <span className="card-arrow"><ArrowUpRight /></span>
              </div>
              <div className="service-icon" aria-hidden="true">
                {["◈", "▤", "▥", "⌘", "◇", "◉"][i]}
              </div>
              <h3>{s.title[lang]}</h3>
              <p>{s.summary[lang]}</p>
              <span className="card-link">
                {t.detail} <span>←</span>
              </span>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
