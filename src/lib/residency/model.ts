import {getLocale,localizedPath} from "@/lib/site-language";
import {getContent} from "@/lib/content-store";
import {whatsAppUrlForLanguage} from "@/lib/whatsapp-contacts";
import {siteUrl} from "@/lib/site-seo";
import {products,benefits,documents,steps,faqs,labels,sources} from "@/lib/premium-residency-content";

/** Existing server-side data, localized copy, contact links, prices and schema. */
export async function loadResidencyModel(){
  const lang=getLocale();
  const {contact}=await getContent();
  const whatsapp=whatsAppUrlForLanguage(contact,lang);
  const url=siteUrl+localizedPath(lang,"/services/premium-residency");
  const l=labels;
  const copy={
    ar:{explore:"اختر مسار الإقامة المناسب لك",consult:"اطلب استشارة حول هذا المسار",intro:"اختر أحد المسارات السبعة لمناقشة شروطه وجاهزية مستنداتك مع فريقنا. الاختيار ليس تأكيدًا للأهلية.",message:"مرحبًا، أود الاستفسار عن خدمات الإقامة المميزة، مسار: "},
    en:{explore:"Find your Premium Residency route",consult:"Request advice on this route",intro:"Choose one of seven routes to discuss requirements and document readiness with our team. Selection does not confirm eligibility.",message:"Hello, I would like advice on Saudi Premium Residency, route: "},
    zh:{explore:"选择适合您的高级居留路径",consult:"咨询此居留路径",intro:"选择七种路径之一，与我们的团队讨论条件及材料准备。选择路径并不代表符合申请资格。",message:"您好，我想咨询沙特高级居留服务，申请路径："}
  }[lang];
  const routeContact=(name:string)=>{
    if(!whatsapp)return null;
    const link=new URL(whatsapp);
    link.searchParams.set("text",copy.message+name);
    return link.toString();
  };
  const sections=[["products",l.products],["comparison",l.comparison],["benefits",l.benefits],["documents",l.documents],["steps",l.steps],["support",l.support],["faq",l.faq],["sources",l.refs]] as const;
  const fee=(p:typeof products[number])=>p.fee===null?l.feeNotDisplayed[lang]:p.fee.toLocaleString("en-US")+" "+l.sar[lang]+(p.annual?" / "+l.annual[lang]:"");
  const refs=Array.from(new Set([...sources.map(s=>s.url),...products.map(p=>p.source)]));
  const schema={"@context":"https://schema.org","@graph":[
    {"@type":"WebPage","@id":url,name:l.title[lang],description:l.lead[lang],inLanguage:lang==="zh"?"zh-Hans":lang,citation:refs},
    {"@type":"Service","@id":url+"#service",name:l.title[lang],description:l.supportBody[lang],serviceType:l.title[lang],url,areaServed:{"@type":"Country",name:"Saudi Arabia"}},
    {"@type":"FAQPage","@id":url+"#faq",mainEntity:faqs.map(f=>({"@type":"Question",name:f.q[lang],acceptedAnswer:{"@type":"Answer",text:f.a[lang]}}))},
    {"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:lang==="ar"?"الرئيسية":lang==="zh"?"首页":"Home",item:siteUrl+localizedPath(lang)},{"@type":"ListItem",position:2,name:l.title[lang],item:url}]}
  ]};
  return {lang,whatsapp,l,copy,routeContact,sections,fee,schema};
}
export type ResidencyModel=Awaited<ReturnType<typeof loadResidencyModel>>;
