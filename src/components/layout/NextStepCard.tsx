import ArrowUpRight from "@/components/ArrowUpRight";
import type {Locale} from "@/lib/site-language";

export default function NextStepCard({lang,label,whatsappHref}:{lang:Locale;label:string;whatsappHref:string|null}) {
  return (
<div className="investor-footer-intro"><div><p className="eyebrow">{lang==="ar"?"خطوتك التالية":lang==="zh"?"下一步":"YOUR NEXT STEP"}</p><h2>{lang==="ar"?"ابدأ بخطة واضحة لاستثمارك.":lang==="zh"?"为您的投资制定清晰计划。":"Start with a clear investment plan."}</h2></div>{whatsappHref&&<a className="investor-footer-cta" href={whatsappHref} target="_blank" rel="noopener noreferrer">{label} <ArrowUpRight/></a>}</div>
  );
}
