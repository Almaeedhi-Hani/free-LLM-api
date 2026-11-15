import type {Metadata} from "next";
import {notFound} from "next/navigation";
import ArrowUpRight from "@/components/ArrowUpRight";
import {getLocale,localizedPath} from "@/lib/site-language";
import {getContent} from "@/lib/content-store";
import {publicGuide,approvedEditorial} from "@/lib/editorial-workflow";
import {siteUrl} from "@/lib/site-seo";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:{slug:string}}):Promise<Metadata>{
 const lang=getLocale(),content=await getContent(),page=publicGuide(content.editorialItems,lang,params.slug);
 if(!page)return {robots:{index:false,follow:false}};
 const url=siteUrl+localizedPath(lang,"/insights/"+page.slug);
 const languageAlternates=Object.fromEntries((["ar","en","zh"] as const).filter(l=>Boolean(publicGuide(content.editorialItems,l,params.slug))).map(l=>[l==="zh"?"zh-Hans":l,siteUrl+localizedPath(l,"/insights/"+page.slug)]));
 return {title:page.title+" | Saudi Investor Services",description:page.summary,alternates:{canonical:url,languages:languageAlternates},openGraph:{title:page.title,description:page.summary,url},robots:{index:true,follow:true}};
}
export default async function InsightDetail({params}:{params:{slug:string}}){
 const lang=getLocale(),content=await getContent(),page=publicGuide(content.editorialItems,lang,params.slug);
 if(!page)return notFound();
 const url=siteUrl+localizedPath(lang,"/insights/"+page.slug);
 const schema={"@context":"https://schema.org","@type":"Article",headline:page.title,description:page.summary,inLanguage:lang==="zh"?"zh-Hans":lang,url,datePublished:page.reviewedAt,citation:page.verified_sources};
 return <article className="service-detail service-editorial section-wrap">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/>
  <a className="breadcrumb" href={localizedPath(lang,"/insights")}>{lang==="ar"?"الأدلة":lang==="zh"?"指南":"Guides"} <ArrowUpRight /></a>
  <p className="eyebrow">{page.kind==="comparison"?(lang==="ar"?"مقارنة عملية":lang==="zh"?"实用对比":"PRACTICAL COMPARISON"):(lang==="ar"?"دليل المستثمر":lang==="zh"?"投资者指南":"INVESTOR GUIDE")}</p>
  <h1>{page.title}</h1><p className="detail-lead">{page.summary}</p>
  <div className="detail-columns"><section>
   {page.body.split(/\n\s*\n/).filter(Boolean).map((paragraph,i)=><p key={i}>{paragraph}</p>)}
   <p className="service-decision-disclaimer">{lang==="ar"?"هذه معلومات إرشادية. تحقّق من متطلبات الجهات الرسمية الحالية قبل اتخاذ القرار.":lang==="zh"?"仅供参考；请核对主管部门当前要求。":"Planning guidance only; verify current authority requirements before acting."}</p>
  </section><aside className="source-panel service-reference-panel">
   <h2>{lang==="ar"?"المراجع التي راجعها المحرر":lang==="zh"?"经编辑审阅的资料":"Editor-reviewed references"}</h2>
   {(page.verified_sources||[]).map((source,i)=><a key={source} href={source} target="_blank" rel="noopener noreferrer">{lang==="ar"?"المصدر":lang==="zh"?"来源":"Source"} {i+1} <ArrowUpRight /></a>)}
   <a className="action-primary" href={content.contact.whatsapp} target="_blank" rel="noopener noreferrer">{lang==="ar"?"استفسر عن خدمتك":lang==="zh"?"咨询服务":"Ask about our services"} <ArrowUpRight /></a>
  </aside></div>
  <a href={localizedPath(lang,"/packages")}>{lang==="ar"?"قارن الباقات والأتعاب":lang==="zh"?"比较套餐费用":"Compare service packages"} <ArrowUpRight /></a>
 </article>;
}
