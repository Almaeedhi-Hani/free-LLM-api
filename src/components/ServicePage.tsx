import { getLocale, localizedPath } from "@/lib/site-language";
import { copy, services } from "@/lib/service-catalog";
import { getContent } from "@/lib/content-store";
import { guides, guideLabels } from "@/lib/service-guides";
import { siteUrl } from "@/lib/site-seo";
export async function ServicePage({ slug }: { slug: string }) {
  const lang = getLocale();
  const content = await getContent();
  const t = copy[lang];
  const serviceList = services;
  const s = serviceList.find((x) => x.slug === slug)!;
  const { contact } = content;
  const guide = guides[slug];
  const labels = guideLabels[lang];
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": siteUrl + localizedPath(lang, `/services/${slug}`),
        name: s.title[lang],
        description: s.summary[lang],
        inLanguage: lang,
        citation: [s.source, ...guide.references.map((r) => r.url)],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: guide.q[lang],
            acceptedAnswer: { "@type": "Answer", text: guide.a[lang] },
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: t.brand,
            item: siteUrl + localizedPath(lang),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: s.title[lang],
            item: siteUrl + localizedPath(lang, `/services/${slug}`),
          },
        ],
      },
    ],
  };
  return (
    <article className="service-detail service-editorial section-wrap">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
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
        <a href="#service-references">{t.sources}</a>
      </nav>
      <div className="service-context-band">
        <span>{lang === "ar" ? "قبل البدء" : lang === "zh" ? "开始之前" : "BEFORE YOU BEGIN"}</span>
        <p>{lang === "ar" ? "تختلف المتطلبات والمدة والتكلفة بحسب النشاط وصفة المستثمر والجهة المختصة. هذا الدليل يساعد على التحضير ولا يشكل موافقة مسبقة." : lang === "zh" ? "要求、时间和费用因业务活动、投资者身份及主管部门而异。本指南用于准备，不代表预先批准。" : "Requirements, timelines and costs vary by activity, investor profile and regulator. This guide helps you prepare; it is not an approval guarantee."}</p>
      </div>
      <div className="detail-columns">
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
          <h2 id="service-question">{labels.question}</h2>
          <h3>{guide.q[lang]}</h3>
          <p>{guide.a[lang]}</p>
        </section>
        <aside id="service-references" className="source-panel service-reference-panel">
          <h2>{t.sources}</h2>
          <p>{t.sourceNote}</p>
          <a href={s.source} target="_blank" rel="noopener noreferrer">
            {s.authority} ↗
          </a>
          {guide.references.map((ref) => (
            <a
              key={ref.url}
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {ref.label} ↗
            </a>
          ))}
          <small>{t.verified}</small>
          <a
            className="action-primary"
            href={contact.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.contact} ↗
          </a>
        </aside>
      </div>
      <div className="service-next-step">
        <div>
          <span>{lang === "ar" ? "الخطوة التالية" : lang === "zh" ? "下一步" : "NEXT STEP"}</span>
          <h2>{lang === "ar" ? "حوّل الأسئلة إلى خطة واضحة." : lang === "zh" ? "将问题转化为清晰的计划。" : "Turn questions into a clear plan."}</h2>
          <p>{lang === "ar" ? "شاركنا نشاطك وجنسية المستثمر والمرحلة الحالية لتحديد نقاط التحقق قبل بدء الإجراءات." : lang === "zh" ? "提供业务活动、投资者国籍及当前阶段，明确申请前需核实的事项。" : "Share your activity, investor nationality and current stage to identify the checks needed before you proceed."}</p>
        </div>
        <a className="action-primary" href={contact.whatsapp} target="_blank" rel="noopener noreferrer">{t.contact} ↗</a>
      </div>
    </article>
  );
}
