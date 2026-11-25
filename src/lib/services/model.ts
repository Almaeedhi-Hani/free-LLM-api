import { getLocale, localizedPath } from "@/lib/site-language";
import { copy, services } from "@/lib/service-catalog";
import { getContent } from "@/lib/content-store";
import { approvedEditorial } from "@/lib/editorial-workflow";
import { guides, guideLabels } from "@/lib/service-guides";
import { siteUrl } from "@/lib/site-seo";

export async function loadServiceModel(slug:string) {
  const lang = getLocale();
  const content = await getContent();
  const t = copy[lang];
  const serviceList = services;
  const s = serviceList.find((x) => x.slug === slug)!;
  const { contact } = content;
  const guide = guides[slug];
  const labels = guideLabels[lang];
  const relatedGuides=approvedEditorial(content.editorialItems,lang).filter(e=>(e.kind==='guide'||e.kind==='comparison')&&e.slug&&e.related_service===slug).slice(0,3);
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": siteUrl + localizedPath(lang, `/services/${slug}`),
        name: s.title[lang],
        description: s.summary[lang],
        inLanguage: lang,
        citation: [s.source, ...guide.references.map((r) => r.url)],
      },
      {
        "@type": "Service",
        "@id": siteUrl + localizedPath(lang, `/services/${slug}`) + "#service",
        name: s.title[lang],
        description: s.summary[lang],
        serviceType: s.title[lang],
        areaServed: { "@type": "Country", name: "Saudi Arabia" },
        url: siteUrl + localizedPath(lang, `/services/${slug}`),
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: guide.q[lang],
            acceptedAnswer: { "@type": "Answer", text: guide.a[lang] },
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: t.brand,
            item: siteUrl + localizedPath(lang),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: s.title[lang],
            item: siteUrl + localizedPath(lang, `/services/${slug}`),
          },
        ],
      },
    ],
  };
  return {slug,lang,content,t,s,contact,guide,labels,relatedGuides,schema};
}
export type ServiceModel=Awaited<ReturnType<typeof loadServiceModel>>;
