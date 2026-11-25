// Curated visitor-facing content. Source snapshots reviewed 2026-11-25; official portal requires JS for direct browsing.
// Product-specific links are kept alongside the claims. No AI editorial drafts are used.
type Localized = { ar: string; en: string; zh: string };
type ResidencyProduct = { id: string; name: Localized; fee: number; period: Localized; annual?: boolean; eligibility: Localized; source: string };
export const products: ResidencyProduct[] = [
  {
    "id": "unlimited",
    "name": {
      "ar": "الإقامة غير محددة المدة",
      "en": "Unlimited-duration residency",
      "zh": "无限期居留"
    },
    "fee": 800000,
    "period": {
      "ar": "دائمة",
      "en": "Permanent",
      "zh": "永久"
    },
    "eligibility": {
      "ar": "إثبات القدرة المالية واستيفاء الشروط العامة.",
      "en": "Evidence of financial means and the general eligibility conditions.",
      "zh": "证明财务能力并满足通用资格条件。"
    },
    "source": "https://pr.gov.sa/product-details-limited-unlimited"
  },
  {
    "id": "limited",
    "name": {
      "ar": "الإقامة محددة المدة",
      "en": "Limited-duration residency",
      "zh": "有限期居留"
    },
    "fee": 100000,
    "period": {
      "ar": "من سنة إلى 5 سنوات، قابلة للتجديد",
      "en": "1–5 years, renewable",
      "zh": "1至5年，可续期"
    },
    "annual": true,
    "eligibility": {
      "ar": "إثبات الملاءة المالية؛ المقابل المالي يُحسب لكل سنة.",
      "en": "Demonstrate financial means; the product fee applies per year.",
      "zh": "证明财务能力；产品费用按年计算。"
    },
    "source": "https://pr.gov.sa/product-details-limited-unlimited"
  },
  {
    "id": "investor",
    "name": {
      "ar": "إقامة مستثمر أعمال",
      "en": "Business investor residency",
      "zh": "商业投资者居留"
    },
    "fee": 4000,
    "period": {
      "ar": "دائمة مع شروط أول عامين",
      "en": "Permanent, with conditions during the first two years",
      "zh": "永久居留，前两年须满足附加条件"
    },
    "eligibility": {
      "ar": "استثمار مؤهل لا يقل عن 7 ملايين ريال لحصة المتقدم، مع إثبات الملكية والترخيص الاستثماري واستيفاء شرط التوظيف لعشرة موظفين والمحافظة على الاستثمار والتوظيف وفق ضوابط المركز.",
      "en": "Qualifying investment of at least SAR 7 million attributable to the applicant, ownership and investment licence evidence, and compliance with the ten-employee and investment/employment maintenance conditions.",
      "zh": "申请人所占合资格投资不少于700万沙特里亚尔，提供股权及投资许可证明，并按中心规定满足10名员工及持续投资和雇佣条件。"
    },
    "source": "https://pr.gov.sa/product-details-investor-residency"
  },
  {
    "id": "entrepreneur",
    "name": {
      "ar": "إقامة رائد أعمال",
      "en": "Entrepreneur residency",
      "zh": "创业者居留"
    },
    "fee": 4000,
    "period": {
      "ar": "5 سنوات للفئة الأولى؛ دائمة مشروطة للفئة الثانية",
      "en": "5 years for category 1; conditional permanent residency for category 2",
      "zh": "第一类5年；第二类附条件永久居留"
    },
    "eligibility": {
      "ar": "الفئة الأولى: تمويل استثماري معتمد يبدأ من 400 ألف ريال وحصة لا تقل عن 20%. الفئة الثانية: 15 مليون ريال وحصة لا تقل عن 10%، مع 10 وظائف في السنة الأولى و10 إضافية في الثانية. يشترط المسار الرخصة الريادية وتوصية المستثمر.",
      "en": "Category 1: approved funding from SAR 400,000 and at least 20% ownership. Category 2: SAR 15 million and at least 10% ownership, with ten jobs in year one and ten additional jobs in year two. An entrepreneurial licence and investor recommendation are required.",
      "zh": "第一类：获认可的融资不少于40万里亚尔，持股至少20%。第二类：融资1500万里亚尔，持股至少10%，第一年新增10个岗位，第二年再新增10个。须具备创业许可及投资方推荐。"
    },
    "source": "https://pr.gov.sa/product-details-entrepreneur-residency"
  },
  {
    "id": "property",
    "name": {
      "ar": "إقامة مالك عقار",
      "en": "Real estate owner residency",
      "zh": "房产业主居留"
    },
    "fee": 4000,
    "period": {
      "ar": "مرتبطة باستمرار شروط الملكية أو الانتفاع",
      "en": "Tied to continued property eligibility",
      "zh": "取决于持续满足产权或使用权条件"
    },
    "eligibility": {
      "ar": "عقار سكني قائم مملوك أو بحق انتفاع بقيمة 4 ملايين ريال على الأقل دون رهن، أو وحدة سكنية على الخارطة بالقيمة نفسها من مطور معتمد، مع سداد مليون ريال أو 10% أيهما أعلى، ودون تمويل عقاري أو رهن. راجع شروط انتقال الملكية واستمرارها.",
      "en": "Qualifying existing residential property ownership or usufruct worth at least SAR 4 million without a mortgage, or an off-plan residential unit of that value from an approved developer, with at least SAR 1 million or 10% paid, whichever is higher, and no mortgage financing or pledge. Check ongoing ownership conditions.",
      "zh": "符合条件的现房住宅所有权或用益权价值至少400万里亚尔且无抵押；或向获认可开发商购买同等价值的期房住宅，已支付至少100万里亚尔或房价10%（取较高者），无按揭融资或抵押。请核实产权转移及持续条件。"
    },
    "source": "https://pr.gov.sa/product-details-real-estate-residency"
  },
  {
    "id": "exceptional",
    "name": {
      "ar": "إقامة الكفاءة الاستثنائية",
      "en": "Exceptional competence residency",
      "zh": "杰出人才居留"
    },
    "fee": 4000,
    "period": {
      "ar": "5 سنوات قابلة للتجديد؛ مسار للدائمة بشروط",
      "en": "5 years, renewable; conditional path to permanent residency",
      "zh": "5年，可续期；满足条件可申请永久居留"
    },
    "eligibility": {
      "ar": "تستهدف الباحثين والكفاءات الصحية والعلمية والتنفيذيين. تختلف معايير عقد العمل والأجر والخبرة والمؤهلات والتوصية بحسب المسار؛ تحقق من الحدود التفصيلية الحالية.",
      "en": "For researchers, healthcare and science specialists, and executives. Employment, salary, experience, qualifications and recommendation criteria differ by track; check the current detailed thresholds.",
      "zh": "面向研究人员、医疗和科研专业人士及高管。劳动合同、薪酬、经验、学历及推荐条件因类别而异，请核实现行详细标准。"
    },
    "source": "https://pr.gov.sa/product-details-apply-special-talent"
  },
  {
    "id": "gifted",
    "name": {
      "ar": "إقامة الموهبة",
      "en": "Gifted residency",
      "zh": "文体专才居留"
    },
    "fee": 4000,
    "period": {
      "ar": "5 سنوات قابلة للتجديد؛ مسار للدائمة بشروط",
      "en": "5 years, renewable; conditional path to permanent residency",
      "zh": "5年，可续期；满足条件可申请永久居留"
    },
    "eligibility": {
      "ar": "موهبة أو إنجاز مؤهل في الثقافة أو الرياضة، مع إثبات القدرة المالية وتوصية الجهة المختصة وفق مسار الأهلية.",
      "en": "Qualifying talent or achievement in culture or sport, financial capacity and the relevant authority’s recommendation under the applicable track.",
      "zh": "具备符合条件的文化或体育才能或成就、财务能力及相应主管机构推荐。"
    },
    "source": "https://pr.gov.sa/product-details-gifted-residency"
  }
];
export const benefits = [
  {
    "ar": "الإقامة مع أفراد الأسرة المؤهلين وفق الضوابط.",
    "en": "Residence with eligible family members under the rules.",
    "zh": "符合条件的家庭成员可共同居留。"
  },
  {
    "ar": "الدخول والخروج دون تأشيرة لحامل الإقامة وأفراد الأسرة المشمولين.",
    "en": "Visa-free exit and re-entry for the holder and covered family members.",
    "zh": "持有人及符合条件的家庭成员出入境无需签证。"
  },
  {
    "ar": "العمل في القطاع الخاص مع مراعاة المهن المقصورة على السعوديين.",
    "en": "Private-sector employment, subject to occupations reserved for Saudis.",
    "zh": "可在私营部门工作，但须遵守仅限沙特公民从事的职业规定。"
  },
  {
    "ar": "ممارسة الأعمال وتملك العقار أو الانتفاع به ضمن الأنظمة والقيود المطبقة.",
    "en": "Business and property rights subject to applicable laws and restrictions.",
    "zh": "依照相关法律及限制开展商业活动、持有或使用房产。"
  },
  {
    "ar": "الإعفاء من المقابل المالي المقرر على الوافدين والمرافقين وفق النظام.",
    "en": "Exemption from the prescribed expatriate and dependent levies under the rules.",
    "zh": "按规定免缴相关外籍人员及随行家属费用。"
  }
];
export const documents = [
  {
    "ar": "جوازات سارية للمتقدم وأفراد الأسرة المشمولين، وإثبات القدرة المالية.",
    "en": "Valid passports for the applicant and covered family members, and financial evidence.",
    "zh": "申请人及随行家属的有效护照、财务能力证明。"
  },
  {
    "ar": "سجل جنائي وتقرير صحي معتمد وفق متطلبات المركز، وإثبات الإقامة النظامية عند التقديم من داخل المملكة.",
    "en": "Criminal record and approved medical report, plus lawful residency evidence when applying from within Saudi Arabia.",
    "zh": "按中心要求提供无犯罪记录及获认可的体检报告；在沙特境内申请时提供合法居留证明。"
  },
  {
    "ar": "مستندات خاصة بالمنتج: إثبات الاستثمار أو الملكية أو التمويل أو العمل أو الموهبة بحسب الحالة.",
    "en": "Product-specific evidence: investment, property, funding, employment or talent records as applicable.",
    "zh": "产品专属材料：按情况提供投资、房产、融资、就业或才能证明。"
  },
  {
    "ar": "استكمال التأمين الطبي المطلوب عند الموافقة؛ راجع صلاحية الوثائق والصيغ المقبولة قبل التقديم.",
    "en": "Complete required health insurance upon approval; check document validity and accepted formats before applying.",
    "zh": "获批后办理规定的医疗保险；申请前核实文件有效期及格式。"
  }
];
export const steps = [
  {
    "ar": "اختيار المنتج ومراجعة شروطه الرسمية.",
    "en": "Select the product and check its official criteria.",
    "zh": "选择产品并核对官方资格条件。"
  },
  {
    "ar": "إنشاء حساب في منصة المركز وتعبئة الطلب وإرفاق الوثائق وسداد رسوم المعالجة المطبقة.",
    "en": "Create a portal account, complete the form, attach evidence and pay any applicable processing fee.",
    "zh": "在中心平台创建账户、填写申请、上传证明并缴纳适用的申请处理费。"
  },
  {
    "ar": "متابعة الطلب والإجابة عن طلبات الاستيضاح أو المستندات الإضافية.",
    "en": "Track the application and respond to clarification or additional-document requests.",
    "zh": "跟踪申请进度并回复补充说明或材料要求。"
  },
  {
    "ar": "بعد الموافقة، استكمال المقابل المالي والتأمين والمتطلبات النهائية لإصدار الإقامة.",
    "en": "After approval, complete product payment, insurance and remaining issuance requirements.",
    "zh": "获批后缴纳产品费用、办理保险及完成签发要求。"
  }
];
export const faqs = [
  {
    "q": {
      "ar": "هل تأسيس شركة يمنحني الإقامة المميزة تلقائيًا؟",
      "en": "Does company formation automatically grant Premium Residency?",
      "zh": "设立公司是否自动获得高级居留？"
    },
    "a": {
      "ar": "لا. لكل منتج شروطه المستقلة، والقرار يعود لمركز الإقامة المميزة.",
      "en": "No. Each product has separate eligibility criteria, and the Center makes the decision.",
      "zh": "不会。各产品有独立资格条件，最终由高级居留中心决定。"
    }
  },
  {
    "q": {
      "ar": "هل 4,000 ريال تشمل الاستثمار أو شراء العقار؟",
      "en": "Does the SAR 4,000 fee include investment or property costs?",
      "zh": "4000里亚尔是否包含投资或购房成本？"
    },
    "a": {
      "ar": "لا. هذا مقابل المنتج لبعض المسارات، وليس رأس المال أو قيمة العقار أو أتعاب الاستشارة أو رسوم المعالجة والتأمين.",
      "en": "No. It is the product fee for certain routes, not investment capital, property value, advisory fees, processing fees or insurance.",
      "zh": "不包含。该金额是部分产品的费用，不包括投资本金、房产价值、咨询费、申请处理费或保险。"
    }
  },
  {
    "q": {
      "ar": "هل يمكن التقديم من خارج السعودية؟",
      "en": "Can I apply from outside Saudi Arabia?",
      "zh": "可以在沙特境外申请吗？"
    },
    "a": {
      "ar": "نعم، من خلال المنصة الرسمية وفق شروط المنتج؛ ويُطلب إثبات الإقامة النظامية عند التقديم من داخل المملكة.",
      "en": "Yes, via the official portal subject to the product criteria; applicants within Saudi Arabia must demonstrate lawful residency.",
      "zh": "可以通过官方平台按产品条件申请；在沙特境内申请须证明合法居留。"
    }
  },
  {
    "q": {
      "ar": "هل تشمل الإقامة أفراد الأسرة؟",
      "en": "Can family members be covered?",
      "zh": "家属能否获得居留？"
    },
    "a": {
      "ar": "يمكن شمول أفراد الأسرة المؤهلين وفق تعريف الأسرة والضوابط الرسمية، بما فيها شروط الإعالة والعمر والعمل للوالدين.",
      "en": "Eligible family members may be covered under the official family definition and conditions, including dependency, age and parental employment restrictions.",
      "zh": "符合官方家庭定义及条件的家属可以纳入，包括受抚养、年龄及父母就业限制。"
    }
  },
  {
    "q": {
      "ar": "هل الإقامة المميزة تمنح الجنسية السعودية؟",
      "en": "Does Premium Residency grant Saudi citizenship?",
      "zh": "高级居留是否授予沙特国籍？"
    },
    "a": {
      "ar": "لا، الإقامة والجنسية وضعان قانونيان مختلفان، ولا تعني الإقامة الحصول على الجنسية تلقائيًا.",
      "en": "No. Residency and citizenship are distinct legal statuses; residence does not automatically confer citizenship.",
      "zh": "不会。居留与国籍是不同的法律身份，获得居留不意味着自动获得国籍。"
    }
  },
  {
    "q": {
      "ar": "هل تضمنون قبول طلبي؟",
      "en": "Do you guarantee approval?",
      "zh": "是否保证申请获批？"
    },
    "a": {
      "ar": "لا. يمكن مناقشة احتياجك ونطاق الدعم قبل التعاقد؛ الموافقة من اختصاص المركز.",
      "en": "No. We can discuss your needs and the scope of support before engagement; approval rests with the Center.",
      "zh": "不保证。可在签约前讨论您的需求及支持范围，审批由中心负责。"
    }
  }
];
export const labels = {
  "title": {
    "ar": "الإقامة المميزة في السعودية",
    "en": "Premium Residency in Saudi Arabia",
    "zh": "沙特高级居留"
  },
  "lead": {
    "ar": "قارن منتجات الإقامة المميزة السبعة وشروطها ومددها ورسومها، واختر المسار المناسب قبل التقديم إلى مركز الإقامة المميزة.",
    "en": "Compare seven Premium Residency products, eligibility, duration and fees before applying to the Premium Residency Center.",
    "zh": "比较七种高级居留产品的资格条件、期限及费用，选择适合您的申请路径。"
  },
  "seoTitle": {
    "ar": "الإقامة المميزة في السعودية | الأنواع والشروط والرسوم",
    "en": "Saudi Premium Residency | Types, Requirements and Fees",
    "zh": "沙特高级居留｜类型、条件与费用"
  },
  "products": {
    "ar": "أنواع الإقامة المميزة",
    "en": "Premium Residency products",
    "zh": "高级居留产品"
  },
  "comparison": {
    "ar": "مقارنة الرسوم ومدد الإقامة",
    "en": "Fees and duration comparison",
    "zh": "费用与期限对比"
  },
  "fee": {
    "ar": "المقابل المالي للمنتج",
    "en": "Official product fee",
    "zh": "官方产品费用"
  },
  "duration": {
    "ar": "مدة الإقامة",
    "en": "Duration",
    "zh": "居留期限"
  },
  "eligibility": {
    "ar": "أبرز شروط الأهلية",
    "en": "Key eligibility criteria",
    "zh": "主要资格条件"
  },
  "annual": {
    "ar": "لكل سنة",
    "en": "per year",
    "zh": "每年"
  },
  "sar": {
    "ar": "ريال سعودي",
    "en": "SAR",
    "zh": "沙特里亚尔"
  },
  "source": {
    "ar": "تفاصيل المنتج الرسمية",
    "en": "Official product details",
    "zh": "官方产品详情"
  },
  "feeNote": {
    "ar": "المبالغ هي المقابل المالي للمنتج المنشور من المركز، وليست تكلفة شاملة. لا تشمل رأس المال أو العقار أو رسوم معالجة الطلب أو التأمين أو أتعاب الخدمات المهنية. قد تتغير الشروط والرسوم؛ راجع المركز قبل الالتزام.",
    "en": "Amounts are the Center's listed product fees, not all-inclusive costs. Investment, property, application processing, insurance and professional fees are separate. Confirm current criteria and fees with the Center before committing.",
    "zh": "金额为中心公布的产品费用，并非总成本。投资、房产、申请处理、保险及专业服务费用另计。承诺支出前请向中心核实最新条件及费用。"
  },
  "benefits": {
    "ar": "مزايا الإقامة المميزة",
    "en": "Premium Residency benefits",
    "zh": "高级居留权益"
  },
  "documents": {
    "ar": "الشروط العامة والمستندات",
    "en": "General requirements and documents",
    "zh": "通用条件及申请材料"
  },
  "steps": {
    "ar": "خطوات التقديم",
    "en": "Application steps",
    "zh": "申请流程"
  },
  "support": {
    "ar": "كيف نساعدك؟",
    "en": "How can we help?",
    "zh": "我们如何协助您？"
  },
  "supportBody": {
    "ar": "تواصل معنا لمناقشة المنتج الأنسب لحالتك، ومراجعة جاهزية المستندات وتحديد نطاق الدعم الاستشاري الممكن قبل الاتفاق. تُحدد أتعاب أي خدمة مهنية بصورة منفصلة، ولا نمثل مركز الإقامة المميزة ولا نضمن الموافقة.",
    "en": "Contact us to discuss the appropriate product, document readiness and possible advisory support before agreeing on an engagement. Any professional fee is separate. We are not the Premium Residency Center and do not guarantee approval.",
    "zh": "联系我们讨论适合您的产品、材料准备情况及可提供的咨询支持，签约前确认服务范围。专业服务费另计。我们并非高级居留中心，也不保证审批通过。"
  },
  "cta": {
    "ar": "استفسر عن أهليتك",
    "en": "Discuss your eligibility",
    "zh": "咨询您的资格"
  },
  "apply": {
    "ar": "التقديم عبر المركز الرسمي",
    "en": "Apply via the official Center",
    "zh": "通过官方中心申请"
  },
  "faq": {
    "ar": "الأسئلة الشائعة",
    "en": "Frequently asked questions",
    "zh": "常见问题"
  },
  "refs": {
    "ar": "المصادر الحكومية الرسمية",
    "en": "Official government sources",
    "zh": "政府官方来源"
  },
  "notice": {
    "ar": "هذا ملخص إرشادي، وليس قائمة أهلية كاملة أو قرار موافقة. استندت المعلومات إلى النسخ المتاحة من صفحات المركز؛ يجب الرجوع إلى الشروط الحالية قبل التقديم.",
    "en": "This is a planning overview, not a complete eligibility assessment or approval decision. It draws on available copies of the Center's pages; check current official criteria before applying.",
    "zh": "本页为准备申请的概览，并非完整资格评估或审批决定。内容依据可获取的官方页面版本；申请前请核对现行标准。"
  }
};
export const sources = [
  {
    "title": {
      "ar": "نظام الإقامة المميزة",
      "en": "Premium Residency Law",
      "zh": "高级居留法"
    },
    "url": "https://pr.gov.sa/premium-residency-law"
  },
  {
    "title": {
      "ar": "اللائحة التنفيذية",
      "en": "Implementing regulations",
      "zh": "实施条例"
    },
    "url": "https://pr.gov.sa/premium-residency-regulations"
  },
  {
    "title": {
      "ar": "الشروط والضوابط التفصيلية",
      "en": "Detailed eligibility terms",
      "zh": "详细资格条件"
    },
    "url": "https://pr.gov.sa/services-terms"
  },
  {
    "title": {
      "ar": "المزايا العامة",
      "en": "General benefits",
      "zh": "通用权益"
    },
    "url": "https://pr.gov.sa/benefits"
  },
  {
    "title": {
      "ar": "الأسئلة الشائعة الرسمية",
      "en": "Official FAQs",
      "zh": "官方常见问题"
    },
    "url": "https://pr.gov.sa/faq"
  },
  {
    "title": {
      "ar": "اختيار المنتج والتقديم",
      "en": "Product selection and application",
      "zh": "产品选择与申请"
    },
    "url": "https://pr.gov.sa/Select-products"
  }
];
