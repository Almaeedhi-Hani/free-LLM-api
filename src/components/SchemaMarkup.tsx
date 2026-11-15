import React from "react";
import { siteUrl } from "@/lib/site-seo";

// Only verified business facts should be supplied to these reusable schemas.
// No invented licences, CR numbers, address, affiliates, coordinates or hours.
export interface FAQItem { question: string; answer: string }
export interface MultilingualText { ar: string; en: string; zh: string }
export interface MultilingualFAQItem { question: MultilingualText; answer: MultilingualText }
export interface MultilingualGraphSchemaProps {
  url: string;
  name: MultilingualText;
  description: MultilingualText;
  faqs: MultilingualFAQItem[];
}
export interface ServiceSchemaProps {
  name: string;
  description: string;
  providerName?: string;
  areaServed?: string;
  serviceType?: string;
  requirements?: string[];
  stages?: string[];
}
export interface ProfessionalServiceProps {
  name?: string;
  description?: string;
  url?: string;
  telephone?: string;
  crNumber?: string;
  misaLicense?: string;
  latitude?: number;
  longitude?: number;
  sameAs?: string[];
}
function jsonLd(payload: unknown) {
  return { __html: JSON.stringify(payload).replace(/</g, "\\u003c") };
}
const organizationId = siteUrl + "/#organization";

export const ProfessionalServiceSchema: React.FC<ProfessionalServiceProps> = ({
  name = "Saudi investor services",
  description = "Independent private assistance for investors planning company formation in Saudi Arabia.",
  url = siteUrl, telephone, crNumber, misaLicense, latitude, longitude, sameAs
}) => {
  const identifiers = [
    ...(crNumber ? [{"@type":"PropertyValue",name:"Commercial registration",value:crNumber}] : []),
    ...(misaLicense ? [{"@type":"PropertyValue",name:"Investment registration identifier",value:misaLicense}] : [])
  ];
  const schema = {
    "@context":"https://schema.org", "@type":"ProfessionalService", "@id":organizationId,
    name, description, url,
    areaServed:{"@type":"Country",name:"Saudi Arabia"},
    ...(telephone ? {telephone} : {}),
    ...(identifiers.length ? {identifier:identifiers} : {}),
    ...(typeof latitude==="number" && typeof longitude==="number" ? {geo:{"@type":"GeoCoordinates",latitude,longitude}} : {}),
    ...(sameAs?.length ? {sameAs: sameAs.filter(url => /^https:\/\//i.test(url))} : {})
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(schema)}/>;
};

export const MultilingualGraphSchema: React.FC<MultilingualGraphSchemaProps> = ({
  url, name, description, faqs
}) => {
  const graph = {
    "@context":"https://schema.org",
    "@graph":[
      {"@type":"Organization","@id":organizationId,url:siteUrl,name:name.en || name.ar,
       description:description.en || description.ar},
      {"@type":"Service","@id":url+"#service",url,
       provider:{"@id":organizationId},name:name.en || name.ar,
       description:description.en || description.ar,
       areaServed:{"@type":"Country",name:"Saudi Arabia"}},
      {"@type":"FAQPage","@id":url+"#faq",
       mainEntity:faqs.map(f=>({"@type":"Question",name:f.question.en || f.question.ar,
         acceptedAnswer:{"@type":"Answer",text:f.answer.en || f.answer.ar}}))}
    ]
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(graph)}/>;
};

export const ServiceSchema: React.FC<ServiceSchemaProps> = ({
  name, description, providerName, areaServed = "Saudi Arabia",
  serviceType = "Investor support and company formation", requirements = [], stages = []
}) => {
  const schema = {
    "@context":"https://schema.org","@type":"Service",name,description,serviceType,
    provider:{"@id":organizationId,...(providerName?{name:providerName}:{})},
    areaServed:{"@type":"Country",name:areaServed},
    ...(requirements.length ? {serviceOutput:requirements.join("; ")} : {}),
    ...(stages.length ? {hasOfferCatalog:{
      "@type":"OfferCatalog",name:"Service stages",
      itemListElement: stages.map((stage,i)=>({
        "@type":"Offer",itemOffered:{"@type":"Service",name:String(i+1)+". "+stage}
      }))
    }} : {})
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(schema)}/>;
};

export const FAQSchema: React.FC<{items:FAQItem[]}> = ({items}) =>
  <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd({
    "@context":"https://schema.org","@type":"FAQPage",
    mainEntity:items.map(item=>({"@type":"Question",name:item.question,
      acceptedAnswer:{"@type":"Answer",text:item.answer}}))
  })}/>;
