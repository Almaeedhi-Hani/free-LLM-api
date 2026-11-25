import ArrowUpRight from "@/components/ArrowUpRight";
import type {ResidencyModel} from "@/lib/residency/model";
import {faqs,sources} from "@/lib/premium-residency-content";
import styles from "../PremiumResidencyPage.module.css";

export default function ResidencyReferences({lang,l}:Pick<ResidencyModel,"lang"|"l">) {
  return <>
    <section id="faq" className={styles.section}><h2>{l.faq[lang]}</h2><div className={styles.faq}>{faqs.map((f,i)=><details key={i}><summary>{f.q[lang]}</summary><p>{f.a[lang]}</p></details>)}</div></section>
    <section id="sources" className={styles.section}><h2>{l.refs[lang]}</h2><p className={styles.note}>{l.notice[lang]}</p><ul className={styles.references}>{sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title[lang]} <ArrowUpRight/></a></li>)}</ul></section>
  </>;
}
