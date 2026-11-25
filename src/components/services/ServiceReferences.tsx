import ArrowUpRight from "@/components/ArrowUpRight";
import type {ServiceModel} from "@/lib/services/model";
export default function ServiceReferences({lang,t,s,guide,contact}:Pick<ServiceModel,"lang"|"t"|"s"|"guide"|"contact">) {
  return <>
        <aside id="service-references" className="source-panel service-reference-panel">
          <h2>{t.sources}</h2>
          <p>{t.sourceNote}</p>
          <a href={s.source} target="_blank" rel="noopener noreferrer">
            {s.authority} <ArrowUpRight />
          </a>
          {guide.references.map((ref) => (
            <a
              key={ref.url}
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {ref.label} <ArrowUpRight />
            </a>
          ))}
          <small>{t.verified}</small>
          <a
            className="action-primary"
            href={contact.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.contact} <ArrowUpRight />
          </a>
        </aside>
  </>;
}
