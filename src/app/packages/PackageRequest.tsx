"use client";
import { useState } from "react";
import { packageGroups, packageOffers, packageDisclosure, packageUpdatedAt } from "@/lib/package-offers";
import type { PackageGroupId, PackageLocale, PackageOffer } from "@/lib/package-offers";

type Lead = { name: string; email: string; phone: string; country: string; activity: string; budget: string; company: string; notes: string };
const blank: Lead = { name: "", email: "", phone: "", country: "", activity: "", budget: "", company: "unsure", notes: "" };
const words = {
  ar: {
    title:"باقات تأسيس الشركات والتراخيص الاستثمارية في السعودية",
    eyebrow:"اختر مسارك بثقة",
    intro:"التأسيس ليس قرار سعر فقط؛ نوع نشاطك وصفة المستثمر ومستنداتك تحدد المسار. قارن ما سنراجع لك قبل أن تبدأ.",
    choose:"اختر الباقة وابدأ تقييم حالتك", all:"كل الباقات", guide:"كيف تختار المسار المناسب؟",
    guide1:"حدّد نشاطك: خدمي أم تجاري أم مهني.",guide2:"تأكد من وضعك: شركة أجنبية قائمة، إقامة مميزة، أو مشروع جديد.",guide3:"راجع المستندات والجهات الحكومية قبل أي دفع.",
    forWhom:"تناسب من؟",scope:"ما الذي نعمل عليه؟",requirements:"ما الذي نحتاجه للبدء؟",exclusions:"ما الذي لا يشمله السعر؟",
    quote:"سعر الخدمة", currency:"ر.س", installments:"حتى % دفعات حسب العرض المكتوب", updated:"آخر تحديث للأسعار",
    next:"التالي",back:"السابق",contactTitle:"من يتواصل معنا؟",investmentTitle:"صف لنا المشروع",review:"راجع طلب التواصل",
    name:"الاسم",email:"البريد الإلكتروني (اختياري)",phone:"رقم التواصل",country:"دولة الإقامة",activity:"النشاط المقترح",budget:"ميزانية الاستثمار التقريبية",company:"هل لديك شركة خارج السعودية؟",notes:"معلومة تساعد المستشار",
    yes:"نعم",no:"لا",unsure:"لم أحدد", required:"أدخل الاسم ورقم تواصل والنشاط المطلوب.",contact:"أرسل التفاصيل عبر واتساب",
    beforeSend:"ستُفتح رسالة واتساب مُعدّة مسبقًا. لن نرسل أي بيانات تلقائيًا؛ يمكنك تعديل الرسالة ثم اختيار إرسالها داخل واتساب.",
    noSubmission:"لا يوجد دفع إلكتروني أو تسجيل طلب تلقائي في هذه الصفحة.",reset:"اختيار باقة أخرى",
    faqTitle:"قبل الالتزام: إجابات تختصر الطريق", q1:"هل هذه الأسعار تشمل الرسوم الحكومية؟",a1:"لا. الأرقام المعروضة لأتعاب الخدمة المقترحة. الرسوم الحكومية والتصديقات ورأس المال وأتعاب الأطراف الأخرى منفصلة.",
    q2:"هل تكفي الباقة للحصول على الترخيص؟",a2:"الاعتماد النهائي من الجهات المختصة بعد التحقق من الأهلية والمستندات ونوع النشاط؛ لا نعد بإصدار تلقائي.",
    q3:"كيف نعرف الباقة الأنسب؟",a3:"شاركنا النشاط وصفة المستثمر ووجود شركة أجنبية. نراجع المعطيات ثم نوضح الخيارات والمستندات والجهات المعنية.",
    q4:"هل يمكن تعديل نطاق العرض؟",a4:"نعم؛ يُحدد نطاق الخدمة والتكلفة النهائية والدفعات والمخرجات في عرض مكتوب قبل التزامك.",
    official:"تحقق من المتطلبات الحكومية",source1:"وزارة الاستثمار",source2:"وزارة التجارة",
    start:"ابدأ بخطوة واضحة لا بمجرد اختيار سعر", after:"قرار التأسيس ينجح عندما تتطابق الأهلية مع النشاط والوثائق والتكلفة.",
    same:"نطاق كل باقة مختلف. اخترها حسب متطلباتك وليس السعر وحده."
  },
  en: {
    title:"Company formation and investment licence packages in Saudi Arabia",
    eyebrow:"Choose with clarity", intro:"Formation is not only a price decision. Your activity, investor status and documents determine the route. Compare what we will review before you proceed.",
    choose:"Choose this route and start assessment", all:"All packages",guide:"How to choose the right route",
    guide1:"Identify your activity: services, trading or regulated profession.",guide2:"Confirm investor status: existing company, residency holder or new venture.",guide3:"Review documents and regulators before committing.",
    forWhom:"Who is this for?",scope:"What we help you plan",requirements:"What we need to get started",exclusions:"What is excluded",
    quote:"Service fee",currency:"SAR",installments:"Up to % instalments by written agreement",updated:"Prices reviewed",
    next:"Next",back:"Back",contactTitle:"Contact details",investmentTitle:"Tell us about the venture",review:"Review your enquiry",
    name:"Your name",email:"Email (optional)",phone:"Contact number",country:"Country of residence",activity:"Planned business activity",budget:"Approximate investment budget",company:"Do you already own a foreign company?",notes:"Context for the advisor",
    yes:"Yes",no:"No",unsure:"Not sure",required:"Enter a name, contact number and activity.",contact:"Open WhatsApp with my enquiry",
    beforeSend:"WhatsApp opens with a prepared message. Nothing is sent automatically; you can edit and send it in WhatsApp.",
    noSubmission:"There is no automatic order submission or online payment on this page.",reset:"Select another package",
    faqTitle:"Questions worth resolving before you commit",q1:"Do prices include government charges?",a1:"No. These figures are proposed service fees only. Government charges, attestations, capital and third-party fees are separate.",
    q2:"Does choosing a package guarantee approval?",a2:"No. Eligibility, documents and the intended activity are reviewed by the competent authorities.",
    q3:"Which package fits my situation?",a3:"Share your activity, investor status and any foreign-company records. We will explain possible routes and required documents.",
    q4:"Can the scope be adjusted?",a4:"Yes. Exact deliverables, final fees and payment milestones are set out in writing before any commitment.",
    official:"Verify official requirements",source1:"Ministry of Investment",source2:"Ministry of Commerce",
    start:"Begin with an informed decision—not a price alone",after:"The strongest plan aligns eligibility, activity, documents and cost.",same:"Scopes vary; choose for your business needs, not price alone."
  },
  zh: {
    title:"沙特公司设立及投资许可服务套餐",eyebrow:"清晰选择适合的路径",intro:"设立公司不只是比较价格。业务、投资者身份与文件决定适合的路线。请先了解每个服务范围。",
    choose:"选择此方案并开始评估",all:"全部方案",guide:"如何选择适合的路径？",guide1:"明确业务类别：服务、贸易或专业服务。",guide2:"确认身份：现有公司、高级居留持有人或新项目。",guide3:"承诺付款前核对文件与主管机构。",
    forWhom:"适合谁？",scope:"我们协助规划的内容",requirements:"开始前所需资料",exclusions:"不包含的费用和服务",
    quote:"服务费",currency:"SAR",installments:"最多%期，须书面确认",updated:"价格更新日期",
    next:"下一步",back:"返回",contactTitle:"联系方式",investmentTitle:"介绍您的业务",review:"核对咨询信息",
    name:"姓名",email:"邮箱（选填）",phone:"联系电话",country:"居住国家",activity:"拟开展业务",budget:"预计投资预算",company:"您是否已有境外公司？",notes:"提供给顾问的补充信息",
    yes:"是",no:"否",unsure:"未确定",required:"请填写姓名、联系电话和业务。",contact:"通过 WhatsApp 咨询",
    beforeSend:"将打开带预填信息的 WhatsApp，网站不会自动发送，您可在 WhatsApp 内编辑并发送。",
    noSubmission:"本页面不会自动提交订单或进行线上支付。",reset:"重新选择套餐",
    faqTitle:"决定前须了解的关键问题",q1:"套餐价格包括政府费用吗？",a1:"不包括。展示金额仅为拟议服务费。政府费用、认证、资本及第三方费用另计。",
    q2:"选购后能保证获批吗？",a2:"不能。实际资格、文件及行业须经主管机构审批。",
    q3:"哪种套餐适合我？",a3:"提供业务类型、投资者身份和境外公司资料，我们协助明确办理路线与材料。",
    q4:"服务范围可以调整吗？",a4:"可以。具体交付、最终收费和付款节点将在承诺前以书面确认。",
    official:"核实官方要求",source1:"投资部",source2:"商务部",
    start:"从清晰的决策开始，而非只看价格",after:"合理的方案须匹配资格、业务、文件和成本。",same:"各套餐范围不同，请根据业务需求选择。"
  }
} as const;

