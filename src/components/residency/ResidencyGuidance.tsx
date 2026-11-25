import ArrowUpRight from "@/components/ArrowUpRight";
import type {ResidencyModel} from "@/lib/residency/model";
import {benefits,documents,steps} from "@/lib/premium-residency-content";
import styles from "../PremiumResidencyPage.module.css";

export default function ResidencyGuidance({lang,l,whatsapp}:Pick<ResidencyModel,"lang"|"l"|"whatsapp">) {
  return <>
    <div className={styles.twoColumns}>
      <section id="benefits" className={styles.section}><h2>{l.benefits[lang]}</h2><ul className={styles.list}>{benefits.map((x,i)=><li key={i}>{x[lang]}</li>)}</ul><a href="https://pr.gov.sa/benefits" target="_blank" rel="noopener noreferrer">{l.refs[lang]} <ArrowUpRight/></a></section>
      <section id="documents" className={styles.section}><h2>{l.documents[lang]}</h2><ul className={styles.list}>{documents.map((x,i)=><li key={i}>{x[lang]}</li>)}</ul><a href="https://pr.gov.sa/services-terms" target="_blank" rel="noopener noreferrer">{l.refs[lang]} <ArrowUpRight/></a></section>
    </div>
    <section id="steps" className={styles.section}><h2>{l.steps[lang]}</h2><ol className={styles.steps}>{steps.map((x,i)=><li key={i}><span aria-hidden="true">{String(i+1).padStart(2,"0")}</span><p>{x[lang]}</p></li>)}</ol></section>
    <section id="support" className={"service-next-step "+styles.support}><div><h2>{l.support[lang]}</h2><p>{l.supportBody[lang]}</p></div>{whatsapp&&<a className="action-primary" href={whatsapp} target="_blank" rel="noopener noreferrer">{l.cta[lang]} <ArrowUpRight/></a>}</section>
  </>;
}
