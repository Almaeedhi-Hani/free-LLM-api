"use client";
import { usePathname } from "next/navigation";
export function LanguageSwitcher({ locale = "ar" }: { locale?: string }) {
  const pathname = usePathname();
  return (
    <div className="language-switch" aria-label="Language">
      {["ar", "en", "zh"].map((lang) => (
        <a
          key={lang}
          lang={lang}
          aria-current={locale === lang ? "true" : undefined}
          href={`/api/language?lang=${lang}&returnTo=${encodeURIComponent(pathname)}`}
        >
          {lang === "zh" ? "中文" : lang.toUpperCase()}
        </a>
      ))}
    </div>
  );
}
