import ArrowUpRight from "@/components/ArrowUpRight";
import type {ResidencyModel} from "@/lib/residency/model";
import styles from "../PremiumResidencyPage.module.css";

export default function ResidencyHero({lang,l,whatsapp}:Pick<ResidencyModel,"lang"|"l"|"whatsapp">) {
  return <>
    <header className={styles.hero}>
    <p className="eyebrow">SAUDI ARABIA · {lang==="ar"?"الإقامة المميزة":lang==="zh"?"高级居留":"PREMIUM RESIDENCY"}</p>
    <h1>{l.title[lang]}</h1>
    <p className="detail-lead">{l.lead[lang]}</p>
    <div className={styles.actions}>
      <a className="action-primary" href="#assessment">{lang==="ar"?"ابدأ تقييم مسارك":lang==="zh"?"开始路径评估":"Start your assessment"} <ArrowUpRight/></a>
      {whatsapp&&<a className={styles.secondary} href={whatsapp} target="_blank" rel="noopener noreferrer">{lang==="ar"?"تواصل مع مستشار متخصص":lang==="zh"?"联系专业顾问":"Contact a specialist"}</a>}
    </div>
    </header>
  </>;
}