function money(n: number) { return new Intl.NumberFormat("en-US").format(n); }
function whatsappLink(base: string, message: string) {
  try {
    const url = new URL(base);
    if (url.protocol !== "https:" || !["wa.me", "api.whatsapp.com", "web.whatsapp.com"].includes(url.hostname)) return "";
    url.searchParams.set("text", message);
    return url.toString();
  } catch { return ""; }
}
export default function PackageRequest({ lang, contactUrl }: { lang: PackageLocale; contactUrl: string }) {
  const t = words[lang];
  const [filter,setFilter] = useState<PackageGroupId | "all">("all");
  const [selected,setSelected] = useState<PackageOffer | null>(null);
  const [step,setStep] = useState(0);
  const [lead,setLead] = useState<Lead>(blank);
  const [error,setError] = useState("");
  const change = (key: keyof Lead,value:string) => setLead(prev => ({...prev,[key]:value}));
  const choose = (offer:PackageOffer) => {
    setSelected(offer); setStep(1); setError("");
    if (typeof document !== "undefined") requestAnimationFrame(() => document.getElementById("package-intake")?.scrollIntoView({behavior:"smooth",block:"start"}));
  };
  const validContact = Boolean(lead.name.trim() && lead.phone.trim() && (!lead.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)));
  const message = selected ? [
    "Saudi investor services — new enquiry", "Package: " + selected.title[lang],
    "Service fee shown: " + money(selected.price) + " SAR",
    "Name: " + lead.name, "Phone: " + lead.phone, "Email: " + (lead.email || "not provided"),
    "Residence: " + (lead.country || "not provided"), "Activity: " + lead.activity,
    "Existing foreign company: " + lead.company, "Investment budget: " + (lead.budget || "not provided"),
    "Additional details: " + (lead.notes || "none"),
    "Please verify eligibility, official fees and final written scope before confirming."
  ].join("\n") : "";
  const sendUrl = whatsappLink(contactUrl,message);
  return (
    <div className="package-page" dir={lang==="ar"?"rtl":"ltr"}>
      <header className="package-heading">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
        <a href="#package-options" className="action-primary">{t.choose}</a>
      </header>
      <section className="package-advice" aria-labelledby="decision-title">
        <h2 id="decision-title">{t.guide}</h2>
        <ol><li>{t.guide1}</li><li>{t.guide2}</li><li>{t.guide3}</li></ol>
        <p>{t.after}</p>
      </section>
      <section id="package-options" className="package-catalog" aria-label={t.all}>
        <div className="package-catalog-title"><h2>{t.all} — 10</h2><p>{t.same}</p></div>
        <div className="package-filter" role="group" aria-label={t.all}>
          <button type="button" aria-pressed={filter==="all"} onClick={()=>setFilter("all")}>{t.all}</button>
          {packageGroups.map(group=><button key={group.id} type="button" aria-pressed={filter===group.id} onClick={()=>setFilter(group.id)}>{group.title[lang]}</button>)}
        </div>
        {packageGroups.filter(group=>filter==="all"||filter===group.id).map(group=>
          <section key={group.id} className="package-group" aria-labelledby={"group-"+group.id}>
            <div className="package-group-heading"><h2 id={"group-"+group.id}>{group.title[lang]}</h2><p>{group.description[lang]}</p></div>
            <div className="package-offer-cards">
              {packageOffers.filter(offer=>offer.group===group.id).map(offer=>
                <article className="package-offer-card" key={offer.slug} id={offer.slug}>
                  <p className="package-card-label">{group.title[lang]}</p>
                  <h3>{offer.title[lang]}</h3>
                  <p className="package-card-audience">{offer.audience[lang]}</p>
                  <p className="package-card-pitch">{offer.pitch[lang]}</p>
                  <div className="package-card-price">
                    <span>{t.quote}</span><strong dir="ltr">{money(offer.price)} <small>{t.currency}</small></strong>
                    <span className="package-saved" dir="ltr"><s>{money(offer.previousPrice)}</s></span>
                  </div>
                  <h4>{t.scope}</h4>
                  <ul>{offer.features.map(x=><li key={x.en}>{x[lang]}</li>)}</ul>
                  <details><summary>{t.requirements}</summary><p>{offer.requirements[lang]}</p></details>
                  <details><summary>{t.exclusions}</summary><p>{offer.exclusions[lang]}</p></details>
                  <button type="button" className="package-select" onClick={()=>choose(offer)}>{t.choose}</button>
                </article>)}
            </div>
          </section>)}
        <p className="package-disclosure">{packageDisclosure[lang]} <span>{t.updated}: {packageUpdatedAt}</span></p>
      </section>
      {selected && step>0 && <section id="package-intake" className="package-intake package-form" aria-labelledby="intake-title">
        <div className="package-progress"><span>{step} / 3</span><strong id="intake-title">{selected.title[lang]}</strong><span dir="ltr">{money(selected.price)} SAR</span></div>
        {step===1 && <form onSubmit={e=>{e.preventDefault();if(validContact){setError("");setStep(2)}else setError(t.required)}}>
          <h2>{t.contactTitle}</h2>
          <label>{t.name} *<input required value={lead.name} onChange={e=>change("name",e.target.value)} maxLength={120} autoComplete="name"/></label>
          <label>{t.phone} *<input type="tel" required value={lead.phone} onChange={e=>change("phone",e.target.value)} maxLength={30} autoComplete="tel"/></label>
          <label>{t.email}<input type="email" value={lead.email} onChange={e=>change("email",e.target.value)} maxLength={200} autoComplete="email"/></label>
          <label>{t.country}<input value={lead.country} onChange={e=>change("country",e.target.value)} maxLength={100} autoComplete="country-name"/></label>
          {error && <p role="alert">{error}</p>}
          <div className="package-buttons"><button type="button" className="package-secondary" onClick={()=>setStep(0)}>{t.back}</button><button type="submit">{t.next}</button></div>
        </form>}
        {step===2 && <form onSubmit={e=>{e.preventDefault();if(lead.activity.trim()){setError("");setStep(3)}else setError(t.required)}}>
          <h2>{t.investmentTitle}</h2>
          <label>{t.activity} *<input required value={lead.activity} onChange={e=>change("activity",e.target.value)} maxLength={200}/></label>
          <label>{t.company}<select value={lead.company} onChange={e=>change("company",e.target.value)}><option value="unsure">{t.unsure}</option><option value="yes">{t.yes}</option><option value="no">{t.no}</option></select></label>
          <label>{t.budget}<input value={lead.budget} onChange={e=>change("budget",e.target.value)} maxLength={120}/></label>
          <label>{t.notes}<textarea rows={3} value={lead.notes} onChange={e=>change("notes",e.target.value)} maxLength={1200}/></label>
          {error && <p role="alert">{error}</p>}
          <div className="package-buttons"><button type="button" className="package-secondary" onClick={()=>setStep(1)}>{t.back}</button><button type="submit">{t.next}</button></div>
        </form>}
        {step===3 && <div>
          <h2>{t.review}</h2>
          <dl className="package-summary">
            {[[t.name,lead.name],[t.phone,lead.phone],[t.email,lead.email||"—"],[t.activity,lead.activity],[t.budget,lead.budget||"—"],[t.quote,money(selected.price)+" SAR"]].map(([k,v],i)=><div key={i}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
          <p className="package-privacy">{t.beforeSend}</p>
          <p className="package-privacy">{t.noSubmission}</p>
          <div className="package-buttons">
            <button type="button" className="package-secondary" onClick={()=>setStep(2)}>{t.back}</button>
            {sendUrl && <a className="package-whatsapp-cta" href={sendUrl} target="_blank" rel="noopener noreferrer">{t.contact}</a>}
          </div>
          <button type="button" className="package-reset" onClick={()=>{setStep(0);setSelected(null);setLead(blank)}}>{t.reset}</button>
        </div>}
      </section>}
      <section className="package-faq" aria-labelledby="package-faq-title">
        <h2 id="package-faq-title">{t.faqTitle}</h2>
        {([[t.q1,t.a1],[t.q2,t.a2],[t.q3,t.a3],[t.q4,t.a4]] as const).map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      </section>
      <section className="package-official">
        <h2>{t.official}</h2>
        <a href="https://misa.gov.sa/" target="_blank" rel="noopener noreferrer">{t.source1}</a>
        <a href="https://mc.gov.sa/" target="_blank" rel="noopener noreferrer">{t.source2}</a>
        <a href={lang==="ar"?"/services/company-formation":"/"+lang+"/services/company-formation"}>{t.start}</a>
      </section>
    </div>
  );
}
