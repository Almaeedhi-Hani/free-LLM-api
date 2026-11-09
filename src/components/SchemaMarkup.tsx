import React from 'react';

export interface FAQItem {
  question: string;
  answer: string;
}

export interface MultilingualText {
  ar: string;
  en: string;
  zh: string;
}

export interface MultilingualFAQItem {
  question: MultilingualText;
  answer: MultilingualText;
}

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

export const ProfessionalServiceSchema: React.FC<ProfessionalServiceProps> = ({
  name = "منصة استثمر في السعودية لخدمات المستثمرين وتأسيس الشركات",
  description = "استشارات استثمارية متخصصة وإصدار تراخيص وزارة الاستثمار (MISA) وتأسيس الشركات للأجانب والمحليين في المملكة السعودية. المقر الرئيسي: الرياض (طريق الملك فهد، العليا). الفروع: جدة، المدينة المنورة، الدمام.",
  url = "https://investinsaudi-services.sa",
  telephone = "+966110000000",
  crNumber = "1010998877",
  misaLicense = "MISA-2024-LIC-9988",
  latitude = 24.7136,
  longitude = 46.6753,
  sameAs = [
    "https://misa.gov.sa",
    "https://mc.gov.sa",
    "https://linkedin.com/company/investinsaudi-services",
    "https://twitter.com/investinsaudisvc"
  ]
}) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "name": name,
    "description": description,
    "url": url,
    "telephone": telephone,
    "identifier": [
      {
        "@type": "PropertyValue",
        "name": "السجل التجاري (CR Number)",
        "value": crNumber
      },
      {
        "@type": "PropertyValue",
        "name": "ترخيص وزارة الاستثمار (MISA License)",
        "value": misaLicense
      }
    ],
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "طريق الملك فهد، حي العليا",
      "addressLocality": "الرياض",
      "addressRegion": "منطقة الرياض",
      "postalCode": "12214",
      "addressCountry": "SA"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": latitude,
      "longitude": longitude
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday"
      ],
      "opens": "09:00",
      "closes": "18:00"
    },
    "areaServed": {
      "@type": "Country",
      "name": "Saudi Arabia"
    },
    "sameAs": sameAs,
    "priceRange": "$$$$"
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export const MultilingualGraphSchema: React.FC<MultilingualGraphSchemaProps> = ({
  url,
  name,
  description,
  faqs
}) => {
  const baseUrl = "https://investinsaudi-services.sa";

  const graphSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfessionalService",
        "@id": baseUrl,
        "name": "Saudi Investor Setup Services",
        "url": baseUrl,
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "King Fahd Road",
          "addressLocality": "Riyadh",
          "addressRegion": "Riyadh Province",
          "addressCountry": "SA"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": "24.7136",
          "longitude": "46.6753"
        },
        "sameAs": [
          "https://wikidata.org",
          "https://linkedin.com"
        ]
      },
      {
        "@type": "Service",
        "@id": `${url}#service`,
        "provider": {
          "@id": baseUrl
        },
        "name": name,
        "description": description,
        "serviceType": "Legal and Business Consulting",
        "areaServed": [
          { "@type": "Country", "name": "US" },
          { "@type": "Country", "name": "GB" },
          { "@type": "Country", "name": "CN" },
          { "@type": "Country", "name": "EG" },
          { "@type": "Country", "name": "SA" }
        ]
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        "mainEntity": faqs.map(faq => ({
          "@type": "Question",
          "name": faq.question.en || faq.question.ar, // Schema prefers single string or language map if supported
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer.en || faq.answer.ar
          }
        }))
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graphSchema) }}
    />
  );
};

export const ServiceSchema: React.FC<ServiceSchemaProps> = ({
  name,
  description,
  providerName = "شركة خدمات المستثمرين المعتمدة بالسعودية",
  areaServed = "Saudi Arabia",
  serviceType = "Corporate & Investment Services",
  requirements = [],
  stages = []
}) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": name,
    "serviceType": serviceType,
    "description": description,
    "provider": {
      "@type": "ProfessionalService",
      "name": providerName
    },
    "areaServed": {
      "@type": "Country",
      "name": areaServed
    },
    ...(requirements.length > 0 && {
      "serviceOutput": requirements.join("، ")
    }),
    ...(stages.length > 0 && {
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": `مراحل تنفيذ ${name}`,
        "itemListElement": stages.map((stage, idx) => ({
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": `المرحلة ${idx + 1}: ${stage}`
          }
        }))
      }
    })
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export const FAQSchema: React.FC<{ items: FAQItem[] }> = ({ items }) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};
