export type Text = { ar: string; en: string; zh: string };
export const sources = {
  misa: "https://misa.gov.sa/activities/laws-regulations-copy/",
  company: "https://mc.gov.sa/en/Pages/Start-your-project.aspx",
  bank: "https://rulebook.sama.gov.sa/en/account-opening-rules",
  contracts: "https://laws.boe.gov.sa/",
  residency: "https://pr.gov.sa/premium-residency-regulations",
  funds:
    "https://cma.gov.sa/en/RulesRegulations/Regulations/Pages/default.aspx",
};
export const services: {
  slug: string;
  title: Text;
  summary: Text;
  source: string;
  authority: string;
}[] = [
  {
    slug: "misa-license",
    authority: "MISA",
    source: sources.misa,
    title: {
      ar: "التسجيل الاستثماري",
      en: "Investment registration",
      zh: "投资登记",
    },
    summary: {
      ar: "يُلزم نظام الاستثمار المحدّث المستثمر الأجنبي بالتسجيل لدى وزارة الاستثمار قبل مزاولة الاستثمار. وتحتاج الأنشطة المستثناة إلى الموافقات المقررة؛ تختلف نسب التملك والمتطلبات باختلاف النشاط.",
      en: "The updated Investment Law requires foreign investors to register with MISA before investing. Excluded activities require relevant approvals; ownership and requirements depend on the activity.",
      zh: "根据更新后的投资法，外国投资者开展投资前须向投资部登记。受限制的活动须取得相应批准；持股比例及要求因活动而异。",
    },
  },
  {
    slug: "company-formation",
    authority: "Ministry of Commerce",
    source: sources.company,
    title: { ar: "تأسيس الشركات", en: "Company formation", zh: "公司设立" },
    summary: {
      ar: "اختر الشكل القانوني المناسب، ثم استكمل التأسيس عبر المركز السعودي للأعمال. التسجيل الاستثماري والموافقات القطاعية يرتبطان بالنشاط وصفة المستثمر.",
      en: "Choose an appropriate legal form and complete incorporation through the Saudi Business Center. Investment registration and sector approvals depend on the activity and investor category.",
      zh: "选择合适的法律形式，通过沙特商务中心办理公司设立。投资登记及行业批准取决于业务活动和投资者类别。",
    },
  },
  {
    slug: "corporate-banking",
    authority: "SAMA",
    source: sources.bank,
    title: {
      ar: "الحسابات البنكية للشركات",
      en: "Corporate banking",
      zh: "企业银行开户",
    },
    summary: {
      ar: "إعداد ملف الشركة والمفوّضين والمستفيد الحقيقي ومتطلبات اعرف عميلك. يخضع قبول الطلب والمدة والحضور لسياسة البنك وفحوص الامتثال؛ لا يُضمن فتح الحساب.",
      en: "Prepare company, authorised signatory, beneficial owner and KYC information. Approval, timing and attendance depend on the bank and compliance checks; account opening is not guaranteed.",
      zh: "准备公司、授权签字人、实际受益人及客户尽职调查资料。审批、时限及到场要求由银行及合规审查决定，不保证开户成功。",
    },
  },
  {
    slug: "contract-drafting",
    authority: "Bureau of Experts",
    source: sources.contracts,
    title: {
      ar: "العقود والحوكمة",
      en: "Contracts & governance",
      zh: "合同与公司治理",
    },
    summary: {
      ar: "حدّد احتياجات العقود والتأسيس والحوكمة وراجعها مع مختص مؤهل في الأنظمة السعودية. المعلومات العامة ليست رأياً قانونياً خاصاً بحالتك.",
      en: "Identify incorporation, contract and governance needs and review them with a qualified Saudi legal professional. General information is not case-specific legal advice.",
      zh: "明确公司设立、合同及治理需求，并由具备资质的沙特法律专业人士审核。一般信息不构成针对个案的法律意见。",
    },
  },
  {
    slug: "premium-residency",
    authority: "Premium Residency Center",
    source: sources.residency,
    title: { ar: "الإقامة المميزة", en: "Premium residency", zh: "高级居留" },
    summary: {
      ar: "تتوفر منتجات متعددة للإقامة المميزة، ولكل منها شروط ومقابل مالي. لا يُعد الاستثمار أو تأسيس شركة وحده ضماناً للأهلية. راجع شروط المنتج ورسومه لدى المركز قبل التقديم.",
      en: "Premium Residency has several products, each with its own eligibility and fees. Investing or forming a company alone does not guarantee eligibility. Verify current product terms and fees with the Center.",
      zh: "高级居留包含多种产品，各有资格条件及费用。投资或设立公司本身不保证符合资格。申请前请向居留中心核实最新条件及费用。",
    },
  },
  {
    slug: "investment-funds",
    authority: "CMA",
    source: sources.funds,
    title: {
      ar: "الصناديق الاستثمارية",
      en: "Investment funds",
      zh: "投资基金",
    },
    summary: {
      ar: "تخضع إدارة الصناديق وطرحها لأنظمة هيئة السوق المالية، وتتطلب الجهات الممارسة التراخيص المناسبة. تختلف الموافقات أو الإشعارات بحسب نوع الصندوق؛ لا يمثل السجل التجاري ترخيصاً لإدارة الأموال.",
      en: "Fund management and offerings are regulated by CMA and require appropriately licensed institutions. Approval or notification depends on fund type; commercial registration is not a fund management licence.",
      zh: "基金管理及发行受资本市场管理局监管，须由持有相应许可的机构开展。审批或通知程序因基金类型而异；商业注册不等于基金管理许可。",
    },
  },
];
export const copy = {
  ar: {
    brand: "خدمات المستثمرين",
    tagline: "وضوح في الرؤية. ثقة في الانطلاقة.",
    nav: "الخدمات",
    journey: "رحلة التأسيس",
    sources: "المصادر الرسمية",
    contact: "ناقش خطتك الاستثمارية",
    eyebrow: "السعودية · آفاق جديدة للأعمال",
    hero: "طموحك عالمي.\nانطلاقتك سعودية.",
    intro:
      "مسار أوضح لدخول السوق السعودي. اكتشف متطلبات الاستثمار والتأسيس، وخطّط لخطوتك التالية بمعلومات موثّقة.",
    explore: "اكتشف الخدمات",
    label: "من الفكرة إلى الانطلاقة",
    heading: "كل خطوة، برؤية واضحة.",
    description:
      "ستة مسارات تساعدك على فهم المتطلبات واتخاذ القرار المناسب لنشاطك.",
    detail: "استكشف المسار",
    process: "رحلتك إلى السوق السعودي",
    processIntro: "ابدأ بفهم المتطلبات قبل الالتزام بالتكلفة أو المدة.",
    stages: ["حدّد وجهتك", "جهّز أساسك", "أكمل الإجراءات"],
    stageText: [
      "حدّد نشاطك وهيكل الملكية والجهة المنظمة.",
      "راجع الأهلية والمستندات والميزانية المفصّلة.",
      "قدّم عبر الجهات المختصة وتابع الموافقات.",
    ],
    note: "تختلف الرسوم والمدد بحسب النشاط والجهة واكتمال الملف. تُفصل الرسوم الحكومية ورأس المال وأتعاب الخدمات في عرض السعر؛ لا توجد تكلفة موحّدة أو موافقات مضمونة.",
    faq: "أسئلة قبل البداية",
    q: "هل التملك الأجنبي الكامل متاح لكل الأنشطة؟",
    a: "قد يُتاح وفق النشاط، مع وجود أنشطة مستثناة أو مقيّدة ومتطلبات قطاعية. تحقّق من وزارة الاستثمار والجهة المنظمة قبل اختيار الهيكل.",
    foot: "معلومات إرشادية مستقلة. القرارات والموافقات من اختصاص الجهات الرسمية.",
    verified: "مراجعة المصادر: 13 نوفمبر 2026",
    back: "جميع الخدمات",
    requirements: "خطوات تستحق التخطيط",
    fees: "الرسوم والمدة",
    sourceNote: "ارجع إلى الجهة المختصة للتحقق من أحدث الشروط قبل التقديم.",
    reach: "خطوتك التالية تبدأ بمحادثة.",
    reachText:
      "حدّد النشاط وجنسية المستثمر والشكل القانوني المقترح لتبدأ من الأساس الصحيح.",
    call: "اتصل بنا",
    adminContent: "معلومات إضافية من فريق المحتوى",
  },
  en: {
    brand: "Investor Services",
    tagline: "Clear vision. Confident beginnings.",
    nav: "Services",
    journey: "Your journey",
    sources: "Official sources",
    contact: "Discuss your investment",
    eyebrow: "SAUDI ARABIA · NEW BUSINESS HORIZONS",
    hero: "Global ambition.\nSaudi beginnings.",
    intro:
      "A clearer path into the Saudi market. Understand investment and incorporation requirements, and plan your next move with sourced information.",
    explore: "Explore services",
    label: "FROM IDEA TO ESTABLISHMENT",
    heading: "Clarity at every step.",
    description:
      "Six pathways to understand the requirements and make informed decisions for your business.",
    detail: "Explore pathway",
    process: "Your journey into Saudi Arabia",
    processIntro:
      "Understand the requirements before committing to a budget or timeline.",
    stages: [
      "Define your direction",
      "Build your foundation",
      "Complete the process",
    ],
    stageText: [
      "Identify your activity, ownership structure and regulator.",
      "Review eligibility, documents and an itemised budget.",
      "Apply through the relevant authorities and follow up on approvals.",
    ],
    note: "Fees and timelines depend on activity, authority and complete documentation. Government charges, capital and service fees must be itemised separately. There is no universal setup price or guaranteed approval.",
    faq: "Before you begin",
    q: "Is full foreign ownership available for every activity?",
    a: "It may be available depending on the activity. Excluded or restricted activities and sector requirements apply. Check with MISA and the sector regulator before choosing a structure.",
    foot: "Independent guidance. Official authorities determine approvals and decisions.",
    verified: "Sources reviewed: 13 November 2026",
    back: "All services",
    requirements: "Steps to plan for",
    fees: "Fees & timing",
    sourceNote:
      "Check the latest terms with the relevant authority before applying.",
    reach: "Your next move starts with a conversation.",
    reachText:
      "Start with your activity, investor nationality and proposed legal form.",
    call: "Call us",
    adminContent: "Additional information from our content team",
  },
  zh: {
    brand: "投资者服务",
    tagline: "清晰愿景，自信启航。",
    nav: "服务",
    journey: "设立流程",
    sources: "官方来源",
    contact: "讨论投资计划",
    eyebrow: "沙特阿拉伯 · 商业新机遇",
    hero: "全球雄心。\n从沙特启航。",
    intro:
      "更清晰地进入沙特市场。了解投资与公司设立要求，以有来源的信息规划下一步。",
    explore: "探索服务",
    label: "从构想到落地",
    heading: "每一步，都清晰。",
    description: "六大服务方向，帮助您了解要求，为业务作出明智决策。",
    detail: "了解详情",
    process: "进入沙特市场的旅程",
    processIntro: "在确定预算或时间前，先了解相关要求。",
    stages: ["明确方向", "夯实基础", "完成手续"],
    stageText: [
      "确定业务活动、股权结构及监管机构。",
      "核实资格、材料及分项预算。",
      "通过相关机构申请并跟进审批。",
    ],
    note: "费用与时限取决于业务、主管机构及材料完整程度。政府费用、资本金及服务费应分别列明。不存在统一的设立总价，也不保证获得批准。",
    faq: "开始前的问题",
    q: "所有业务都允许外资全资持有吗？",
    a: "是否允许取决于具体业务。部分业务被禁止或限制，并有行业要求。选择架构前，请向投资部及行业监管机构核实。",
    foot: "独立参考信息。决定及批准由官方主管机构作出。",
    verified: "来源审核：2026年11月13日",
    back: "全部服务",
    requirements: "需要规划的步骤",
    fees: "费用与时限",
    sourceNote: "申请前请向主管机构核实最新条件。",
    reach: "下一步，从沟通开始。",
    reachText: "请先明确业务活动、投资者国籍及拟采用的法律形式。",
    call: "联系我们",
    adminContent: "内容团队提供的补充信息",
  },
};
