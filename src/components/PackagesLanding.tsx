import { getContent } from "@/lib/content-store";
import { localizedPath } from "@/lib/site-language";
import { siteUrl } from "@/lib/site-seo";
import { packageOffers, packageDisclosure, packageUpdatedAt } from "@/lib/package-offers";
import type { PackageLocale } from "@/lib/package-offers";
import PackageRequest from "@/components/packages/PackageRequest";
import { EditorialBlock } from "@/components/EditorialBlock";

export default async function PackagesLanding({lang}:{lang:PackageLocale}) {
  const content = await getContent();
  const url = siteUrl + localizedPath(lang, "/packages");
  // Every structured offer is also visible, in full, in the pre-rendered page.
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type":"CollectionPage", "@id": url, url,
        name: {
          ar:"باقات تأسيس الشركات والتراخيص الاستثمارية في السعودية",
          en:"Saudi company formation and investment licence packages",
          zh:"沙特公司设立及投资许可服务套餐",
        }[lang],
        inLanguage: lang==="zh"?"zh-Hans":lang,
        dateModified: packageUpdatedAt,
        mainEntity: {
          "@type":"ItemList",
          numberOfItems:packageOffers.length,
          itemListElement:packageOffers.map((offer,i)=>({
            "@type":"ListItem",position:i+1,
            url:url+"#"+offer.slug,
            item:{
              "@type":"Service",name:offer.title[lang],
              description:offer.pitch[lang],
              serviceType:offer.title[lang],
              areaServed:{ "@type":"Country",name:"Saudi Arabia" },
              offers:{
                "@type":"Offer",price:offer.price,
                priceCurrency:"SAR",url:url+"#"+offer.slug,
                description:packageDisclosure[lang],
              }
            }
          })),
        }
      }
    ]
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/>
      <PackageRequest lang={lang}/>
      <EditorialBlock items={content.editorialItems} lang={lang} kind="packages" target="/packages"/>
    </>
  );
}
