import { DiscoveryContent, serviceDiscoveryIcon } from "@/components/discovery/DiscoveryCard";
import { localizedPath } from "@/lib/site-language";
import type { HomeModel } from "@/lib/home/model";

export default function MarketEntry({lang, t}: Pick<HomeModel, "lang" | "t">) {
  return (
    <>
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
        <div className="entry-route-grid discovery-grid">
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
            <a className="entry-route-card discovery-card" key={route.num} href={localizedPath(lang, `/services/${route.slug}`)}>
              <DiscoveryContent icon={serviceDiscoveryIcon(route.slug)} number={Number(route.num)} eyebrow={route.tag[lang]} title={route.title[lang]} description={route.desc[lang]} action={t.detail} heading/>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
