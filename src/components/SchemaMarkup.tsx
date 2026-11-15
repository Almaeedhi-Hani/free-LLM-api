import React from "react";

/** Structured data must never imply unverified licensing, branches or government affiliation. */
export interface FAQItem { question: string; answer: string }
export interface MultilingualText { ar: string; en: string; zh: string }
export interface MultilingualFAQItem { question: MultilingualText; answer: MultilingualText }
export interface MultilingualGraphSchemaProps {
  url: string; name: MultilingualText; description: MultilingualText;
  faqs: MultilingualFAQItem[];
}
export interface ServiceSchemaProps {
  name: string; description: string; providerName?: string; areaServed?: string;
  serviceType?: string; requirements?: string[]; stages?: string[];
}
export interface ProfessionalServiceProps {
  name?: string; description?: string; url?: string; telephone?: string;
  crNumber?: string; misaLicense?: string; latitude?: number; longitude?: number;
  sameAs?: string[];
}
const json = (schema: unknown) => JSON.stringify(schema).replace(/</g, "\\u003c");
function JsonLd({data}:{data:unknown}) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:json(data)}}/>;
}
export const ProfessionalServiceSchema: React.FC<ProfessionalServiceProps> = ({
  name = "خدمات المستثمرين وتأسيس الشركات في السعودية",
  description = "خدمات خاصة لمساعدة المستثمرين على تقييم متطلبات تأسيس الشركات والأنشطة في المملكة. الموافقات والرسوم الرسمية تحددها الجهات المختصة.",
  url, telephone, crNumber, misaLicense, latitude, longitude, sameAs
}) => {
  const identifiers = [
    ...(crNumber ? [{"@type":"PropertyValue",name:"Commercial registration number",value:crNumber}] : []),
    ...(misaLicense ? [{"@type":"PropertyValue",name:"MISA registration identifier",value:misaLicense}] : []),
  ];
  const schema = {
    "@context":"https://schema.org", "@type":"ProfessionalService", name, description,
    ...(url ? {url} : {}), ...(telephone ? {telephone} : {}),
    ...(identifiers.length ? {identifier:identifiers} : {}),
    ...(typeof latitude==="number" && typeof longitude==="number"
       ? {geo:{"@type":"GeoCoordinates",latitude,longitude}} : {}),
    ...(sameAs?.length ? {sameAs} : {}),
    areaServed:{"@type":"Country",name:"Saudi Arabia"},
  };
  return <JsonLd data={schema}/>;
};
export const MultilingualGraphSchema: React.FC<MultilingualGraphSchemaProps> = ({
  url,name,description,faqs
}) => {
  const lang: keyof MultilingualText = /\/zh(?:\/|$)/.test(url) ? "zh" :
    /\/en(?:\/|$)/.test(url) ? "en" : "ar";
  const page = {
    "@type":"WebPage", "@id":url, url, name:name[lang], description:description[lang],
    inLanguage:lang==="zh"?"zh-Hans":lang,
  };
  const service = {
    "@type":"Service", "@id":url+"#service", name:name[lang], description:description[lang],
    serviceType:"Investor services", areaServed:{"@type":"Country",name:"Saudi Arabia"},
  };
  const faq = {
    "@type":"FAQPage", "@id":url+"#faq",
    inLanguage:lang==="zh"?"zh-Hans":lang,
    mainEntity:faqs.map(item=>({
      "@type":"Question",name:item.question[lang],
      acceptedAnswer:{"@type":"Answer",text:item.answer[lang]}
    })),
  };
  return <JsonLd data={{"@context":"https://schema.org","@graph":
    faqs.length?[page,service,faq]:[page,service]}}/>;
};
export const ServiceSchema: React.FC<ServiceSchemaProps> = ({
  name,description,providerName="Saudi Investor Services",
  areaServed="Saudi Arabia",serviceType="Corporate and investor support",
  requirements=[],stages=[]
}) => {
  const schema = {
    "@context":"https://schema.org","@type":"Service",name,description,serviceType,
    provider:{"@type":"Organization",name:providerName},
    areaServed:{"@type":"Country",name:areaServed},
    ...(requirements.length ? {description:description+" Requirements: "+requirements.join("; ")} : {}),
    ...(stages.length ? {hasOfferCatalog:{"@type":"OfferCatalog",
      name:"Service stages",itemListElement:stages.map((step,i)=>({
        "@type":"Offer",itemOffered:{"@type":"Service",name:(i+1)+". "+step}
      }))}} : {}),
  };
  return <JsonLd data={schema}/>;
};
export const FAQSchema: React.FC<{items:FAQItem[]}> = ({items}) => {
  if(!items.length)return null;
  return <JsonLd data={{
    "@context":"https://schema.org","@type":"FAQPage",
    mainEntity:items.map(item=>({"@type":"Question",name:item.question,
      acceptedAnswer:{"@type":"Answer",text:item.answer}}))
  }}/>;
};
