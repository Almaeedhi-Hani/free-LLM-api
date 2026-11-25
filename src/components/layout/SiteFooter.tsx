import {localizedPath, type Locale} from "@/lib/site-language";
import {copy,services} from "@/lib/service-catalog";
import type {getContent} from "@/lib/content-store";
type Contact=Awaited<ReturnType<typeof getContent>>["contact"];

export default function SiteFooter({lang,contact,whatsappHref}:{lang:Locale;contact:Contact;whatsappHref:string|null}) {
  const t=copy[lang];
  const serviceList=services;
  return (
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
  );
}
