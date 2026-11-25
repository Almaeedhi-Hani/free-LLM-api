import { siteUrl } from "@/lib/site-seo";
import { getLocale, localizedPath } from "@/lib/site-language";
import { copy, services } from "@/lib/service-catalog";
import {getPublicContent as getContent} from "@/lib/public-content";
import {faqsForLocale} from "@/lib/geo-draft-quality";

/** Server-only homepage data preparation and structured data. */
export async function loadHomeModel() {
  const lang = getLocale();
  const content = await getContent();
  const t = copy[lang];
  const serviceList = services;
  const faqItems = [
    { q: t.q, a: t.a },
    ...faqsForLocale(content.faqs,lang),
  ];
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": siteUrl + "/#website",
        name: t.brand,
        url: siteUrl,
        inLanguage: ["ar", "en", "zh-Hans"],
      },
      {
        "@type": "CollectionPage",
        url: siteUrl + localizedPath(lang),
        name: t.brand,
        description: t.intro,
        inLanguage: lang,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: serviceList.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: s.title[lang],
            url: siteUrl + localizedPath(lang, `/services/${s.slug}`),
          })),
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
  return {lang, content, t, serviceList, schema};
}

export type HomeModel = Awaited<ReturnType<typeof loadHomeModel>>;
