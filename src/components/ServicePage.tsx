import ServiceHeader from "./services/ServiceHeader";
import ServicePreparation from "./services/ServicePreparation";
import ServiceReferences from "./services/ServiceReferences";
import ServiceRelated from "./services/ServiceRelated";
import ServiceNextStep from "./services/ServiceNextStep";
import {loadServiceModel} from "@/lib/services/model";

export async function ServicePage({ slug }: { slug: string }) {
  const {lang,content,t,s,contact,guide,labels,relatedGuides,schema}=await loadServiceModel(slug);
  return (
    <article className="service-detail service-editorial section-wrap investor-service-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <ServiceHeader lang={lang} t={t} s={s} labels={labels} contact={contact} />
      <div className="detail-columns">
      <ServicePreparation lang={lang} labels={labels} guide={guide} slug={slug} />
      <ServiceReferences lang={lang} t={t} s={s} guide={guide} contact={contact} />
      </div>
      <ServiceRelated lang={lang} content={content} slug={slug} relatedGuides={relatedGuides} />
      <ServiceNextStep lang={lang} t={t} contact={contact} slug={slug} />
    </article>
  );
}
