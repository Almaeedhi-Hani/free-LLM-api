import {localizedPath} from "@/lib/site-language";
import type {ServiceModel} from "@/lib/services/model";
export default function ServiceHeader({lang,t,s,labels}:Pick<ServiceModel,"lang"|"t"|"s"|"labels">) {
  return <>
      <a className="breadcrumb" href={localizedPath(lang) + "#services"}>
        {t.back} / {s.authority}
      </a>
      <p className="eyebrow">{s.authority} · SAUDI ARABIA</p>
      <h1>{s.title[lang]} {lang === 'ar' ? 'في السعودية' : lang === 'en' ? 'in Saudi Arabia' : '｜沙特阿拉伯'}</h1>
      <p className="detail-lead">{s.summary[lang]}</p>
      <nav className="service-quick-nav" aria-label={lang === "ar" ? "أقسام الدليل" : lang === "zh" ? "指南目录" : "Guide sections"}>
        <a href="#service-preparation">{labels.prepare}</a>
        <a href="#service-insight">{labels.insight}</a>
        <a href="#service-budget">{labels.budget}</a>
        <a href="#service-question">{labels.question}</a>
        <a href="#service-decisions">{lang === "ar" ? "أسئلة القرار" : lang === "zh" ? "决策清单" : "Decision checklist"}</a>
        <a href="#service-references">{t.sources}</a>
      </nav>
      <div className="service-context-band">
        <span>{lang === "ar" ? "قبل البدء" : lang === "zh" ? "开始之前" : "BEFORE YOU BEGIN"}</span>
        <p>{lang === "ar" ? "تختلف المتطلبات والمدة والتكلفة بحسب النشاط وصفة المستثمر والجهة المختصة. هذا الدليل يساعد على التحضير ولا يشكل موافقة مسبقة." : lang === "zh" ? "要求、时间和费用因业务活动、投资者身份及主管部门而异。本指南用于准备，不代表预先批准。" : "Requirements, timelines and costs vary by activity, investor profile and regulator. This guide helps you prepare; it is not an approval guarantee."}</p>
      </div>
  </>;
}
