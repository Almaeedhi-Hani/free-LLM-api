import ArrowUpRight from "@/components/ArrowUpRight";
import { services } from "@/lib/service-catalog";
import type { HomeModel } from "@/lib/home/model";

export default function SourcesSection({lang, t, content}: Pick<HomeModel, "lang" | "t" | "content">) {
  return (
    <>
      <section id="sources" className="section-wrap sources-section">
        <div>
          <p className="eyebrow">{t.sources}</p>
          <h2>{t.faq}</h2>
          <details>
            <summary>{t.q}</summary>
            <p>{t.a}</p>
          </details>
          {lang === "ar" &&
            content.faqs
              .filter((f) => !/^STORAGE_TEST_/i.test(f.q))
              .map((f, i) => (
                <details key={`${f.q}-${i}`}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
        </div>
        <aside className="source-panel">
          <span className="source-mark"><ArrowUpRight /></span>
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
              <span><ArrowUpRight /></span>
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
    </>
  );
}
