import {localizedPath, type Locale} from "@/lib/site-language";
import CookieSettingsButton from "@/components/CookieSettingsButton";
import ArrowUpRight from "@/components/ArrowUpRight";
import {copy,services} from "@/lib/service-catalog";
import type {getContent} from "@/lib/content-store";
type Contact=Awaited<ReturnType<typeof getContent>>["contact"];

export default function SiteFooter({lang,contact,whatsappHref}:{lang:Locale;contact:Contact;whatsappHref:string|null}) {
  const t=copy[lang];
  const serviceList=services;
  return (
        <footer className="site-footer">
          <div className="investor-footer-intro"><div><p className="eyebrow">{lang==="ar"?"خطوتك التالية":lang==="zh"?"下一步":"YOUR NEXT STEP"}</p><h2>{lang==="ar"?"ابدأ بخطة واضحة لاستثمارك.":lang==="zh"?"为您的投资制定清晰计划。":"Start with a clear investment plan."}</h2></div>{whatsappHref&&<a className="investor-footer-cta" href={whatsappHref} target="_blank" rel="noopener noreferrer">{t.contact} <ArrowUpRight/></a>}</div>
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
            <span>{t.foot}</span><CookieSettingsButton lang={lang}/>
          </div>
        </footer>
  );
}
