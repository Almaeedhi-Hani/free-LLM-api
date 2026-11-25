import {decisionPrompts} from "@/lib/service-guides";
import type {ServiceModel} from "@/lib/services/model";
export default function ServicePreparation({lang,labels,guide,slug}:Pick<ServiceModel,"lang"|"labels"|"guide"|"slug">) {
  return <>
        <section>
          <h2 id="service-preparation">{labels.prepare}</h2>
          <p>{labels.checklist}</p>
          {guide.prepare.map((step, i) => (
            <div className="detail-step" key={i}>
              <span>0{i + 1}</span>
              <div>
                <p>{step[lang]}</p>
              </div>
            </div>
          ))}
          <h2 id="service-insight">{labels.insight}</h2>
          <p>{guide.insight[lang]}</p>
          <div className="guide-budget">
            <h2 id="service-budget">{labels.budget}</h2>
            <p>{guide.budget[lang]}</p>
          </div>
          <section id="service-decisions" className="service-decision-checklist">
            <p className="eyebrow">{lang === "ar" ? "راجع قبل التقديم" : lang === "zh" ? "申请前核对" : "CHECK BEFORE APPLYING"}</p>
            <h2>{lang === "ar" ? "ثلاثة أسئلة تستحق الإجابة" : lang === "zh" ? "三个值得回答的问题" : "Three questions worth answering"}</h2>
            <ol>{decisionPrompts[slug].map((prompt, i) => <li key={i}><span>{String(i + 1).padStart(2, "0")}</span><p>{prompt[lang]}</p></li>)}</ol>
            <p className="service-decision-disclaimer">{lang === "ar" ? "قائمة إرشادية للتحضير وليست قائمة متطلبات رسمية أو استشارة قانونية." : lang === "zh" ? "本清单仅供准备参考，不属于官方要求或法律意见。" : "Planning prompts only; not an official requirements list or legal advice."}</p>
          </section>
          <h2 id="service-question">{labels.question}</h2>
          <h3>{guide.q[lang]}</h3>
          <p>{guide.a[lang]}</p>
        </section>
  </>;
}
