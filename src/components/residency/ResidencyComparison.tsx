import ArrowUpRight from "@/components/ArrowUpRight";
import type {ResidencyModel} from "@/lib/residency/model";
import {products} from "@/lib/premium-residency-content";
import styles from "../PremiumResidencyPage.module.css";

export default function ResidencyComparison({lang,l,fee}:Pick<ResidencyModel,"lang"|"l"|"fee">) {
  return <>
    <section id="comparison" className={styles.section}>
      <h2>{l.comparison[lang]}</h2>
      <div className={styles.tableWrap}><table className={styles.table}><caption className={styles.srOnly}>{l.comparison[lang]}</caption><thead><tr><th scope="col">{l.products[lang]}</th><th scope="col">{l.fee[lang]}</th><th scope="col">{l.duration[lang]}</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><th scope="row">{p.name[lang]}</th><td>{fee(p)}</td><td>{p.period[lang]}</td></tr>)}</tbody></table></div>
      <p className={styles.note}>{l.feeNote[lang]}</p>
    </section>
  </>;
}
