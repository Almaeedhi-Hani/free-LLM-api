import { getLocale } from "@/lib/site-language";
import { copy, services } from "@/lib/service-catalog";
import { getContent } from "@/lib/content-store";
import { guides, guideLabels } from "@/lib/service-guides";
export async function ServicePage({ slug }: { slug: string }) {
  const lang = getLocale();
  const content = await getContent();
  const t = copy[lang];
  const serviceList = services;
  const s = serviceList.find((x) => x.slug === slug)!;
  const { contact } = content;
  const guide = guides[slug];
  const labels = guideLabels[lang];
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: s.title[lang],
    description: s.summary[lang],
    inLanguage: lang,
    citation: s.source,
  };
  return (
    <article className="service-detail section-wrap">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <a className="breadcrumb" href="/#services">
        {t.back} / {s.authority}
      </a>
      <p className="eyebrow">{s.authority} · SAUDI ARABIA</p>
      <h1>{s.title[lang]}</h1>
      <p className="detail-lead">{s.summary[lang]}</p>
      <div className="detail-columns">
        <section>
          <h2>{labels.prepare}</h2>
          <p>{labels.checklist}</p>
          {guide.prepare.map((step, i) => (
            <div className="detail-step" key={i}>
              <span>0{i + 1}</span>
              <div>
                <p>{step[lang]}</p>
              </div>
            </div>
          ))}
          <h2>{labels.insight}</h2>
          <p>{guide.insight[lang]}</p>
          <div className="guide-budget">
            <h2>{labels.budget}</h2>
            <p>{guide.budget[lang]}</p>
          </div>
          <h2>{labels.question}</h2>
          <h3>{guide.q[lang]}</h3>
          <p>{guide.a[lang]}</p>
        </section>
        <aside className="source-panel">
          <h2>{t.sources}</h2>
          <p>{t.sourceNote}</p>
          <a href={s.source} target="_blank" rel="noopener noreferrer">
            {s.authority} ↗
          </a>
          {guide.references.map((ref) => (
            <a
              key={ref.url}
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {ref.label} ↗
            </a>
          ))}
          <small>{t.verified}</small>
          <a
            className="action-primary"
            href={contact.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.contact} ↗
          </a>
        </aside>
      </div>
    </article>
  );
}
