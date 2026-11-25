import ArrowUpRight from "@/components/ArrowUpRight";
import {localizedPath} from "@/lib/site-language";
import type {ServiceModel} from "@/lib/services/model";
export default function ServiceNextStep({lang,t,contact}:Pick<ServiceModel,"lang"|"t"|"contact">) {
  return <>
      <div className="service-next-step">
        <div>
          <span>{lang === "ar" ? "الخطوة التالية" : lang === "zh" ? "下一步" : "NEXT STEP"}</span>
          <h2>{lang === "ar" ? "حوّل الأسئلة إلى خطة واضحة." : lang === "zh" ? "将问题转化为清晰的计划。" : "Turn questions into a clear plan."}</h2>
          <p>{lang === "ar" ? "شاركنا نشاطك وجنسية المستثمر والمرحلة الحالية لتحديد نقاط التحقق قبل بدء الإجراءات." : lang === "zh" ? "提供业务活动、投资者国籍及当前阶段，明确申请前需核实的事项。" : "Share your activity, investor nationality and current stage to identify the checks needed before you proceed."}</p>
        </div>
        <a className="action-primary" href={contact.whatsapp} target="_blank" rel="noopener noreferrer">{t.contact} <ArrowUpRight /></a>
        <a className="action-text" href={localizedPath(lang, "/packages")}>{lang==="ar"?"قارن باقات التأسيس والأسعار":lang==="zh"?"比较设立套餐与费用":"Compare formation packages and fees"} <ArrowUpRight /></a>
      </div>
  </>;
}
