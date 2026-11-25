import ArrowUpRight from "@/components/ArrowUpRight";
import type {ResidencyModel} from "@/lib/residency/model";
import {products} from "@/lib/premium-residency-content";
import styles from "../PremiumResidencyPage.module.css";

export default function ResidencyProducts({lang,l,copy,fee,whatsapp,routeContact}:Pick<ResidencyModel,"lang"|"l"|"copy"|"fee"|"whatsapp"|"routeContact">) {
  return <>
    <section id="products" className={styles.section}>
      <h2>{l.products[lang]}</h2>
      <p>{copy.intro}</p>
      <p className={styles.note}>{l.feeNote[lang]}</p>
      <div className={styles.products}>{products.map((p,i)=><article key={p.id} data-residency-product={p.id} className={styles.product}>
        <span className="eyebrow">{String(i+1).padStart(2,"0")}</span>
        <h3>{p.name[lang]}</h3>{p.fee!==null&&<><span className={styles.duration}>{l.fee[lang]}</span><strong className={styles.fee}>{fee(p)}</strong></>}
        <p className={styles.duration}>{p.period[lang]}</p><p>{p.eligibility[lang]}</p>
        {whatsapp&&<div className={styles.actions}><a className="action-primary" href={routeContact(p.name[lang])!} target="_blank" rel="noopener noreferrer">{copy.consult} <ArrowUpRight/></a></div>}
        <a href={p.source} target="_blank" rel="noopener noreferrer">{l.source[lang]} <ArrowUpRight/></a>
      </article>)}</div>
    </section>
  </>;
}
