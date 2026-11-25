import ArrowUpRight from "@/components/ArrowUpRight";
import { localizedPath } from "@/lib/site-language";
import type { HomeModel } from "@/lib/home/model";

export default function EditorialPromise({lang, t}: Pick<HomeModel, "lang" | "t">) {
  return (
    <>
      <section className="editorial-promise" aria-labelledby="promise-title">
        <div className="section-wrap editorial-promise-inner">
          <div>
            <p className="eyebrow">{lang === "ar" ? "قبل اتخاذ القرار" : lang === "zh" ? "决策之前" : "BEFORE YOU DECIDE"}</p>
            <h2 id="promise-title">{lang === "ar" ? "المعلومة الجيدة لا تبيعك وعدًا.\nبل تمنحك وضوحًا." : lang === "zh" ? "可靠的信息不承诺结果。\n它带来清晰判断。" : "Good guidance makes no promises.\nIt gives you clarity."}</h2>
          </div>
          <div className="editorial-promise-copy">
            <p>{lang === "ar" ? "لا نفترض أن كل نشاط متاح للتملك الكامل، أو أن جميع الطلبات تتبع المدة نفسها. نوضح ما يمكن التحقق منه، وما يحتاج مراجعة لدى الجهة المختصة، وما يعتمد على ظروف ملفك." : lang === "zh" ? "我们不会假设所有行业都允许外资全资持有，也不会承诺统一审批时限。我们区分可核实的信息、主管部门的要求和个案情况。" : "We do not assume every sector allows full foreign ownership or that every application follows the same timeline. We distinguish verifiable guidance from regulator-specific and case-specific decisions."}</p>
            <a href="#sources">{t.sources} <span aria-hidden="true"><ArrowUpRight /></span></a>
          </div>
        </div>
      </section>
      <section className="section-wrap" style={{paddingBlock:"32px"}}><a className="action-primary" href={localizedPath(lang,"/packages")}>{lang==="ar"?"استعرض باقات التأسيس وأسعارها":lang==="zh"?"查看设立套餐和价格":"Explore formation packages and prices"} <ArrowUpRight /></a></section>
    </>
  );
}
