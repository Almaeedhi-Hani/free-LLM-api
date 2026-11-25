import ArrowUpRight from "@/components/ArrowUpRight";
import { localizedPath } from "@/lib/site-language";
import type { HomeModel } from "@/lib/home/model";

export default function ConversionProof({lang}: Pick<HomeModel, "lang">) {
  return (
    <>
      <section className="conversion-proof section-wrap" aria-labelledby="conversion-proof-title">
        <div className="conversion-proof-heading">
          <p className="eyebrow">{lang==="ar"?"قبل التقديم":lang==="zh"?"申请前":"BEFORE YOU APPLY"}</p>
          <h2 id="conversion-proof-title">{lang==="ar"?"لا تبدأ بدفع رسوم قبل أن تفهم مسارك.":lang==="zh"?"先明确适用路径，再决定费用。":"Understand your route before you commit to a fee."}</h2>
          <p>{lang==="ar"?"نرتب قرارك حول ثلاثة أسئلة عملية، حتى تتواصل معنا وأنت تعرف ما تحتاجه وما ينبغي التحقق منه.":lang==="zh"?"围绕三个实际问题整理您的决策，明确需准备和核实的材料。":"Three practical checks help you understand what to prepare and what still requires verification."}</p>
        </div>
        <div className="conversion-proof-grid">
          <article><span>01</span><h3>{lang==="ar"?"هل أنت مؤهل؟":lang==="zh"?"是否符合资格？":"Are you eligible?"}</h3><p>{lang==="ar"?"نراجع طبيعة النشاط وصفة المستثمر ووجود شركة أجنبية أو إقامة مميزة.":lang==="zh"?"核查业务类型、投资者身份、境外公司或高级居留情况。":"Check activity, investor status, foreign entity records or residency status."}</p></article>
          <article><span>02</span><h3>{lang==="ar"?"ما التكلفة الحقيقية؟":lang==="zh"?"完整费用有哪些？":"What are the full costs?"}</h3><p>{lang==="ar"?"نفصل أتعاب الخدمة عن الرسوم الحكومية ورأس المال والتكاليف الخارجية.":lang==="zh"?"将服务费与政府费用、资本金和第三方成本分开。":"Separate service fees from official charges, required capital and third-party costs."}</p></article>
          <article><span>03</span><h3>{lang==="ar"?"ما خطوتك التالية؟":lang==="zh"?"下一步做什么？":"What happens next?"}</h3><p>{lang==="ar"?"تعرّف على المستندات والجهات والمخرجات قبل اعتماد عرض مكتوب.":lang==="zh"?"明确文件、主管机构和交付内容，再确认书面报价。":"Identify documents, regulators and deliverables before accepting a written quotation."}</p></article>
        </div>
        <a href={localizedPath(lang,"/packages")} className="conversion-proof-link">{lang==="ar"?"استعرض الباقات العشر":lang==="zh"?"查看十个服务套餐":"Explore all 10 packages"} <ArrowUpRight /></a>
      </section>
    </>
  );
}
