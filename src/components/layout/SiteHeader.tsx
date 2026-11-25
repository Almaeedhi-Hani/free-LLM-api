import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import MobileFloatingNav from "@/components/MobileFloatingNav";
import {localizedPath, type Locale} from "@/lib/site-language";
import {copy} from "@/lib/service-catalog";

export default function SiteHeader({lang,hasGuides}:{lang:Locale;hasGuides:boolean}) {
  const t=copy[lang];
  return (
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
  );
}
