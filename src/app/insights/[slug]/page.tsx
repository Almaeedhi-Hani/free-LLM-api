import type {Metadata} from "next";
import {notFound} from "next/navigation";
import ArrowUpRight from "@/components/ArrowUpRight";
import {DiscoveryLink} from "@/components/discovery/DiscoveryCard";
import {getLocale,localizedPath} from "@/lib/site-language";
import {getPublicContent as getContent} from "@/lib/public-content";
import {publicGuide,approvedEditorial} from "@/lib/editorial-workflow";
import {siteUrl} from "@/lib/site-seo";
import {getCompetitorDomains} from "@/lib/source-policy-store";
import {isDisplayable,isWhitelistedOfficial} from "@/lib/source-policy";
import {topicRelatedLiveNodes,siteTopicPath} from "@/lib/content-tree";
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
 // Fail closed: if live competitor data is unavailable, no external references render.
 const loadedDomains=await getCompetitorDomains().catch(()=>null);
 const competitorDomains=loadedDomains||[];
 const referenceCandidates=page.approval_method==='automated'?(page.cited_sources||[]):(page.verified_sources||[]);
 const visibleReferences=loadedDomains===null?[]:referenceCandidates.filter(source=>isDisplayable(source,competitorDomains));
 const visibleVerified=loadedDomains===null?[]:(page.verified_sources||[]).filter(source=>isDisplayable(source,competitorDomains));
 const hasLiveHub=approvedEditorial(content.editorialItems,lang).some(e=>e.kind==="guide"||e.kind==="comparison");
 const safeLiveTopicRoute=(route:string|null)=>Boolean(route&&(route!=="/insights"||hasLiveHub));
 const article={"@type":"Article",headline:page.title,description:page.summary,inLanguage:lang==="zh"?"zh-Hans":lang,url,datePublished:page.reviewedAt,...(visibleVerified.length?{citation:visibleVerified}:{})};
 const breadcrumbs={"@type":"BreadcrumbList",itemListElement:[
  {"@type":"ListItem",position:1,name:lang==="ar"?"الرئيسية":lang==="zh"?"首页":"Home",item:siteUrl+localizedPath(lang)},
  {"@type":"ListItem",position:2,name:lang==="ar"?"الأدلة":lang==="zh"?"指南":"Guides",item:siteUrl+localizedPath(lang,"/insights")},
  {"@type":"ListItem",position:3,name:page.title,item:url},
 ]};
 const schema={"@context":"https://schema.org","@graph":[article,breadcrumbs]};
 return <article className="service-detail service-editorial section-wrap investor-article">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/>
  <a className="breadcrumb" href={localizedPath(lang,"/insights")}>{lang==="ar"?"الأدلة":lang==="zh"?"指南":"Guides"} <ArrowUpRight /></a>
  <p className="eyebrow">{page.kind==="comparison"?(lang==="ar"?"مقارنة عملية":lang==="zh"?"实用对比":"PRACTICAL COMPARISON"):(lang==="ar"?"دليل المستثمر":lang==="zh"?"投资者指南":"INVESTOR GUIDE")}</p>
  <h1>{page.title}</h1><p className="detail-lead">{page.summary}</p>
  <div className="detail-columns"><section className="investor-guide-body">
   {page.body.split(/\n\s*\n/).filter(Boolean).map((paragraph,i)=><p key={i}>{paragraph}</p>)}
   {(page.sections||[]).map((section,i)=><section key={i}><h2>{section.h2}</h2><p>{section.body}</p>{(section.subsections||[]).map((sub,j)=><div key={j}><h3>{sub.h3}</h3><p>{sub.body}</p></div>)}</section>)}
   {(page.internal_links?.length||page.topic_node_id)&&<nav aria-label={lang==="ar"?"مواضيع مرتبطة":lang==="zh"?"相关主题":"Related investor topics"}>
    <h2>{lang==="ar"?"مسارات مرتبطة":lang==="zh"?"相关服务":"Related investor services"}</h2>
    {(page.internal_links?.length
      ?page.internal_links.slice(0,5).filter(link=>safeLiveTopicRoute(siteTopicPath(link.node_id))).map(link=>({id:link.node_id,href:siteTopicPath(link.node_id)!,anchor:link.anchor}))
      :topicRelatedLiveNodes(page.topic_node_id||"").filter(node=>safeLiveTopicRoute(node.route)).slice(0,4).map(node=>({id:node.id,href:node.route!,anchor:node.primary_keyword[lang]}))
    ).map(link=><DiscoveryLink key={link.id} href={localizedPath(lang,link.href)} title={link.anchor}/>)}
   </nav>}
   <p className="service-decision-disclaimer">{lang==="ar"?"هذه معلومات إرشادية. تحقّق من متطلبات الجهات الرسمية الحالية قبل اتخاذ القرار.":lang==="zh"?"仅供参考；请核对主管部门当前要求。":"Planning guidance only; verify current authority requirements before acting."}</p>
  </section><aside className="source-panel service-reference-panel">
   <h2>{page.approval_method==="automated"?(lang==="ar"?"المراجع":lang==="zh"?"参考资料":"References"):(lang==="ar"?"المراجع التي راجعها المحرر":lang==="zh"?"经编辑审阅的资料":"Editor-reviewed references")}</h2>
   {visibleReferences.map((source,i)=><a key={source} href={source} target="_blank" rel={isWhitelistedOfficial(source,competitorDomains)?"noopener noreferrer":"nofollow noopener noreferrer"}>{lang==="ar"?"المصدر":lang==="zh"?"来源":"Source"} {i+1} <ArrowUpRight /></a>)}
   <a className="action-primary" href={content.contact.whatsapp} target="_blank" rel="noopener noreferrer">{lang==="ar"?"استفسر عن خدمتك":lang==="zh"?"咨询服务":"Ask about our services"} <ArrowUpRight /></a>
  </aside></div>
  <DiscoveryLink icon="comparison" href={localizedPath(lang,"/packages")+"?from="+encodeURIComponent(localizedPath(lang,"/insights/"+page.slug))} title={lang==="ar"?"قارن الباقات والأتعاب":lang==="zh"?"比较套餐费用":"Compare service packages"}/>
 </article>;
}
