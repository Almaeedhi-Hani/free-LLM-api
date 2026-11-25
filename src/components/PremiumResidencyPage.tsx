import ResidencyAssessment from "./ResidencyAssessment";
import {localizedPath} from "@/lib/site-language";
import {loadResidencyModel} from "@/lib/residency/model";
import styles from "./PremiumResidencyPage.module.css";
import ResidencyHero from "./residency/ResidencyHero";
import ResidencyProducts from "./residency/ResidencyProducts";
import ResidencyComparison from "./residency/ResidencyComparison";
import ResidencyGuidance from "./residency/ResidencyGuidance";
import ResidencyReferences from "./residency/ResidencyReferences";

export async function PremiumResidencyPage(){
  const {lang,whatsapp,l,copy,routeContact,sections,fee,schema}=await loadResidencyModel();
  return <article className={"service-detail service-editorial section-wrap "+styles.page}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/>
    <a className="breadcrumb" href={localizedPath(lang)+"#services"}>{lang==="ar"?"خدمات المستثمرين":lang==="zh"?"投资者服务":"Investor services"} / {l.title[lang]}</a>
    <ResidencyHero lang={lang} l={l} whatsapp={whatsapp}/>
    <ResidencyAssessment lang={lang} whatsapp={whatsapp}/>
    <nav className="service-quick-nav" aria-label={lang==="ar"?"أقسام الصفحة":lang==="zh"?"页面目录":"Page sections"}>{sections.map(([id,label])=><a key={id} href={"#"+id}>{label[lang]}</a>)}</nav>
    <ResidencyProducts lang={lang} l={l} copy={copy} fee={fee} whatsapp={whatsapp} routeContact={routeContact}/>
    <ResidencyComparison lang={lang} l={l} fee={fee}/>
    <ResidencyGuidance lang={lang} l={l} whatsapp={whatsapp}/>
    <ResidencyReferences lang={lang} l={l}/>
  </article>;
}
