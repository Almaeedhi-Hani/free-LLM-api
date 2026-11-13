import { getLocale } from "@/lib/site-language";
import { copy, services } from "@/lib/service-catalog";
import { getContent } from "@/lib/content-store";
export default async function HomePage() {
  const lang = getLocale();
  const content = await getContent();
  const t = copy[lang];
  const serviceList = services;
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span />
            {t.eyebrow}
          </p>
          <h1>
            {t.hero.split("\n").map((line, i) => (
              <span key={line} className={i ? "hero-accent" : ""}>
                {line}
              </span>
            ))}
          </h1>
          <p className="hero-intro">{t.intro}</p>
          <div className="hero-actions">
            <a className="action-primary" href="#services">
              {t.explore}
              <span>↗</span>
            </a>
            <a className="action-text" href="#contact">
              {t.contact} <span>←</span>
            </a>
          </div>
          <div className="hero-bottom">
            <span>01 — 06</span>
            <span>{t.tagline}</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit" />
          <div className="art-sun" />
          <div className="tower tower-one" />
          <div className="tower tower-two" />
          <div className="tower tower-three" />
          <div className="tower tower-four" />
          <div className="art-ground" />
          <div className="art-caption">
            <span>SAUDI ARABIA</span>
            <strong>A NEW PERSPECTIVE.</strong>
          </div>
          <div className="art-coordinate">24.7136° N · 46.6753° E</div>
        </div>
      </section>
      <div className="authority-strip">
        <span>{t.sources}</span>
        {["MISA", "Saudi Business Center", "SAMA", "CMA"].map((x) => (
          <span key={x}>{x}</span>
        ))}
      </div>
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
              href={`/services/${s.slug}`}
            >
              <div className="card-top">
                <span>0{i + 1}</span>
                <span className="card-arrow">↗</span>
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
      <section id="journey" className="journey-section">
        <div className="section-wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t.journey}</p>
              <h2>{t.process}</h2>
            </div>
            <p>{t.processIntro}</p>
          </div>
          <div className="journey-grid">
            {t.stages.map((s, i) => (
              <div key={s}>
                <span className="step-number">0{i + 1}</span>
                <h3>{s}</h3>
                <p>{t.stageText[i]}</p>
              </div>
            ))}
          </div>
          <p className="cost-note">{t.note}</p>
        </div>
      </section>
      <section id="sources" className="section-wrap sources-section">
        <div>
          <p className="eyebrow">{t.sources}</p>
          <h2>{t.faq}</h2>
          <details>
            <summary>{t.q}</summary>
            <p>{t.a}</p>
          </details>
          {lang === "ar" &&
            content.faqs.map((f, i) => (
              <details key={`${f.q}-${i}`}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
        </div>
        <aside className="source-panel">
          <span className="source-mark">↗</span>
          <h3>{t.sources}</h3>
          <p>{t.sourceNote}</p>
          {services.map((s) => (
            <a
              key={s.slug}
              href={s.source}
              target="_blank"
              rel="noopener noreferrer"
            >
              {s.authority}
              <span>↗</span>
            </a>
          ))}
          <small>{t.verified}</small>
        </aside>
      </section>
      {lang === "ar" && content.goldenParagraph && (
        <section className="editorial-note section-wrap">
          <h2>{t.adminContent}</h2>
          <p>{content.goldenParagraph}</p>
        </section>
      )}
      <section id="contact" className="contact-band">
        <div>
          <p className="eyebrow">{t.contact}</p>
          <h2>{t.reach}</h2>
          <p>{t.reachText}</p>
        </div>
        <div className="contact-actions">
          <a
            className="action-primary"
            href={content.contact.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp <span>↗</span>
          </a>
          <a href={`tel:${content.contact.phone}`}>
            {t.call} <bdi>{content.contact.phoneDisplay}</bdi>
          </a>
        </div>
      </section>
    </>
  );
}
