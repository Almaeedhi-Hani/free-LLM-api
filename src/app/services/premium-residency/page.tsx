import {pageMetadata} from "@/lib/site-seo";
import {getLocale} from "@/lib/site-language";
import {labels} from "@/lib/premium-residency-content";
import {PremiumResidencyPage} from "@/components/PremiumResidencyPage";
export const dynamic="force-dynamic";
export function generateMetadata(){
 const lang=getLocale(), base=pageMetadata("premium-residency");
 const title=labels.seoTitle[lang], description=labels.lead[lang];
 return {...base,title,description,openGraph:{...base.openGraph,title,description},twitter:{...base.twitter,title,description}};
}
export default function Page(){return <PremiumResidencyPage/>;}
