"use client";
import { usePathname } from "next/navigation";
import {CONSENT_NAME,allowsLanguagePreference} from "@/lib/investor-events";
export function LanguageSwitcher({ locale = "ar" }: { locale?: string }) {
  const pathname = usePathname();
  const path = pathname.replace(/^\/(ar|en|zh)(?=\/|$)/, "") || "/";
  return (
    <div className="language-switch" aria-label="اختر اللغة / Choose language / 选择语言">
      {["ar", "en", "zh"].map((lang) => (
        <a
          key={lang}
          lang={lang}
          aria-current={locale === lang ? "true" : undefined}
          onClick={() => { const consent=document.cookie.split("; ").find(x=>x.startsWith(CONSENT_NAME+"="))?.slice(CONSENT_NAME.length+1); if(allowsLanguagePreference(consent))document.cookie = `site-language=${lang}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==="https:"?"; Secure":""}`; }}
          href={lang === "ar" ? path : `/${lang}${path === "/" ? "" : path}`}
        >
          {lang === "zh" ? "中文" : lang === "ar" ? "العربية" : "English"}
        </a>
      ))}
    </div>
  );
}
