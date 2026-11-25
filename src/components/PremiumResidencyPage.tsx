import ArrowUpRight from "@/components/ArrowUpRight";
import {getLocale,localizedPath} from "@/lib/site-language";
import {getContent} from "@/lib/content-store";
import {whatsAppUrlForLanguage} from "@/lib/whatsapp-contacts";
import {siteUrl} from "@/lib/site-seo";
import {products,benefits,documents,steps,faqs,labels,sources} from "@/lib/premium-residency-content";
import styles from "./PremiumResidencyPage.module.css";

export async function PremiumResidencyPage(){
  const lang=getLocale();
  const {contact}=await getContent();
  const whatsapp=whatsAppUrlForLanguage(contact,lang);
  const url=siteUrl+localizedPath(lang,"/services/premium-residency");
  const l=labels;
  const sections=[["products",l.products],["comparison",l.comparison],["benefits",l.benefits],["documents",l.documents],["steps",l.steps],["support",l.support],["faq",l.faq],["sources",l.refs]] as const;
  const fee=(p:typeof products[number])=>p.fee===null?l.feeNotDisplayed[lang]:p.fee.toLocaleString("en-US")+" "+l.sar[lang]+(p.annual?" / "+l.annual[lang]:"");
  const refs=Array.from(new Set([...sources.map(s=>s.url),...products.map(p=>p.source)]));
  const schema={"@context":"https://schema.org","@graph":[
    {"@type":"WebPage","@id":url,name:l.title[lang],description:l.lead[lang],inLanguage:lang==="zh"?"zh-Hans":lang,citation:refs},
    {"@type":"Service","@id":url+"#service",name:l.title[lang],description:l.supportBody[lang],serviceType:l.title[lang],url,areaServed:{"@type":"Country",name:"Saudi Arabia"}},
    {"@type":"FAQPage","@id":url+"#faq",mainEntity:faqs.map(f=>({"@type":"Question",name:f.q[lang],acceptedAnswer:{"@type":"Answer",text:f.a[lang]}}))},
    {"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:lang==="ar"?"الرئيسية":lang==="zh"?"首页":"Home",item:siteUrl+localizedPath(lang)},{"@type":"ListItem",position:2,name:l.title[lang],item:url}]}
  ]};
  return <article className={"service-detail service-editorial section-wrap "+styles.page}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/>
    <a className="breadcrumb" href={localizedPath(lang)+"#services"}>{lang==="ar"?"خدمات المستثمرين":lang==="zh"?"投资者服务":"Investor services"} / {l.title[lang]}</a>
    <p className="eyebrow">SAUDI ARABIA · {lang==="ar"?"الإقامة المميزة":lang==="zh"?"高级居留":"PREMIUM RESIDENCY"}</p>
    <h1>{l.title[lang]}</h1>
    <p className="detail-lead">{l.lead[lang]}</p>
    <div className={styles.actions}>
      {whatsapp&&<a className="action-primary" href={whatsapp} target="_blank" rel="noopener noreferrer">{l.cta[lang]} <ArrowUpRight/></a>}
    </div>
    <nav className="service-quick-nav" aria-label={lang==="ar"?"أقسام الصفحة":lang==="zh"?"页面目录":"Page sections"}>{sections.map(([id,label])=><a key={id} href={"#"+id}>{label[lang]}</a>)}</nav>
    <section id="products" className={styles.section}>
      <h2>{l.products[lang]}</h2>
      <p className={styles.note}>{l.feeNote[lang]}</p>
      <div className={styles.products}>{products.map((p,i)=><article key={p.id} data-residency-product={p.id} className={styles.product}>
        <span className="eyebrow">{String(i+1).padStart(2,"0")}</span>
        <h3>{p.name[lang]}</h3>{p.fee!==null&&<><span className={styles.duration}>{l.fee[lang]}</span><strong className={styles.fee}>{fee(p)}</strong></>}
        <p className={styles.duration}>{p.period[lang]}</p><p>{p.eligibility[lang]}</p>
        <a href={p.source} target="_blank" rel="noopener noreferrer">{l.source[lang]} <ArrowUpRight/></a>
      </article>)}</div>
    </section>
    <section id="comparison" className={styles.section}>
      <h2>{l.comparison[lang]}</h2>
      <div className={styles.tableWrap}><table className={styles.table}><caption className={styles.srOnly}>{l.comparison[lang]}</caption><thead><tr><th scope="col">{l.products[lang]}</th><th scope="col">{l.fee[lang]}</th><th scope="col">{l.duration[lang]}</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><th scope="row">{p.name[lang]}</th><td>{fee(p)}</td><td>{p.period[lang]}</td></tr>)}</tbody></table></div>
      <p className={styles.note}>{l.feeNote[lang]}</p>
    </section>
    <div className={styles.twoColumns}>
      <section id="benefits" className={styles.section}><h2>{l.benefits[lang]}</h2><ul className={styles.list}>{benefits.map((x,i)=><li key={i}>{x[lang]}</li>)}</ul><a href="https://pr.gov.sa/benefits" target="_blank" rel="noopener noreferrer">{l.refs[lang]} <ArrowUpRight/></a></section>
      <section id="documents" className={styles.section}><h2>{l.documents[lang]}</h2><ul className={styles.list}>{documents.map((x,i)=><li key={i}>{x[lang]}</li>)}</ul><a href="https://pr.gov.sa/services-terms" target="_blank" rel="noopener noreferrer">{l.refs[lang]} <ArrowUpRight/></a></section>
    </div>
    <section id="steps" className={styles.section}><h2>{l.steps[lang]}</h2><ol className={styles.steps}>{steps.map((x,i)=><li key={i}><span aria-hidden="true">{String(i+1).padStart(2,"0")}</span><p>{x[lang]}</p></li>)}</ol></section>
    <section id="support" className={"service-next-step "+styles.support}><div><h2>{l.support[lang]}</h2><p>{l.supportBody[lang]}</p></div>{whatsapp&&<a className="action-primary" href={whatsapp} target="_blank" rel="noopener noreferrer">{l.cta[lang]} <ArrowUpRight/></a>}</section>
    <section id="faq" className={styles.section}><h2>{l.faq[lang]}</h2><div className={styles.faq}>{faqs.map((f,i)=><details key={i}><summary>{f.q[lang]}</summary><p>{f.a[lang]}</p></details>)}</div></section>
    <section id="sources" className={styles.section}><h2>{l.refs[lang]}</h2><p className={styles.note}>{l.notice[lang]}</p><ul className={styles.references}>{sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title[lang]} <ArrowUpRight/></a></li>)}</ul></section>
  </article>;
}
