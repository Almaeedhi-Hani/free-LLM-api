"use client";
import { usePathname } from "next/navigation";
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
          onClick={() => { document.cookie = `site-language=${lang}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`; }}
          href={lang === "ar" ? path : `/${lang}${path === "/" ? "" : path}`}
        >
          {lang === "zh" ? "中文" : lang === "ar" ? "العربية" : "English"}
        </a>
      ))}
    </div>
  );
}
