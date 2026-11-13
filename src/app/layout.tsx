import "./globals.css";
import type { Metadata } from "next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getContent } from "@/lib/content-store";
import { getLocale } from "@/lib/site-language";
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
  const serviceList = services;
  return (
    <html
      lang={lang === "zh" ? "zh-Hans" : lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <head>
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
            <a href="/" className="wordmark">
              <span className="brand-symbol" aria-hidden="true">
                ↗
              </span>
              <span>
                {t.brand}
                <small>SAUDI ARABIA</small>
              </span>
            </a>
            <nav className="desktop-nav" aria-label={t.nav}>
              <a href="/#services">{t.nav}</a>
              <a href="/#journey">{t.journey}</a>
              <a href="/#sources">{t.sources}</a>
            </nav>
            <LanguageSwitcher locale={lang} />
          </div>
          <nav className="mobile-nav">
            <a href="/#services">{t.nav}</a>
            <a href="/#journey">{t.journey}</a>
            <a href="/#contact">{t.contact}</a>
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="footer-top">
            <div>
              <a className="footer-brand" href="/">
                {t.brand} <span>↗</span>
              </a>
              <p>{t.tagline}</p>
            </div>
            <div>
              <h2>{t.nav}</h2>
              {serviceList.map((s) => (
                <a key={s.slug} href={`/services/${s.slug}`}>
                  {s.title[lang]}
                </a>
              ))}
            </div>
            <div>
              <h2>{t.contact}</h2>
              <a dir="ltr" href={`tel:${contact.phone}`}>
                {contact.phoneDisplay}
              </a>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
              <a
                href={contact.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp ↗
              </a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} {t.brand}
            </span>
            <span>{t.foot}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
