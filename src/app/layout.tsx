import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import {WhatsAppFloat} from "@/components/WhatsAppFloat";
import {whatsAppUrlForLanguage} from "@/lib/whatsapp-contacts";
import InvestorAnalytics from "@/components/InvestorAnalytics";
import { CookieConsent } from "@/components/CookieConsent";
import { getPublicContent as getContent } from "@/lib/public-content";
import { approvedEditorial } from "@/lib/editorial-workflow";
import { getLocale } from "@/lib/site-language";
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
  const content = await getContent();
  const { contact } = content;
  const whatsappHref=whatsAppUrlForLanguage(contact,lang);
  const hasGuides=approvedEditorial(content.editorialItems,lang).some(e=>e.kind==="guide"||e.kind==="comparison");
  const verification = content.searchIntegrations?.googleVerification || "9DD9bimLxrjoQrAMYZB4Icwz_0lnfnb2idwXBqqBK4w";
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
        <SiteHeader lang={lang} hasGuides={hasGuides} />
        <main id="main">{children}</main>
        <SiteFooter lang={lang} contact={contact} whatsappHref={whatsappHref} />
        <WhatsAppFloat locale={lang} contact={contact}/>
        <CookieConsent locale={lang} policy={content.cookiePolicy} />
        <InvestorAnalytics locale={lang} enabled={content.cookiePolicy.analyticsAvailable} />
      </body>
    </html>
  );
}
