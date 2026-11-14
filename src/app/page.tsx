import { pageMetadata, siteUrl } from "@/lib/site-seo";
import { getLocale, localizedPath } from "@/lib/site-language";
import { copy, services } from "@/lib/service-catalog";
import { getContent } from "@/lib/content-store";
export const generateMetadata = () => pageMetadata();
export default async function HomePage() {
  const lang = getLocale();
  const content = await getContent();
  const t = copy[lang];
  const serviceList = services;
  const faqItems = [
    { q: t.q, a: t.a },
    ...(lang === "ar"
      ? content.faqs.filter((f) => !/^STORAGE_TEST_/i.test(f.q))
      : []),
  ];
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": siteUrl + "/#website",
        name: t.brand,
        url: siteUrl,
        inLanguage: ["ar", "en", "zh-Hans"],
      },
      {
        "@type": "CollectionPage",
        url: siteUrl + localizedPath(lang),
        name: t.brand,
        description: t.intro,
        inLanguage: lang,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: serviceList.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: s.title[lang],
            url: siteUrl + localizedPath(lang, `/services/${s.slug}`),
          })),
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span />
            {t.eyebrow}
          </p>
          <h1>
            <small className="hero-topic">
              {lang === "ar"
                ? "تأسيس الشركات وخدمات المستثمرين في السعودية"
                : lang === "zh"
                  ? "沙特公司设立与投资者服务"
                  : "Company formation & investor services in Saudi Arabia"}
            </small>
            {t.hero.split("\n").map((line, i) => (
              <span key={line} className={i ? "hero-accent" : ""}>
                {line}
              </span>
            ))}
          </h1>
          <p className="hero-intro">{t.intro}</p>
          <div className="hero-actions">
            <a className="action-primary" href="#services">
              {t.explore}
              <span>↗</span>
            </a>
            <a className="action-text" href="#contact">
              {t.contact} <span>←</span>
            </a>
          </div>
          <div className="hero-bottom">
            <span>01 — 06</span>
            <span>{t.tagline}</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit" />
          <div className="art-sun" />
          <div className="tower tower-one" />
          <div className="tower tower-two" />
          <div className="tower tower-three" />
          <div className="tower tower-four" />
          <div className="art-ground" />
          <div className="art-caption">
            <span>SAUDI ARABIA</span>
            <strong>A NEW PERSPECTIVE.</strong>
          </div>
          <div className="art-coordinate">24.7136° N · 46.6753° E</div>
        </div>
      </section>
      <div className="authority-strip">
        <span>{t.sources}</span>
        {["MISA", "Saudi Business Center", "SAMA", "CMA"].map((x) => (
          <span key={x}>{x}</span>
        ))}
      </div>
      <section className="entry-intro section-wrap" aria-labelledby="entry-title">
        <div className="entry-intro-lead">
          <p className="eyebrow">{lang === "ar" ? "دخول السوق السعودي" : lang === "zh" ? "进入沙特市场" : "ENTERING THE SAUDI MARKET"}</p>
          <h2 id="entry-title">{lang === "ar" ? "لكل مستثمر نقطة بداية مختلفة.\nنساعدك على فهم الطريق المناسب." : lang === "zh" ? "每位投资者的起点不同。\n找到适合您的路径。" : "Every investor starts somewhere different.\nFind a path that fits."}</h2>
        </div>
        <div className="entry-intro-side">
          <span className="entry-index">01 / MARKET ENTRY</span>
          <p>{lang === "ar" ? "تأسيس شركة جديدة، التوسع من الخارج، أو ترتيب المتطلبات التشغيلية: القرار الصحيح يبدأ بتحديد النشاط، صفة المستثمر، والجهات المختصة — قبل الالتزام بأي عرض أو جدول زمني." : lang === "zh" ? "无论是新设公司、跨境扩张还是运营准备，都应先明确业务活动、投资者身份及主管机构，再决定预算和时间安排。" : "Whether you are forming a new company, expanding from abroad or preparing to operate, first establish your activity, investor profile and regulatory route — before committing to a quote or timeline."}</p>
        </div>
      </section>
      <section className="entry-routes section-wrap" aria-labelledby="routes-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{lang === "ar" ? "اختر نقطة البداية" : lang === "zh" ? "选择起点" : "CHOOSE YOUR STARTING POINT"}</p>
            <h2 id="routes-title">{lang === "ar" ? "ثلاث حالات. قرارات مختلفة." : lang === "zh" ? "三种情况，不同路径。" : "Three situations. Different decisions."}</h2>
          </div>
          <p>{lang === "ar" ? "هذه مسارات إرشادية وليست باقات ثابتة؛ تختلف الأهلية والإجراءات حسب النشاط والجهة المختصة." : lang === "zh" ? "以下为指导性路径，并非固定套餐。要求因业务及主管部门而异。" : "These are guidance routes, not fixed-price packages. Eligibility and steps vary by activity and regulator."}</p>
        </div>
        <div className="entry-route-grid">
          {[
            {
              num:"01", tag:{ar:"لديك شركة خارج السعودية",en:"EXISTING FOREIGN BUSINESS",zh:"已有境外企业"},
              title:{ar:"توسّع إلى المملكة",en:"Expand into Saudi Arabia",zh:"拓展沙特业务"},
              desc:{ar:"افهم خيارات وجود الشركة الأجنبية، ومتطلبات التسجيل الاستثماري، والشكل القانوني المناسب لنشاطك.",en:"Understand foreign-company entry options, investment registration and the legal structure that fits your activity.",zh:"了解外国企业进入市场的方式、投资登记及适合业务的法律形式。"},
              slug:"misa-license"
            },
            {
              num:"02", tag:{ar:"تبدأ مشروعًا جديدًا",en:"NEW BUSINESS VENTURE",zh:"创办新企业"},
              title:{ar:"أسّس على أساس واضح",en:"Build the right foundation",zh:"建立合适的基础"},
              desc:{ar:"حدّد النشاط والشركاء والكيان النظامي، ثم راجع المستندات والموافقات اللازمة قبل التقديم.",en:"Define the activity, partners and entity type, then review documents and approvals before applying.",zh:"明确业务、股东及实体类型，在申请前核实材料与许可。"},
              slug:"company-formation"
            },
            {
              num:"03", tag:{ar:"تستعد لبدء التشغيل",en:"READY TO OPERATE",zh:"准备开始运营"},
              title:{ar:"انتقل من التأسيس إلى التشغيل",en:"Move from setup to operation",zh:"从设立走向运营"},
              desc:{ar:"رتّب متطلبات الحساب البنكي والمفوّضين والامتثال، مع مراعاة إجراءات كل بنك وجهة.",en:"Plan banking, authorised signatories and compliance, subject to each bank and regulator's requirements.",zh:"规划银行账户、授权签字人及合规事项，遵循银行与监管要求。"},
              slug:"corporate-banking"
            }
          ].map((route) => (
            <a className="entry-route-card" key={route.num} href={localizedPath(lang, `/services/${route.slug}`)}>
              <div className="entry-route-meta"><span>{route.num}</span><span>{route.tag[lang]}</span></div>
              <div className="entry-route-content"><h3>{route.title[lang]}</h3><p>{route.desc[lang]}</p></div>
              <span className="entry-route-link">{t.detail} <span aria-hidden="true">↗</span></span>
            </a>
          ))}
        </div>
      </section>
      <section className="editorial-promise" aria-labelledby="promise-title">
        <div className="section-wrap editorial-promise-inner">
          <div>
            <p className="eyebrow">{lang === "ar" ? "قبل اتخاذ القرار" : lang === "zh" ? "决策之前" : "BEFORE YOU DECIDE"}</p>
            <h2 id="promise-title">{lang === "ar" ? "المعلومة الجيدة لا تبيعك وعدًا.\nبل تمنحك وضوحًا." : lang === "zh" ? "可靠的信息不承诺结果。\n它带来清晰判断。" : "Good guidance makes no promises.\nIt gives you clarity."}</h2>
          </div>
          <div className="editorial-promise-copy">
            <p>{lang === "ar" ? "لا نفترض أن كل نشاط متاح للتملك الكامل، أو أن جميع الطلبات تتبع المدة نفسها. نوضح ما يمكن التحقق منه، وما يحتاج مراجعة لدى الجهة المختصة، وما يعتمد على ظروف ملفك." : lang === "zh" ? "我们不会假设所有行业都允许外资全资持有，也不会承诺统一审批时限。我们区分可核实的信息、主管部门的要求和个案情况。" : "We do not assume every sector allows full foreign ownership or that every application follows the same timeline. We distinguish verifiable guidance from regulator-specific and case-specific decisions."}</p>
            <a href="#sources">{t.sources} <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </section>
      <section id="services" className="section-wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t.label}</p>
            <h2>{t.heading}</h2>
          </div>
          <p>{t.description}</p>
        </div>
        <div className="service-grid">
          {serviceList.map((s, i) => (
            <a
              className="service-card"
              key={s.slug}
              href={localizedPath(lang, `/services/${s.slug}`)}
            >
              <div className="card-top">
                <span>0{i + 1}</span>
                <span className="card-arrow">↗</span>
              </div>
              <div className="service-icon" aria-hidden="true">
                {["◈", "▤", "▥", "⌘", "◇", "◉"][i]}
              </div>
              <h3>{s.title[lang]}</h3>
              <p>{s.summary[lang]}</p>
              <span className="card-link">
                {t.detail} <span>←</span>
              </span>
            </a>
          ))}
        </div>
      </section>
      <section id="journey" className="journey-section">
        <div className="section-wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t.journey}</p>
              <h2>{t.process}</h2>
            </div>
            <p>{t.processIntro}</p>
          </div>
          <div className="journey-grid">
            {t.stages.map((s, i) => (
              <div key={s}>
                <span className="step-number">0{i + 1}</span>
                <h3>{s}</h3>
                <p>{t.stageText[i]}</p>
              </div>
            ))}
          </div>
          <p className="cost-note">{t.note}</p>
        </div>
      </section>
      <section id="sources" className="section-wrap sources-section">
        <div>
          <p className="eyebrow">{t.sources}</p>
          <h2>{t.faq}</h2>
          <details>
            <summary>{t.q}</summary>
            <p>{t.a}</p>
          </details>
          {lang === "ar" &&
            content.faqs
              .filter((f) => !/^STORAGE_TEST_/i.test(f.q))
              .map((f, i) => (
                <details key={`${f.q}-${i}`}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
        </div>
        <aside className="source-panel">
          <span className="source-mark">↗</span>
          <h3>{t.sources}</h3>
          <p>{t.sourceNote}</p>
          {services.map((s) => (
            <a
              key={s.slug}
              href={s.source}
              target="_blank"
              rel="noopener noreferrer"
            >
              {s.authority}
              <span>↗</span>
            </a>
          ))}
          <small>{t.verified}</small>
        </aside>
      </section>
      {lang === "ar" && content.goldenParagraph && (
        <section className="editorial-note section-wrap">
          <h2>{t.adminContent}</h2>
          <p>{content.goldenParagraph}</p>
        </section>
      )}
      <section id="contact" className="contact-band">
        <div>
          <p className="eyebrow">{t.contact}</p>
          <h2>{t.reach}</h2>
          <p>{t.reachText}</p>
        </div>
        <div className="contact-actions">
          <a
            className="action-primary"
            href={content.contact.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp <span>↗</span>
          </a>
          <a href={`tel:${content.contact.phone}`}>
            {t.call} <bdi>{content.contact.phoneDisplay}</bdi>
          </a>
        </div>
      </section>
    </>
  );
}
