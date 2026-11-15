import type { PackageLocale, Trilingual } from "./package-offers";

// Editorial guidance, not a claim of licensing authority or a promise of approval.
// Each material regulatory point is linked to an official Saudi source.
export const playbookReviewedAt = "2026-11-15";
export const playbookSources: {url: string; title: Trilingual}[] = [
  {
    url: "https://misa.gov.sa/frequently-asked-questions/",
    title: {ar:"وزارة الاستثمار: الأسئلة الشائعة",en:"Ministry of Investment: FAQs",zh:"沙特投资部：常见问题"}
  },
  {
    url: "https://investsaudi.sa/e-services/registering_investment",
    title: {ar:"استثمر في السعودية: التسجيل الاستثماري",en:"Invest Saudi: investment registration",zh:"沙特投资门户：投资登记"}
  },
  {
    url: "https://mc.gov.sa/EN/ESERVICES/Pages/ServiceDetails.aspx?sID=20",
    title: {ar:"وزارة التجارة: تأسيس شركة بموجب شهادة التسجيل الاستثماري",en:"Ministry of Commerce: company formation service",zh:"沙特商务部：公司设立服务"}
  }
];

export const formationPlaybook = {
  eyebrow: {ar:"دليل القرار قبل التأسيس",en:"BEFORE YOU INCORPORATE",zh:"设立前的决策指南"},
  title: {ar:"نبدأ بقرار المستثمر. ثم نختار الباقة.",en:"Start with your investor route. Then choose a package.",zh:"先确定投资者路径，再选择服务方案。"},
  intro: {
    ar:"قد تتشابه أسماء الخدمات وتختلف خطواتها جذريًا. الجنسية، وهيكل الملكية، والنشاط، ومستندات الشركة القائمة تحدد الجهات التي ستراجع ملفك وما تحتاجه قبل الدفع. هذا الدليل يساعدك على طرح الأسئلة الصحيحة، لا على افتراض الموافقة.",
    en:"Similar-sounding setup packages can require very different filings. Nationality, ownership, business activity and existing company records determine what must be checked before you pay. Use this guide to ask the right questions, not to assume approval.",
    zh:"名称相似的设立方案，实际申请流程可能完全不同。国籍、股权结构、业务活动及境外公司资料都会影响审批要求。先了解适用路径，再决定服务范围与付款。"
  },
  routesHeading: {ar:"أين تبدأ؟ أربع حالات مختلفة",en:"Four starting points, four different checks",zh:"四类起点，各有审核重点"},
  routes: [
    {
      slug:"gcc",
      title:{ar:"مستثمر خليجي",en:"GCC national investor",zh:"海合会公民投资者"},
      context:{
        ar:"توضح وزارة الاستثمار أن المستثمر الخليجي يُعامل كمستثمر محلي، ما لم تتضمن ملكية شركته الخليجية مستثمرين أجانب. يجب مراجعة هيكل الملكية والنشاط قبل اختيار المسار.",
        en:"MISA states that a GCC investor is treated as a local investor unless the GCC company has foreign investors in its ownership. Review the ownership chain and intended activity first.",
        zh:"沙特投资部指出，海合会投资者通常按本地投资者对待；如其海合会公司股权中有外国投资者，情况可能不同。须先核对股权及业务。"
      },
      next:{ar:"ابدأ بفحص جنسية الشركاء وهيكل الملكية.",en:"Start with shareholder nationalities and ownership.",zh:"先核对股东国籍和股权结构。"}
    },
    {
      slug:"foreign",
      title:{ar:"شركة أجنبية قائمة",en:"Existing foreign company",zh:"已有境外公司"},
      context:{
        ar:"قد يشمل ملف التسجيل الاستثماري سجل الشركة الأجنبية المصدق والقوائم المالية للسنة الأخيرة ومستندات النشاط. التسجيل الاستثماري منفصل عن تأسيس الكيان والتراخيص القطاعية.",
        en:"Investment registration may require authenticated foreign company records, recent financial statements and activity-specific documents. Registration is not the same as incorporation or sector licensing.",
        zh:"投资登记可能要求认证的境外公司登记资料、最近一个财年的财务报表及行业材料。投资登记不等于公司设立或行业许可。"
      },
      next:{ar:"حضّر مستندات الشركة وحدد النشاط بدقة.",en:"Prepare company records and define the activity.",zh:"准备公司资料并明确业务活动。"}
    },
    {
      slug:"residency",
      title:{ar:"حامل الإقامة المميزة",en:"Premium Residency holder",zh:"高级居留持有人"},
      context:{
        ar:"تذكر وزارة الاستثمار إعفاءات محددة من بعض مستندات التسجيل لهذه الفئة، وليست إعفاءً عامًا من متطلبات النشاط أو ترخيصه. يجب تحديد فئة الإقامة والكيان المقترح.",
        en:"MISA describes exemptions from certain registration documents for this category, not a general exemption from business activity rules or sector approval. Confirm the residency category and entity plan.",
        zh:"投资部为该类别规定了部分登记文件豁免，但不代表免除行业许可或其他业务要求。需确认居留类别和拟设实体。"
      },
      next:{ar:"تحقق من نوع الإقامة ومن متطلبات النشاط.",en:"Check residency category and activity conditions.",zh:"核查居留类别与行业要求。"}
    },
    {
      slug:"new",
      title:{ar:"مشروع جديد دون شركة أجنبية",en:"New venture without a foreign company",zh:"没有境外公司的新项目"},
      context:{
        ar:"لا تفترض أن شراء شركة خارجية أو اختيار باقة أعلى هو الحل الصحيح. راجع أولًا المسارات التي قد تنطبق على صفتك والنشاط، ثم اطلب مقارنة مكتوبة لنطاق الخدمات والالتزامات.",
        en:"Do not assume purchasing an overseas entity or selecting the highest-priced package is the correct route. First review potentially eligible pathways and request a written scope comparison.",
        zh:"不要默认购买境外公司或选择最昂贵套餐就是正确途径。先核实适用申请路径，再要求书面比较服务范围与义务。"
      },
      next:{ar:"اطلب مراجعة الأهلية قبل اختيار نموذج تأسيس.",en:"Request an eligibility assessment before choosing an entity.",zh:"选定实体模式前先评估申请资格。"}
    }
  ],
  costsTitle:{ar:"ما الذي تدفع مقابله فعلًا؟",en:"What are you actually paying for?",zh:"实际费用包括哪些？"},
  costsIntro:{
    ar:"لا تقارن أسعار باقات مختلفة بمجرد الرقم. اطلب تفصيل المخرجات والتكاليف لكل بند.",
    en:"A lower headline figure means little if deliverables differ. Compare written scope and cost categories.",
    zh:"若交付范围不同，仅比较报价数字没有意义。应按书面服务范围与费用类别核对。"
  },
  costs:[
    {title:{ar:"أتعاب مقدم الخدمة",en:"Professional service fee",zh:"专业服务费"},detail:{ar:"المراجعة والتنسيق والمخرجات المذكورة في عرضك المكتوب.",en:"Planning, coordination and deliverables agreed in writing.",zh:"书面确认的规划、协调与交付工作。"}},
    {title:{ar:"الرسوم الحكومية",en:"Government charges",zh:"政府收费"},detail:{ar:"التسجيل والتأسيس والتراخيص، بحسب الفواتير والجهات المختصة.",en:"Registration, incorporation and permits, as assessed by authorities.",zh:"主管机关确定的登记、设立和许可费用。"}},
    {title:{ar:"تكاليف المشروع والأطراف الأخرى",en:"Capital and third-party costs",zh:"资本金与第三方成本"},detail:{ar:"رأس المال أو التصديقات أو الترجمة أو المصروفات التشغيلية عند انطباقها.",en:"Capital, attestations, translations and operating costs where applicable.",zh:"适用的资本金、认证、翻译及经营费用。"}}
  ],
  questionsTitle:{ar:"إجابات رسمية تغيّر قرارك",en:"Official answers that change your decision",zh:"影响决策的官方解答"},
  questions:[
    {
      q:{ar:"هل يجب أن يكون لدي شريك سعودي؟",en:"Do I always need a Saudi partner?",zh:"一定需要沙特股东吗？"},
      a:{ar:"ليس في كل الأنشطة. توضح وزارة الاستثمار أن ذلك يعتمد على النشاط؛ بعض الأنشطة تتطلب شريكًا محليًا وبعضها لا.",en:"Not for every activity. MISA explains that the requirement depends on the activity; some activities require a local partner and others do not.",zh:"并非所有业务都需要。投资部说明，该要求取决于行业，有些业务需本地股东，有些则不需要。"}
    },
    {
      q:{ar:"هل تعني مدة مراجعة التسجيل أن الشركة جاهزة للتشغيل؟",en:"Does registration review time equal launch time?",zh:"登记审核时间是否等于开业时间？"},
      a:{ar:"لا. تذكر الوزارة مدة مراجعة للتسجيل الاستثماري تصل إلى عشرة أيام عمل، لكن تأسيس الشركة والموافقات الأخرى والتشغيل مراحل منفصلة.",en:"No. MISA lists up to ten working days for investment registration review; incorporation, other approvals and operational readiness are separate stages.",zh:"不是。投资部列出的投资登记审核期最长约十个工作日，公司设立、其他审批及运营准备仍是独立阶段。"}
    },
    {
      q:{ar:"هل تشمل باقتكم رسوم الجهات الحكومية؟",en:"Are official charges included in our packages?",zh:"套餐包含政府收费吗？"},
      a:{ar:"لا. الأسعار المنشورة أتعاب مهنية مقترحة فقط؛ الرسوم الحكومية ورأس المال وتكاليف الأطراف الأخرى تُفصل في العرض النهائي.",en:"No. Displayed prices are proposed professional fees. Government charges, capital and third-party costs are specified separately in the final quotation.",zh:"不包含。所示为拟议专业服务费，政府收费、资本金及第三方费用将在最终报价中单独列明。"}
    }
  ],
  sourcesHeading:{ar:"المصادر الرسمية وتاريخ المراجعة",en:"Official sources and review date",zh:"官方来源与核查日期"},
  reviewedLabel:{ar:"آخر مراجعة تحريرية",en:"Editorial review",zh:"内容核查日期"},
  disclaimer:{
    ar:"المعلومات عامة وتُراجع المتطلبات الرسمية عند التقديم. خدماتنا جهة خاصة مستقلة، والقرار النهائي للجهات المختصة. لا يعد هذا الدليل ضمانًا للموافقة أو عرض سعر نهائيًا.",
    en:"General guidance only: verify live official requirements before applying. We are an independent private provider; authorities decide approvals. This guide is neither an approval promise nor a final quotation.",
    zh:"本指南仅供参考，申请前须核实现行官方要求。本机构为独立民营服务方；审批由主管机关决定。内容不构成批准承诺或最终报价。"
  },
  cta:{ar:"قارن الخدمات وحدّد الخطوة المناسبة",en:"Compare services and choose your next step",zh:"比较服务并选择下一步"}
} satisfies Record<string, unknown>;

// Enforce public content completeness when working on the three site locales.
export const playbookLocales: readonly PackageLocale[] = ["ar","en","zh"];
