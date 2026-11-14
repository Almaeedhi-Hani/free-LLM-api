import type { Text } from "./service-catalog";
export const guideLabels = {
  ar: {
    prepare: "ما الذي تجهّزه قبل البداية؟",
    insight: "تفاصيل تصنع فرقاً في قرارك",
    budget: "خطّط للتكلفة بوضوح",
    question: "سؤال مهم",
    checklist: "قائمة عمل أولية، وتُراجع المتطلبات النهائية بحسب حالتك.",
  },
  en: {
    prepare: "What should you prepare?",
    insight: "Details that inform your decision",
    budget: "Plan your costs clearly",
    question: "A practical question",
    checklist:
      "An initial planning checklist. Confirm final requirements for your case.",
  },
  zh: {
    prepare: "开始前需要准备什么？",
    insight: "有助于决策的重要细节",
    budget: "清晰规划费用",
    question: "实用问答",
    checklist: "初步准备清单。最终要求须根据您的具体情况核实。",
  },
};
export const guides: Record<
  string,
  {
    prepare: Text[];
    insight: Text;
    budget: Text;
    q: Text;
    a: Text;
    references: { label: string; url: string }[];
  }
> = {
  "misa-license": {
    prepare: [
      {
        ar: "النشاط المقترح وهيكل الملكية وجنسية الملاك وصفة مقدم الطلب.",
        en: "Proposed activity, ownership chain, shareholder nationalities and applicant category.",
        zh: "拟开展的业务、股权结构、股东国籍及申请人类别。",
      },
      {
        ar: "وثائق الشركة الأجنبية وقوائمها المالية، أو مستندات المسار البديل المؤهل، وفق المتطلبات المعروضة في الطلب.",
        en: "Foreign company records and financial statements, or documents for an eligible alternative route, as specified in the application.",
        zh: "外国公司登记及财务资料，或符合条件的替代途径材料，以申请系统要求为准。",
      },
    ],
    insight: {
      ar: "ابدأ بتحديد النشاط، لا باسم الرخصة. فالتسجيل الاستثماري لا يغني عن موافقات الأنشطة المقيّدة أو تراخيص الجهة القطاعية. ويُراجع مسار الشركة الأجنبية أو حامل الإقامة المميزة أو رائد الأعمال كلٌّ بحسب شروطه.",
      en: "Start with the activity. Investment registration does not replace restricted-activity approvals or sector licences. Foreign companies, Premium Residency holders and entrepreneurs must each follow the applicable route.",
      zh: "先明确业务活动。投资登记不能替代受限业务批准或行业许可。外国公司、高级居留持有人及创业者须分别遵循适用申请途径。",
    },
    budget: {
      ar: "افصل رسوم التسجيل عن تأسيس الكيان والترجمة والتصديق والتراخيص القطاعية. مدة مراجعة الطلب ليست مدة إطلاق المشروع بالكامل؛ احصل على تقدير مرتبط باكتمال ملفك.",
      en: "Separate registration, incorporation, translation, authentication and sector charges. Application review time is not the full launch timeline; request an estimate based on your completed file.",
      zh: "分别核算投资登记、公司设立、翻译、认证及行业许可费用。申请审核时间不等于项目全部落地时间，应根据完整材料评估进度。",
    },
    q: {
      ar: "هل يلزم شريك سعودي في جميع الحالات؟",
      en: "Is a Saudi partner always required?",
      zh: "是否一律需要沙特合作伙伴？",
    },
    a: {
      ar: "لا توجد إجابة واحدة لكل الأنشطة؛ بعض الأنشطة تقبل التملك الأجنبي الكامل وأخرى لها اشتراطات شراكة أو موافقات خاصة.",
      en: "There is no universal rule. Some activities permit full foreign ownership; others have partnership conditions or require specific approvals.",
      zh: "不存在适用于所有业务的统一规则。有些业务允许外资全资持有，另一些设有合作伙伴条件或特别审批要求。",
    },
    references: [
      {
        label: "MISA · Investor FAQ",
        url: "https://misa.gov.sa/frequently-asked-questions/",
      },
      {
        label: "MISA · Investment Law",
        url: "https://misa.gov.sa/activities/laws-regulations-copy/",
      },
    ],
  },
  "company-formation": {
    prepare: [
      {
        ar: "الشكل القانوني والاسم المقترح والنشاط والعنوان وبيانات الشركاء والإدارة.",
        en: "Legal form, proposed name, activities, address, shareholders and management details.",
        zh: "法律形式、拟用名称、业务、地址、股东及管理层资料。",
      },
      {
        ar: "وثائق التأسيس والتسجيل الاستثماري والموافقات اللازمة بحسب صفة المستثمر والنشاط.",
        en: "Incorporation documents, investment registration and applicable investor or activity approvals.",
        zh: "公司设立文件、投资登记及适用的投资者或业务批准。",
      },
    ],
    insight: {
      ar: "اختيار الكيان يسبق تعبئة الطلب. الشركة ذات المسؤولية المحدودة والفرع الأجنبي والشركة المساهمة المبسطة ليست بدائل متطابقة في الإدارة والتمويل والالتزامات. وبعد السجل، راجع متطلبات العنوان والضرائب والعمل والتأمينات والتراخيص التشغيلية.",
      en: "Choose the entity before completing the application. An LLC, foreign branch and simplified joint-stock company differ in governance, financing and obligations. After registration, review address, tax, employment, social insurance and operating requirements.",
      zh: "应先选择实体形式，再填写申请。有限责任公司、外国公司分支机构及简化股份公司在治理、融资和义务方面各不相同。注册后还须核实地址、税务、劳动、社保及经营许可要求。",
    },
    budget: {
      ar: "تعرض خدمة تأسيس الشركة ذات المسؤولية المحدودة بوزارة التجارة 1,200 ريال للسجل و500 ريال للنشر، مع ضريبة قيمة مضافة 15%. هذه بنود خدمة محددة، وليست إجمالي تأسيس شركة أجنبية، ولا تشمل رأس المال أو أتعاب الخدمات أو بقية التراخيص. تحقّق من الفاتورة الحالية قبل الدفع.",
      en: "The Ministry of Commerce LLC service lists SAR 1,200 for registration and SAR 500 for publication, plus 15% VAT. These are specific service items, not the total cost of a foreign-owned business. Capital, professional fees and other licences are separate. Confirm the current invoice before paying.",
      zh: "商务部有限责任公司设立服务列示商业注册费1,200里亚尔、公告费500里亚尔，另加15%增值税。这些只是特定服务项目，并非外资公司设立总成本，不包括资本金、专业服务费及其他许可。付款前请核实最新账单。",
    },
    q: {
      ar: "هل إصدار السجل يعني أن الشركة جاهزة للتشغيل؟",
      en: "Does commercial registration mean the business can operate immediately?",
      zh: "取得商业注册是否即可立即营业？",
    },
    a: {
      ar: "قد تبقى تراخيص مرتبطة بالنشاط والموقع، وتجهيزات بنكية وضريبية وعمالية؛ راجع قائمة التشغيل قبل بدء تقديم الخدمة.",
      en: "Activity and premises licences, banking, tax and employment steps may still be needed. Review operational requirements before trading.",
      zh: "仍可能需要业务或场所许可，以及银行、税务和劳动手续。开展业务前应核实经营要求。",
    },
    references: [
      {
        label: "Ministry of Commerce · LLC service and fees",
        url: "https://mc.gov.sa/en/eservices/Pages/ServiceDetails.aspx?sid=99",
      },
      {
        label: "Ministry of Commerce · Investment company incorporation",
        url: "https://mc.gov.sa/ar/eservices/pages/ServiceDetails.aspx?sID=20",
      },
    ],
  },
  "corporate-banking": {
    prepare: [
      {
        ar: "السجل ووثائق التأسيس والعنوان وبيانات المفوض بالتوقيع.",
        en: "Commercial registration, incorporation records, address and authorised signatory details.",
        zh: "商业注册、公司设立文件、地址及授权签字人资料。",
      },
      {
        ar: "هيكل الملكية حتى المستفيد الحقيقي وطبيعة النشاط ومصدر الأموال والتعاملات المتوقعة.",
        en: "Ownership chain to the beneficial owner, business purpose, source of funds and expected transactions.",
        zh: "直至实际受益人的股权结构、业务目的、资金来源及预期交易。",
      },
    ],
    insight: {
      ar: "ملف مصرفي واضح يبدأ بتطابق اسم الكيان ونشاطه والملاك والمفوضين بين المستندات. وقد تختلف قواعد الشركة المقيمة عن الشركة الأجنبية غير المقيمة؛ لذلك يُحدد مسار الحساب قبل إرسال الطلب.",
      en: "A clear bank file aligns the entity name, activities, owners and signatories across all documents. Resident companies and non-resident foreign entities may follow different rules, so establish the account route first.",
      zh: "清晰的开户资料须确保各文件中的实体名称、业务、所有人及签字人一致。本地居民公司与非居民外国实体的规则可能不同，应先确认适用开户路径。",
    },
    budget: {
      ar: "اسأل البنك عن الحد الأدنى للرصيد ورسوم الحساب والتحويلات والقنوات الرقمية، وافصلها عن أتعاب تجهيز الملف. اكتمال الأوراق لا يلغي فحص الامتثال أو يضمن قبول الطلب.",
      en: "Ask the bank about minimum balances, account charges, transfers and digital services, separately from document-preparation fees. Complete paperwork does not replace compliance checks or guarantee approval.",
      zh: "向银行核实最低余额、账户、转账及数字服务费用，并与材料准备服务费区分。材料齐全不能替代合规审查，也不保证获得批准。",
    },
    q: {
      ar: "هل يمكن ضمان فتح الحساب عن بُعد؟",
      en: "Can remote account opening be guaranteed?",
      zh: "能否保证远程开户？",
    },
    a: {
      ar: "لا؛ التحقق من المفوضين والحضور أو القنوات الإلكترونية يخضع لنوع الكيان ومتطلبات البنك.",
      en: "No. Signatory verification, attendance and digital options depend on the entity and the bank’s requirements.",
      zh: "不能。签字人核验、到场及线上渠道取决于实体类型和银行要求。",
    },
    references: [
      {
        label: "SAMA · Rules for bank accounts",
        url: "https://rulebook.sama.gov.sa/en/account-opening-rules",
      },
      {
        label: "SAMA · Beneficial owner identification",
        url: "https://rulebook.sama.gov.sa/en/entiresection/3634",
      },
    ],
  },
  "contract-drafting": {
    prepare: [
      {
        ar: "هويات وصفات الأطراف وصلاحيات التوقيع وموضوع التعاقد.",
        en: "Party identities, legal capacity, signing authority and contract purpose.",
        zh: "当事人身份、法律资格、签署权限及合同目的。",
      },
      {
        ar: "نطاق العمل والمقابل والمدة وآلية التسليم والإنهاء والحقوق ذات الحساسية.",
        en: "Scope, consideration, duration, delivery, termination and sensitive rights.",
        zh: "工作范围、对价、期限、交付、终止及重要权利。",
      },
    ],
    insight: {
      ar: "العقد الجيد يوضح من يفعل ماذا، ومتى يُستحق المقابل، وكيف تُدار التغييرات والخلافات. وفي اتفاقيات الشركاء، تستحق صلاحيات الإدارة والقرارات الجوهرية ودخول المستثمرين والتخارج مراجعة مستقلة.",
      en: "A useful contract makes responsibilities, payment triggers, changes and dispute handling clear. Shareholder arrangements also need focused review of management powers, reserved decisions, new investment and exit.",
      zh: "有效的合同应明确责任、付款条件、变更及争议处理。股东安排还应重点审查管理权限、重大决策、新投资及退出机制。",
    },
    budget: {
      ar: "تتأثر الأتعاب بنوع العقد وتعقيده ولغاته ونطاق التفاوض. اتفق على عدد جولات المراجعة وما إذا كانت الترجمة والتوثيق ضمن العرض. تُقدّم المشورة القانونية من مختص مرخّص بعد التحقق من صفته.",
      en: "Fees depend on complexity, languages and negotiation scope. Agree on review rounds and whether translation and authentication are included. Obtain legal advice from an appropriately licensed professional whose status has been verified.",
      zh: "费用取决于复杂程度、语言及谈判范围。应约定审核轮次，以及是否包含翻译和认证。法律意见应由经核实资格的持牌专业人士提供。",
    },
    q: {
      ar: "هل يصلح نموذج عقد عام لكل مشروع؟",
      en: "Is a general template suitable for every project?",
      zh: "通用合同模板是否适合所有项目？",
    },
    a: {
      ar: "يصلح نقطة بداية، لكنه يحتاج تكييفاً مع النشاط والأطراف والالتزامات الفعلية؛ لا يعوض المراجعة القانونية.",
      en: "It can be a starting point, but must fit the activity, parties and actual obligations. It does not replace legal review.",
      zh: "可作为起点，但须结合业务、当事人及实际义务调整，不能替代法律审核。",
    },
    references: [
      {
        label: "Ministry of Justice · Licensed lawyers directory",
        url: "https://www.moj.gov.sa/ar/eServices/Pages/10abd1a2-a4c2-4951-a464-ac926eb24417.aspx",
      },
      {
        label: "Bureau of Experts · Saudi laws",
        url: "https://laws.boe.gov.sa/",
      },
    ],
  },
  "premium-residency": {
    prepare: [
      {
        ar: "تحديد المنتج المناسب وجواز السفر والوضع النظامي والمستندات الشخصية المطلوبة.",
        en: "Relevant residency product, passport, immigration status and required personal records.",
        zh: "适用居留产品、护照、合法居留状态及所需个人材料。",
      },
      {
        ar: "أدلة الاستثمار والملكية والتوظيف أو مستندات الأهلية الخاصة بالمنتج المختار.",
        en: "Investment, ownership and employment evidence, or eligibility documents for the selected product.",
        zh: "投资、股权及雇佣证明，或所选产品要求的资格材料。",
      },
    ],
    insight: {
      ar: "ميّز بين إقامة مستثمر الأعمال والإقامة محددة المدة أو الدائمة بالمقابل المالي. يذكر المركز لمسار مستثمر الأعمال استثماراً لا يقل عن 7 ملايين ريال بحسب حصة المتقدم وإثبات توظيف 10 موظفين، مع شروط المحافظة على الاستثمار والتوظيف خلال أول عامين.",
      en: "Distinguish Business Investor Residency from the paid limited or unlimited-duration products. The investor route lists at least SAR 7 million attributable to the applicant and evidence of 10 employees, with investment and employment maintenance conditions for the first two years.",
      zh: "应区分商业投资者居留与付费的限期或永久居留产品。投资者途径列明申请人份额对应投资至少700万里亚尔、提供10名员工的雇佣证明，并须在前两年维持投资及雇佣条件。",
    },
    budget: {
      ar: "يذكر المركز 4,000 ريال مقابلاً لمنتج مستثمر الأعمال؛ وهو مختلف عن حد الاستثمار، وليس سعراً لشراء الأهلية أو الموافقة. تحقّق من الشروط والرسوم الحالية مباشرة لدى المركز قبل الالتزام.",
      en: "The Center lists SAR 4,000 for the Business Investor product. This is distinct from the investment threshold and does not buy eligibility or approval. Verify current terms and fees directly before committing.",
      zh: "居留中心列示商业投资者产品费用为4,000里亚尔，与最低投资额不同，支付该费用不等于取得资格或批准。作出承诺前请直接核实最新条件及费用。",
    },
    q: {
      ar: "هل مجرد امتلاك شركة يمنح الإقامة المميزة؟",
      en: "Does owning a company automatically grant Premium Residency?",
      zh: "持有公司是否自动获得高级居留？",
    },
    a: {
      ar: "لا؛ لكل منتج شروط مستقلة وقرار يصدر من المركز بعد تقييم الطلب.",
      en: "No. Each product has its own conditions and requires the Center’s decision after assessment.",
      zh: "不会。每种产品均有独立条件，须经居留中心审核决定。",
    },
    references: [
      {
        label: "Premium Residency Center · Investor product",
        url: "https://pr.gov.sa/product-details-investor-residency",
      },
      {
        label: "Premium Residency Center · Product terms",
        url: "https://pr.gov.sa/services-terms",
      },
    ],
  },
  "investment-funds": {
    prepare: [
      {
        ar: "استراتيجية الاستثمار ونوع الأصول وفئة المستثمرين وحجم الصندوق المستهدف.",
        en: "Investment strategy, asset class, investor category and target fund size.",
        zh: "投资策略、资产类别、投资者类别及目标基金规模。",
      },
      {
        ar: "تحديد مدير الصندوق والجهات المرخصة والأطراف المعنية بالحفظ والإدارة والامتثال.",
        en: "Proposed manager, licensed institutions and custody, administration and compliance arrangements.",
        zh: "拟任管理人、持牌机构以及托管、行政管理及合规安排。",
      },
    ],
    insight: {
      ar: "تبدأ الهيكلة بتحديد طبيعة الصندوق وطريقة الطرح، لا بتأسيس شركة عامة ثم جمع الأموال. تختلف المتطلبات بين الصناديق العامة والخاصة وغيرها، وتُراجع التراخيص والصلاحيات مع مؤسسة سوق مالية مرخصة للنشاط المناسب.",
      en: "Structuring begins with fund type and offering route, rather than forming an ordinary company and raising money. Public, private and other funds have different requirements. Confirm licences and permissions with an institution authorised for the relevant activity.",
      zh: "基金架构应从基金类型及发行方式开始，而非成立普通公司后直接募集资金。公募、私募及其他基金要求不同，应与获准开展相关业务的持牌机构核实许可及权限。",
    },
    budget: {
      ar: "تُفصل رسوم التأسيس والهيكلة عن الإدارة والحفظ والتشغيل والتدقيق والالتزامات التنظيمية. ولا يمثل دفع الأتعاب أو إصدار سجل تجاري موافقة على طرح الصندوق أو إدارة أموال الغير.",
      en: "Separate structuring and establishment costs from management, custody, administration, audit and regulatory expenses. Paying fees or obtaining commercial registration does not authorise a fund offering or third-party asset management.",
      zh: "应分别核算架构与设立成本，以及管理、托管、行政、审计和监管费用。支付费用或取得商业注册不代表获准发行基金或管理他人资产。",
    },
    q: {
      ar: "هل التسجيل الاستثماري يغني عن ترخيص هيئة السوق المالية؟",
      en: "Does investment registration replace CMA authorisation?",
      zh: "投资登记能否替代资本市场管理局许可？",
    },
    a: {
      ar: "لا؛ ممارسة الأنشطة المالية المنظمة تتطلب الترخيص أو الإجراء المقرر لها من الهيئة.",
      en: "No. Regulated financial activities require the applicable CMA authorisation or procedure.",
      zh: "不能。开展受监管金融业务须取得适用的资本市场管理局许可或完成规定程序。",
    },
    references: [
      {
        label: "CMA · Investment funds regulations",
        url: "https://cma.gov.sa/en/RulesRegulations/Regulations/Pages/default.aspx",
      },
      {
        label: "CMA · Regulatory FAQs",
        url: "https://cma.gov.sa/en/RulesRegulations/FAQ/Pages/FAQs.aspx",
      },
    ],
  },
};

