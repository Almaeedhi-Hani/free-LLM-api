import { formationPlaybook as p, playbookReviewedAt, playbookSources } from "@/lib/formation-playbook";
import type { PackageLocale } from "@/lib/package-offers";

// Server-rendered, source-backed content is available to readers and crawlers.
export default function FormationPlaybook({ lang }: {lang: PackageLocale}) {
  return (
    <section className="formation-playbook" id="formation-playbook" dir={lang==="ar"?"rtl":"ltr"} aria-labelledby="formation-playbook-heading">
      <header className="formation-playbook-intro">
        <p className="eyebrow">{p.eyebrow[lang]}</p>
        <h2 id="formation-playbook-heading">{p.title[lang]}</h2>
        <p>{p.intro[lang]}</p>
      </header>
      <div className="formation-playbook-section">
        <h3>{p.routesHeading[lang]}</h3>
        <div className="formation-route-grid">
          {p.routes.map((route, index) => (
            <article className="formation-route" key={route.slug}>
              <span aria-hidden="true" className="formation-index">{String(index+1).padStart(2,"0")}</span>
              <h4>{route.title[lang]}</h4>
              <p>{route.context[lang]}</p>
              <strong>{route.next[lang]}</strong>
            </article>
          ))}
        </div>
      </div>
      <section className="formation-playbook-section formation-costs" aria-labelledby="formation-costs-title">
        <div>
          <h3 id="formation-costs-title">{p.costsTitle[lang]}</h3>
          <p>{p.costsIntro[lang]}</p>
        </div>
        <dl>
          {p.costs.map((cost,i) => (
            <div key={i}>
              <dt>{cost.title[lang]}</dt>
              <dd>{cost.detail[lang]}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="formation-playbook-section formation-questions" aria-labelledby="formation-questions-title">
        <h3 id="formation-questions-title">{p.questionsTitle[lang]}</h3>
        {p.questions.map((item,i)=>(
          <details key={i}>
            <summary>{item.q[lang]}</summary>
            <p>{item.a[lang]}</p>
          </details>
        ))}
      </section>
      <footer className="formation-playbook-footer">
        <div>
          <h3>{p.sourcesHeading[lang]}</h3>
          <p>{p.reviewedLabel[lang]}: <time dateTime={playbookReviewedAt}>{playbookReviewedAt}</time></p>
          <ul>
            {playbookSources.map(source => (
              <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title[lang]}</a></li>
            ))}
          </ul>
          <p className="formation-caution">{p.disclaimer[lang]}</p>
        </div>
        <a className="action-primary" href="#package-options">{p.cta[lang]}</a>
      </footer>
    </section>
  );
}
