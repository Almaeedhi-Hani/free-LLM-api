import type { Metadata } from "next";
import { getLocale, localizedPath } from "./site-language";
import { services, copy } from "./service-catalog";
export const siteUrl = (
  process.env.SITE_URL || "https://free-llm-api-1-didl.onrender.com"
).replace(/\/$/, "");
export function pageMetadata(slug?: string): Metadata {
  const lang = getLocale();
  const service = services.find((s) => s.slug === slug);
  const path = service ? `/services/${service.slug}` : "/";
  const title = service
    ? `${service.title[lang]} ${lang === "ar" ? "في السعودية" : lang === "zh" ? "｜沙特阿拉伯" : "in Saudi Arabia"} | ${copy[lang].brand}`
    : {
        ar: "تأسيس الشركات وخدمات المستثمرين في السعودية | التسجيل الاستثماري",
        en: "Saudi Arabia Company Formation & Investor Services | Investment Registration",
        zh: "沙特公司设立与投资者服务｜投资登记与企业银行开户",
      }[lang];
  const description =
    service?.summary[lang] ||
    {
      ar: "دليل الاستثمار وتأسيس الشركات في السعودية: التسجيل الاستثماري لدى MISA، الحسابات البنكية، العقود والإقامة المميزة. متطلبات ورسوم موثّقة بمصادر رسمية.",
      en: "Plan company formation in Saudi Arabia: MISA investment registration, corporate banking, contracts and Premium Residency, with official sources and scoped fee guidance.",
      zh: "了解沙特公司设立、MISA投资登记、企业银行开户、合同及高级居留。提供官方来源、材料清单及明确范围的费用说明。",
    }[lang];
  const canonical = siteUrl + localizedPath(lang, path);
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ar: siteUrl + path,
        en: siteUrl + localizedPath("en", path),
        "zh-Hans": siteUrl + localizedPath("zh", path),
        "x-default": siteUrl + path,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: copy[lang].brand,
      type: "website",
      locale: { ar: "ar_SA", en: "en_US", zh: "zh_CN" }[lang],
    },
    twitter: { card: "summary", title, description },
    robots: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  };
}
