import { localizedPath, type Locale } from "@/lib/site-language";
import { packageGroups, packageOffers, type PackageGroupId } from "@/lib/package-offers";
import PackageArrow from "@/components/packages/PackageArrow";
import styles from "./FormationPackagesBanner.module.css";

const copy = {
  ar: {
    eyebrow: "باقات التأسيس",
    first: "استعرض باقات",
    second: "التأسيس وأسعارها",
    description: "قارن المسارات والخدمات والأتعاب المهنية، واختر الباقة المناسبة لتأسيس نشاطك في السعودية.",
    cta: "استعرض الباقات",
    count: (n: number) => n+" باقات",
    groups: {services:"الاستثمار الخدمي",trading:"الاستثمار التجاري",professional:"الأنشطة المهنية"},
  },
  en: {
    eyebrow: "FORMATION PACKAGES",
    first: "Explore formation",
    second: "packages and prices",
    description: "Compare routes, services and professional fees to find the right package for your business in Saudi Arabia.",
    cta: "Explore packages",
    count: (n: number) => n+" packages",
    groups: {services:"Service investment",trading:"Trading investment",professional:"Professional activities"},
  },
  zh: {
    eyebrow: "企业设立套餐",
    first: "查看企业设立",
    second: "套餐及价格",
    description: "比较设立路径、服务内容和专业服务费，选择适合您在沙特开展业务的套餐。",
    cta: "查看套餐",
    count: (n: number) => n+" 个套餐",
    groups: {services:"服务类投资",trading:"贸易类投资",professional:"专业服务活动"},
  },
} as const;

function CategoryIcon({category}:{category:PackageGroupId}) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {category==="services"?<><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M3 12l9 3 9-3M12 13v3"/></>:
       category==="trading"?<><path d="M3 7h18l-2-4H5L3 7ZM4 11v9h16v-9M9 20v-6h6v6"/><path d="M3 7v2a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V7"/></>:
       <><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h3m2 2 2 2 4-4"/></>}
    </svg>
  );
}

/** A localized, server-rendered homepage CTA. Category counts come from the current catalog. */
export default function FormationPackagesBanner({lang}:{lang:Locale}) {
  const t=copy[lang];
  // Use actual site categories, not the illustrative Basic/Pro/Business labels.
  const order:PackageGroupId[]=["professional","services","trading"];
  return (
    <section id="formation-packages-banner" className={styles.section} aria-labelledby="formation-packages-title" dir={lang==="ar"?"rtl":"ltr"}>
      <div className={styles.banner}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 13 11 22 2 13V3h10l8 8a1.4 1.4 0 0 1 0 2Z"/><circle cx="7" cy="8" r="1.5"/></svg>{t.eyebrow}</span>
          <h2 id="formation-packages-title"><span>{t.first}</span>{" "}<span className={styles.accent}>{t.second}</span></h2>
          <p>{t.description}</p>
          <a className={styles.cta} data-formation-packages-cta href={localizedPath(lang,"/packages")}>{t.cta}<PackageArrow direction="forward"/></a>
        </div>
        <div className={styles.visual} data-formation-packages-visual>
          <ul className={styles.cards}>
            {order.map(id=>{
              const group=packageGroups.find(g=>g.id===id);
              if(!group)return null;
              const count=packageOffers.filter(offer=>offer.group===id).length;
              return <li key={id} data-formation-category={id} className={id==="services"?styles.featured:styles.card}>
                <span className={styles.icon}><CategoryIcon category={id}/></span>
                <strong>{t.groups[id]}</strong>
                <span className={styles.count} data-package-count={count}>{t.count(count)}</span>
                <svg className={styles.wave} viewBox="0 0 160 60" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 18C38 5 57 45 101 30S145 9 160 12V60H0Z"/><path d="M0 37C40 47 67 12 108 18S145 38 160 22V60H0Z"/></svg>
              </li>;
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
