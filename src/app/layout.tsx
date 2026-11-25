import "./globals.css";
import type { Metadata } from "next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import MobileFloatingNav from "@/components/MobileFloatingNav";
import {WhatsAppFloat} from "@/components/WhatsAppFloat";
import {whatsAppUrlForLanguage} from "@/lib/whatsapp-contacts";
import { CookieConsent } from "@/components/CookieConsent";
import { getContent } from "@/lib/content-store";
import { approvedEditorial } from "@/lib/editorial-workflow";
import { getLocale, localizedPath } from "@/lib/site-language";
import { copy, services } from "@/lib/service-catalog";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "خدمات المستثمرين | Investor Services · Saudi Arabia",
  description:
    "معلومات موثّقة عن الاستثمار وتأسيس الشركات في السعودية. Sourced guidance for investing and establishing a business in Saudi Arabia.",
  metadataBase: new URL(
    process.env.SITE_URL || "https://free-llm-api-1-didl.onrender.com",
  ),
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = getLocale();
  const t = copy[lang];
  const content = await getContent();
  const { contact } = content;
  const whatsappHref=whatsAppUrlForLanguage(contact,lang);
  const hasGuides=approvedEditorial(content.editorialItems,lang).some(e=>e.kind==="guide"||e.kind==="comparison");
  const verification = content.searchIntegrations?.googleVerification || "9DD9bimLxrjoQrAMYZB4Icwz_0lnfnb2idwXBqqBK4w";
  const serviceList = services;
  return (
    <html
      lang={lang === "zh" ? "zh-Hans" : lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <head>
        {verification && <meta name="google-site-verification" content={verification} />}
        <link
          rel="alternate"
          type="text/plain"
          href="/api/llm-version"
          title="Machine readable content"
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          {lang === "ar"
            ? "انتقل إلى المحتوى"
            : lang === "zh"
              ? "跳至内容"
              : "Skip to content"}
        </a>
        <header className="site-header">
          <div className="header-inner">
            <a href={localizedPath(lang)} className="wordmark">
              
              <span>
                {t.brand}
                <small>SAUDI ARABIA</small>
              </span>
            </a>
            <nav className="desktop-nav" aria-label={t.nav}>
              <a href={localizedPath(lang) + "#services"}>{t.nav}</a>
              <a href={localizedPath(lang,"/services/premium-residency")}>{lang==="ar"?"الإقامة المميزة":lang==="zh"?"高级居留":"Premium Residency"}</a>
              <a href={localizedPath(lang,"/packages")}>{lang==="ar"?"الباقات":lang==="zh"?"服务套餐":"Packages"}</a>
              {hasGuides&&<a href={localizedPath(lang,"/insights")}>{lang==="ar"?"الأدلة":lang==="zh"?"指南":"Guides"}</a>}
              <a href={localizedPath(lang) + "#journey"}>{t.journey}</a>
              <a href={localizedPath(lang) + "#sources"}>{t.sources}</a>
            </nav>
            <LanguageSwitcher locale={lang} />
          </div>
          <nav className="mobile-nav">
            <a href={localizedPath(lang) + "#services"}>{t.nav}</a>
              <a href={localizedPath(lang,"/services/premium-residency")}>{lang==="ar"?"الإقامة المميزة":lang==="zh"?"高级居留":"Premium Residency"}</a>
            <a href={localizedPath(lang,"/packages")}>{lang==="ar"?"الباقات":lang==="zh"?"服务套餐":"Packages"}</a>
            {hasGuides&&<a href={localizedPath(lang,"/insights")}>{lang==="ar"?"الأدلة":lang==="zh"?"指南":"Guides"}</a>}
            <a href={localizedPath(lang) + "#contact"}>{t.contact}</a>
          </nav>
          <MobileFloatingNav locale={lang} brand={t.brand} hasGuides={hasGuides} />
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="footer-top">
            <div>
              <a className="footer-brand" href={localizedPath(lang)}>
                {t.brand}
              </a>
              <p>{t.tagline}</p>
            </div>
            <div>
              <h2>{t.nav}</h2>
              <a href={localizedPath(lang,"/packages")}>{lang==="ar"?"الباقات":lang==="zh"?"服务套餐":"Packages"}</a>
              {serviceList.map((s) => (
                <a
                  key={s.slug}
                  href={localizedPath(lang, `/services/${s.slug}`)}
                >
                  {s.title[lang]}
                </a>
              ))}
            </div>
            <div>
              <h2>{t.contact}</h2>
              <a dir="ltr" href={`tel:${contact.phone}`}>
                {contact.phoneDisplay}
              </a>
              {contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null}
              {whatsappHref&&<a href={whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} {t.brand}
            </span>
            <span>{t.foot}</span>
          </div>
        </footer>
        <WhatsAppFloat locale={lang} contact={contact}/>
        <CookieConsent locale={lang} policy={content.cookiePolicy} />
      </body>
    </html>
  );
}
