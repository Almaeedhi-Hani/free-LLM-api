import type { Metadata } from "next";
import {notFound} from "next/navigation";
import ArrowUpRight from "@/components/ArrowUpRight";
import {getContent} from "@/lib/content-store";
import {getLocale,localizedPath} from "@/lib/site-language";
import {siteUrl} from "@/lib/site-seo";
import {approvedEditorial} from "@/lib/editorial-workflow";
export const dynamic="force-dynamic";
const labels={ar:{title:"مركز المعرفة للمستثمرين",desc:"أدلة عملية ومقارنات تتعلق بتأسيس الشركات وخدمات المستثمرين في السعودية.",action:"اقرأ الدليل"},en:{title:"Investor knowledge hub",desc:"Practical guides and comparisons for investors planning Saudi business activities.",action:"Read guide"},zh:{title:"投资者知识中心",desc:"关于沙特企业设立和投资者服务的实用指南与比较。",action:"阅读指南"}};
export async function generateMetadata():Promise<Metadata>{
 const lang=getLocale();const l=labels[lang];const url=siteUrl+localizedPath(lang,"/insights");
 return {title:l.title+" | Saudi Investor Services",description:l.desc,alternates:{canonical:url},robots:{index:true,follow:true}};
}
export default async function InsightsHub(){
 const lang=getLocale(),content=await getContent(),texts=labels[lang];
 const items=approvedEditorial(content.editorialItems,lang).filter(e=>e.kind==="guide"||e.kind==="comparison");
 if(items.length===0)notFound();
 return <section className="section-wrap service-related">
  <p className="eyebrow">{lang==="ar"?"مصادر المستثمر":lang==="zh"?"知识资源":"INVESTOR RESOURCES"}</p>
  <h1>{texts.title}</h1><p>{texts.desc}</p>
  <div className="service-related-grid">{items.map(e=><a key={e.id} href={localizedPath(lang,"/insights/"+e.slug)}>
    <span>{e.kind==="comparison"?(lang==="ar"?"مقارنة":lang==="zh"?"对比":"Comparison"):(lang==="ar"?"دليل":lang==="zh"?"指南":"Guide")}</span>
    <strong>{e.title}</strong><p>{e.summary}</p><small>{texts.action} <ArrowUpRight /></small>
  </a>)}</div>
 </section>;
}
