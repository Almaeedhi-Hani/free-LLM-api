import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import MobileFloatingNav from "@/components/MobileFloatingNav";
import DesktopNavigation from "./DesktopNavigation";
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
            <DesktopNavigation label={t.nav} items={[
              {key:"services",href:localizedPath(lang)+"#services",label:t.nav},
              {key:"residency",href:localizedPath(lang,"/services/premium-residency"),label:lang==="ar"?"الإقامة المميزة":lang==="zh"?"高级居留":"Premium Residency"},
              {key:"packages",href:localizedPath(lang,"/packages"),label:lang==="ar"?"الباقات":lang==="zh"?"服务套餐":"Packages"},
              ...(hasGuides?[{key:"guides",href:localizedPath(lang,"/insights"),label:lang==="ar"?"الأدلة":lang==="zh"?"指南":"Guides"}]:[]),
              {key:"journey",href:localizedPath(lang)+"#journey",label:t.journey},
              {key:"sources",href:localizedPath(lang)+"#sources",label:t.sources},
            ]}/>
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