/**
 * Original editorial decision prompts. These are planning questions, not
 * regulatory requirements or assertions about approval eligibility.
 */
export const decisionPrompts: Record<string, Text[]> = {
  "misa-license": [
    { ar: "هل نشاطك المقترح مصنف بدقة، وهل راجعت إن كان يخضع لموافقة قطاعية إضافية؟", en: "Have you classified the proposed activity accurately and checked whether sector approval is also needed?", zh: "是否准确界定拟开展的业务，并核实是否需要额外行业批准？" },
    { ar: "هل صفة المستثمر وهيكل الملكية والمستندات متسقة مع مسار التقديم المختار؟", en: "Do the investor category, ownership structure and documents match the intended application route?", zh: "投资者类别、股权结构及材料是否符合拟选申请途径？" },
    { ar: "هل ميزانيتك تفصل التسجيل عن التأسيس والتراخيص الأخرى؟", en: "Does your budget separate registration from incorporation and other licences?", zh: "预算是否区分投资登记、公司设立及其他许可费用？" }
  ],
  "company-formation": [
    { ar: "ما الشكل القانوني الأنسب لطبيعة الشركاء والإدارة وخطة النمو؟", en: "Which legal form best fits the shareholders, management and growth plan?", zh: "哪种法律形式最符合股东、管理与增长计划？" },
    { ar: "هل راجعت المتطلبات التي تستمر بعد صدور السجل التجاري؟", en: "Have you identified the obligations that continue after commercial registration?", zh: "是否明确取得商业注册后仍需履行的义务？" },
    { ar: "هل عرض التكلفة يفصل الرسوم الحكومية عن رأس المال والخدمات المهنية؟", en: "Does the quote separate government charges, capital and professional fees?", zh: "报价是否分别列出政府收费、资本金及专业服务费？" }
  ],
  "corporate-banking": [
    { ar: "هل تتطابق أسماء الملاك والمفوّضين ونشاط الشركة في جميع المستندات؟", en: "Are owners, signatories and company activities consistent across documents?", zh: "所有文件中的股东、签字人与业务信息是否一致？" },
    { ar: "هل حددت المستفيد الحقيقي ومصدر الأموال والتعاملات المتوقعة؟", en: "Have you documented beneficial ownership, source of funds and expected transactions?", zh: "是否准备实际受益人、资金来源及预期交易资料？" },
    { ar: "هل تحققت من شروط البنك للحضور والتحقق والرسوم دون افتراض قبول الطلب؟", en: "Have you checked bank-specific attendance, verification and fees without assuming approval?", zh: "是否核实银行的到场、核验及费用要求，而不预设审批结果？" }
  ],
  "contract-drafting": [
    { ar: "هل صلاحيات التوقيع والالتزامات ومواعيد الدفع محددة دون غموض؟", en: "Are signing powers, obligations and payment triggers clearly defined?", zh: "签署权限、义务及付款条件是否明确？" },
    { ar: "كيف سيتعامل العقد مع التغييرات والخلافات والإنهاء؟", en: "How will the contract address changes, disputes and termination?", zh: "合同如何处理变更、争议与终止？" },
    { ar: "هل حددت نطاق المراجعة القانونية والترجمة والتوثيق مع مختص مؤهل؟", en: "Have you agreed on legal review, translation and authentication scope with a qualified professional?", zh: "是否与合格专业人士明确法律审核、翻译与认证范围？" }
  ],
  "premium-residency": [
    { ar: "أي منتج إقامة تنطبق عليه ظروفك، وما المستندات الخاصة به؟", en: "Which residency product fits your circumstances and what evidence does it require?", zh: "哪类居留产品适合您的情况，需要哪些证明？" },
    { ar: "هل فرّقت بين المقابل المالي للمنتج ومتطلبات الاستثمار أو التوظيف؟", en: "Have you distinguished the product fee from investment or employment conditions?", zh: "是否区分产品费用与投资或雇佣条件？" },
    { ar: "هل تحققت من الشروط الحالية لدى المركز قبل الالتزام المالي؟", en: "Have you verified current terms with the Center before committing funds?", zh: "是否在作出财务承诺前向居留中心核实最新条件？" }
  ],
  "investment-funds": [
    { ar: "هل حددت نوع الصندوق وطريقة الطرح وفئة المستثمرين المستهدفين؟", en: "Have you defined the fund type, offering route and target investor category?", zh: "是否明确基金类型、发行方式及目标投资者类别？" },
    { ar: "من الجهة المرخصة التي ستتولى الإدارة، وما مسؤوليات الحفظ والامتثال؟", en: "Which authorised institution will manage the fund, custody and compliance responsibilities?", zh: "哪家持牌机构负责基金管理、托管及合规？" },
    { ar: "هل فصلت تكاليف الهيكلة عن المصروفات التشغيلية والالتزامات التنظيمية؟", en: "Have you separated structuring costs from operating and regulatory expenses?", zh: "是否区分架构成本、运营费用及监管支出？" }
  ]
};
