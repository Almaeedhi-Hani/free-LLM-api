"use client";
import { usePathname } from "next/navigation";
export function LanguageSwitcher({ locale = "ar" }: { locale?: string }) {
  const pathname = usePathname();
  const path = pathname.replace(/^\/(ar|en|zh)(?=\/|$)/, "") || "/";
  return (
    <div className="language-switch" aria-label="Language">
      {["ar", "en", "zh"].map((lang) => (
        <a
          key={lang}
          lang={lang}
          aria-current={locale === lang ? "true" : undefined}
          href={lang === "ar" ? path : `/${lang}${path === "/" ? "" : path}`}
        >
          {lang === "zh" ? "中文" : lang.toUpperCase()}
        </a>
      ))}
    </div>
  );
}
