export type PackageLocale = "ar" | "en" | "zh";
export type PackageGroupId = "services" | "trading" | "professional";
export type Trilingual = Record<PackageLocale, string>;
export interface PackageGroup { id: PackageGroupId; title: Trilingual; description: Trilingual }
export interface PackageOffer {
  slug: string; group: PackageGroupId; id: string; price: number; previousPrice: number;
  title: Trilingual; audience: Trilingual; pitch: Trilingual; features: Trilingual[];
  requirements: Trilingual; exclusions: Trilingual; installments: number;
}
export const packageUpdatedAt = "2026-11-15";
export const packageGroups: PackageGroup[] = [
  {
    "id": "services",
    "title": {
      "ar": "خدمات الاستثمار والتأسيس",
      "en": "Service investment & formation",
      "zh": "服务类投资与设立"
    },
    "description": {
      "ar": "مسار يبدأ من صفة المستثمر ووثائق الملكية وينتهي بخطة واضحة للتسجيل والالتزامات اللاحقة.",
      "en": "Choose based on your investor status and ownership records, then plan the registration and next obligations.",
      "zh": "按投资者身份和股权资料选择路径，明确登记流程与后续义务。"
    }
  },
  {
    "id": "trading",
    "title": {
      "ar": "الاستثمار التجاري",
      "en": "Trading investment",
      "zh": "贸易类投资"
    },
    "description": {
      "ar": "لأنشطة التجارة والاستيراد والجملة بحسب متطلبات النشاط وقيود الملكية والتراخيص.",
      "en": "For trading, wholesale and import activities, subject to activity-specific ownership and licensing rules.",
      "zh": "适用于贸易、批发及进口业务，须符合具体行业和所有权要求。"
    }
  },
  {
    "id": "professional",
    "title": {
      "ar": "الأنشطة المهنية",
      "en": "Professional activities",
      "zh": "专业服务活动"
    },
    "description": {
      "ar": "للأنشطة التي تتطلب مراجعة المؤهلات والاعتمادات والموافقات القطاعية قبل التأسيس أو التوسع.",
      "en": "For regulated professions where qualifications and sector approvals must be checked before formation or expansion.",
      "zh": "适用于设立或拓展前须核查资质和行业审批的专业活动。"
    }
  }
];
export const packageOffers: PackageOffer[] = [
  {
    "slug": "services-gcc",
    "group": "services",
    "id": "gcc",
    "price": 18000,
    "previousPrice": 19000,
    "title": {
      "ar": "تأسيس مشروع لمستثمر خليجي",
      "en": "GCC investor formation",
      "zh": "海合会投资者设立企业"
    },
    "audience": {
      "ar": "تملك جنسية إحدى دول مجلس التعاون وتريد معرفة المسار النظامي الموافق لنشاطك.",
      "en": "You are a GCC national choosing an appropriate formation route.",
      "zh": "您是海合会公民，希望确认适合业务的设立路径。"
    },
    "pitch": {
      "ar": "ابدأ بصفتك النظامية، لا بنموذج تأسيس عام. نرتب لك قرارات النشاط والكيان قبل تقديم المستندات.",
      "en": "Start with investor status rather than a generic filing template. Map the entity and activity first.",
      "zh": "从投资者身份入手，先确定实体及业务，再准备申报资料。"
    },
    "features": [
      {
        "ar": "مراجعة صفة المستثمر والنشاط",
        "en": "Investor status and activity review",
        "zh": "投资者身份及业务核查"
      },
      {
        "ar": "تحديد نوع المنشأة والمستندات",
        "en": "Entity type and documents checklist",
        "zh": "确定实体类型及材料"
      },
      {
        "ar": "خارطة إجراءات التسجيل والمتابعة",
        "en": "Registration steps and follow-up map",
        "zh": "登记及后续流程清单"
      }
    ],
    "requirements": {
      "ar": "هوية المستثمر، النشاط المقترح وبيانات الشركاء.",
      "en": "Investor identity, intended activity and shareholder details.",
      "zh": "投资者身份证明、拟开展业务及股东资料。"
    },
    "exclusions": {
      "ar": "الرسوم الرسمية والتراخيص القطاعية والإقامة غير مشمولة.",
      "en": "Authority fees, sector licences and residency are excluded.",
      "zh": "不含政府费用、行业许可及居留手续。"
    },
    "installments": 2
  },
  {
    "slug": "services-premium",
    "group": "services",
    "id": "premium",
    "price": 21000,
    "previousPrice": 22000,
    "title": {
      "ar": "تأسيس لحامل الإقامة المميزة",
      "en": "Premium Residency holder route",
      "zh": "高级居留持有人设立企业"
    },
    "audience": {
      "ar": "تحمل إقامة مميزة وتريد فصل امتيازات الإقامة عن متطلبات تأسيس الكيان.",
      "en": "You hold Saudi Premium Residency and need a formation route appropriate to your status.",
      "zh": "您持有沙特高级居留，需核实适用的企业设立条件。"
    },
    "pitch": {
      "ar": "الإقامة ليست ترخيص نشاط تلقائيًا؛ نحدد المستندات والموافقات التي تنطبق على نموذج عملك.",
      "en": "Residency status is not an automatic activity licence. Identify the separate approvals your business may need.",
      "zh": "居留身份并不自动取得经营许可；应核实行业许可及文件要求。"
    },
    "features": [
      {
        "ar": "تحليل الأهلية بحسب نوع الإقامة",
        "en": "Status-specific eligibility review",
        "zh": "按居留类别核查资格"
      },
      {
        "ar": "إعداد قائمة متطلبات النشاط والتأسيس",
        "en": "Activity and incorporation checklist",
        "zh": "业务与设立材料清单"
      },
      {
        "ar": "تنسيق الخطوات الرسمية اللاحقة",
        "en": "Coordinated next-stage filings",
        "zh": "协调后续申报步骤"
      }
    ],
    "requirements": {
      "ar": "تفاصيل منتج الإقامة، الهوية، النشاط والشركاء.",
      "en": "Residency product details, ID, activity and ownership.",
      "zh": "居留类别、身份证明、业务和股权资料。"
    },
    "exclusions": {
      "ar": "رسوم الإقامة وأي تجديد أو موافقات إضافية خارج هذه الباقة.",
      "en": "Residency fees, renewals and additional approvals are not included.",
      "zh": "不含居留费用、续期及其他审批费用。"
    },
    "installments": 2
  },
  {
    "slug": "services-branch",
    "group": "services",
    "id": "branch",
    "price": 28000,
    "previousPrice": 29000,
    "title": {
      "ar": "تسجيل فرع لشركة أجنبية قائمة",
      "en": "Existing foreign company branch",
      "zh": "现有外国公司设立分支机构"
    },
    "audience": {
      "ar": "تملك شركة مسجلة خارج السعودية ولديك سجلات يمكن التحقق من صلاحيتها.",
      "en": "You have a registered company outside Saudi Arabia with verifiable corporate records.",
      "zh": "您在沙特境外拥有已注册公司及可核验的公司资料。"
    },
    "pitch": {
      "ar": "مسار مبني على مستندات الشركة الفعلية: من مراجعة التصديقات إلى تسجيل الفرع وترتيب الالتزامات.",
      "en": "A document-led branch route: review attestations, plan filings, then prepare post-registration obligations.",
      "zh": "以现有公司资料为基础，核查认证文件、规划登记及后续义务。"
    },
    "features": [
      {
        "ar": "مراجعة وثائق الشركة الأجنبية والتصديقات",
        "en": "Foreign company records and attestations review",
        "zh": "外国公司文件及认证核查"
      },
      {
        "ar": "تحضير ملف التسجيل الاستثماري بحسب النشاط",
        "en": "Activity-specific investment registration pack",
        "zh": "按业务类型准备投资登记文件"
      },
      {
        "ar": "ترتيب خطوات السجل والجهات المرتبطة",
        "en": "Commercial registration and related authority plan",
        "zh": "商业注册及关联机构办理计划"
      }
    ],
    "requirements": {
      "ar": "السجل الأجنبي والبيانات المالية والهيكل المالك والنشاط.",
      "en": "Foreign registration, financial records, ownership chain and activity.",
      "zh": "境外登记、财务资料、股权结构及拟开展业务。"
    },
    "exclusions": {
      "ar": "التصديقات الخارجية والترجمة والرسوم الحكومية تُحدد منفصلة.",
      "en": "Foreign attestations, translation and government charges are separate.",
      "zh": "境外认证、翻译及政府费用另计。"
    },
    "installments": 2
  },
  {
    "slug": "services-scratch",
    "group": "services",
    "id": "scratch",
    "price": 48000,
    "previousPrice": 49000,
    "title": {
      "ar": "تخطيط تأسيس كيان جديد من البداية",
      "en": "New entity planning & setup",
      "zh": "从零规划新实体"
    },
    "audience": {
      "ar": "تبدأ من الصفر وتحتاج تقييم بنية التملك والأهلية قبل اختيار مسار التنفيذ.",
      "en": "You are starting without an established structure and need to assess viable ownership routes.",
      "zh": "您尚无既定结构，需要先评估股权路径与适用资格。"
    },
    "pitch": {
      "ar": "لا نختصر الرحلة بوعد جاهز؛ نبدأ بدراسة الهيكل المطلوب ثم نحدد ما يجب إنشاؤه وما يُقدّم للجهات.",
      "en": "No one-size-fits-all shortcut. We assess the structure before confirming the filing route.",
      "zh": "不承诺统一捷径；先评估适用结构，再确定申报路径。"
    },
    "features": [
      {
        "ar": "جلسة لتحديد هيكل الملكية الملائم",
        "en": "Ownership-structure planning session",
        "zh": "股权结构规划咨询"
      },
      {
        "ar": "فحص الأهلية والمسارات البديلة المسموحة",
        "en": "Eligibility and lawful route assessment",
        "zh": "资格与合规可选路径评估"
      },
      {
        "ar": "خطة وثائق وتسجيل متدرجة",
        "en": "Phased documentation and registration plan",
        "zh": "分阶段文件与登记计划"
      }
    ],
    "requirements": {
      "ar": "جنسيات الملاك، النشاط، الشركة الحالية إن وجدت والميزانية.",
      "en": "Owner nationalities, activity, current entities if any and budget.",
      "zh": "投资者国籍、业务、现有实体及预算。"
    },
    "exclusions": {
      "ar": "شراء شركة خارجية أو أي خدمات طرف ثالث ليست ضمن السعر ما لم ينص عرض مستقل.",
      "en": "Foreign company acquisition and third-party services require a separate written scope.",
      "zh": "境外公司收购及第三方服务须另行签署书面范围。"
    },
    "installments": 3
  },
  {
    "slug": "trading-ready",
    "group": "trading",
    "id": "ready",
    "price": 38000,
    "previousPrice": 39000,
    "title": {
      "ar": "تسجيل نشاط تجاري لشركة قائمة",
      "en": "Trading registration for existing company",
      "zh": "现有企业的贸易登记"
    },
    "audience": {
      "ar": "لديك شركة أجنبية وتريد تقييم أهليتها للتجارة أو الاستيراد في السعودية.",
      "en": "You already operate a foreign company and need a Saudi trading-activity assessment.",
      "zh": "您已有境外公司，需要评估在沙特经营贸易业务的资格。"
    },
    "pitch": {
      "ar": "نراجع نشاطك وسجلك قبل المضي في الترخيص؛ فقد تختلف شروط النشاط التجاري عن الخدمات.",
      "en": "We review your trading activity and corporate file first, since commercial conditions differ from services.",
      "zh": "先审查业务和公司记录，因为贸易与服务活动条件可能不同。"
    },
    "features": [
      {
        "ar": "تصنيف الأنشطة التجارية المقترحة",
        "en": "Proposed trading activity classification",
        "zh": "拟开展贸易业务分类"
      },
      {
        "ar": "مراجعة الملكية والسجلات المطلوبة",
        "en": "Ownership and foreign records review",
        "zh": "股权及境外资料核查"
      },
      {
        "ar": "قائمة التصاريح والجهات المتصلة",
        "en": "Permits and regulator checklist",
        "zh": "许可及监管机构清单"
      }
    ],
    "requirements": {
      "ar": "الأنشطة المطلوبة والسجل الأجنبي وسلسلة الملكية.",
      "en": "Proposed activities, foreign registration and ownership chain.",
      "zh": "拟开展业务、境外登记和股权结构。"
    },
    "exclusions": {
      "ar": "لا يشمل تراخيص الاستيراد القطاعية أو الجمارك أو الرسوم الحكومية.",
      "en": "Sector import licences, customs and official charges are excluded.",
      "zh": "不含行业进口许可、海关及政府费用。"
    },
    "installments": 2
  },
  {
    "slug": "trading-add",
    "group": "trading",
    "id": "add",
    "price": 58000,
    "previousPrice": 59000,
    "title": {
      "ar": "توسيع الأنشطة التجارية لشركة قائمة",
      "en": "Expand existing trading activities",
      "zh": "拓展现有贸易活动"
    },
    "audience": {
      "ar": "تمارس نشاطًا قائمًا وترغب في إضافة أنشطة أو تعديل نطاق النشاط في السعودية.",
      "en": "You have an existing operation and plan to add or modify trading activities.",
      "zh": "您已有运营实体，计划增加或调整贸易业务。"
    },
    "pitch": {
      "ar": "التوسع الصحيح يبدأ بمقارنة النشاط الحالي بالمطلوب، وليس بإضافة نشاط دون التحقق من الترخيص.",
      "en": "Expansion starts by comparing current and intended activities—not by assuming an activity can simply be added.",
      "zh": "先对比现有与拟新增业务，再核实许可变更条件。"
    },
    "features": [
      {
        "ar": "مراجعة التراخيص والأنشطة الحالية",
        "en": "Current licence and activity review",
        "zh": "现有许可及业务审核"
      },
      {
        "ar": "تحليل متطلبات إضافة النشاط",
        "en": "Activity amendment requirements assessment",
        "zh": "新增业务要求评估"
      },
      {
        "ar": "تنسيق ملف التعديل والمتابعة",
        "en": "Amendment file and follow-up plan",
        "zh": "变更申报及跟进计划"
      }
    ],
    "requirements": {
      "ar": "نسخ التراخيص الحالية والنشاط الإضافي والملاك.",
      "en": "Existing licences, new activity and ownership details.",
      "zh": "现有许可、拟新增业务及股权资料。"
    },
    "exclusions": {
      "ar": "أي تصاريح استثنائية أو رسوم أو تجهيزات تشغيل تُسعّر منفصلة.",
      "en": "Exceptional permits, official fees and operational setup are separate.",
      "zh": "特殊许可、政府费用及运营筹备另计。"
    },
    "installments": 3
  },
  {
    "slug": "trading-scratch",
    "group": "trading",
    "id": "scratch",
    "price": 78000,
    "previousPrice": 79000,
    "title": {
      "ar": "تأسيس مشروع تجاري جديد شامل التخطيط",
      "en": "New trading company: end-to-end planning",
      "zh": "全新贸易企业：全程规划"
    },
    "audience": {
      "ar": "تريد تأسيس تجارة جديدة وتتطلب حالتك إعداد هيكل ومتطلبات متكاملة.",
      "en": "You are establishing a new trading operation that needs an integrated filing plan.",
      "zh": "您准备设立全新贸易业务，需要完整的合规及申报方案。"
    },
    "pitch": {
      "ar": "نحوّل قرار الاستثمار إلى خطوات قابلة للتنفيذ: أهلية، كيان، نشاط، تسجيل، ثم متطلبات التشغيل.",
      "en": "Turn the investment decision into sequenced steps: eligibility, entity, activity, registration and operations.",
      "zh": "将投资决策转为分步路径：资格、实体、业务、登记及运营。"
    },
    "features": [
      {
        "ar": "خطة ملكية ونشاط تجاري بحسب الأهلية",
        "en": "Eligibility-based ownership and activity plan",
        "zh": "按资格制定股权与贸易业务方案"
      },
      {
        "ar": "تحضير متطلبات التسجيل والتراخيص",
        "en": "Registration and licence requirements pack",
        "zh": "登记与许可材料清单"
      },
      {
        "ar": "جدول تنفيذي للجهات والخطوات التشغيلية",
        "en": "Regulator and operational milestones roadmap",
        "zh": "主管机构及运营节点路线图"
      }
    ],
    "requirements": {
      "ar": "هيكل الملكية والنشاط وسجل أي شركة أجنبية وبيانات رأس المال.",
      "en": "Ownership structure, activities, foreign records if any and capital information.",
      "zh": "股权结构、业务、境外资料及资本信息。"
    },
    "exclusions": {
      "ar": "رأس المال المطلوب والرسوم الرسمية والخدمات الخارجية غير مشمولة.",
      "en": "Required capital, official fees and outsourced services are excluded.",
      "zh": "不含所需资本金、政府费用及外包服务。"
    },
    "installments": 3
  },
  {
    "slug": "professional-ready",
    "group": "professional",
    "id": "ready",
    "price": 38000,
    "previousPrice": 39000,
    "title": {
      "ar": "مكتب مهني قائم يدخل السوق السعودي",
      "en": "Existing professional firm entry",
      "zh": "现有专业机构进入沙特"
    },
    "audience": {
      "ar": "تملك مكتبًا مهنيًا مرخصًا خارج السعودية وترغب في تقييم متطلبات المملكة.",
      "en": "You operate a licensed professional practice abroad and need Saudi entry requirements.",
      "zh": "您在境外经营持牌专业机构，需了解进入沙特的要求。"
    },
    "pitch": {
      "ar": "قبل التأسيس، نراجع التخصص والمزاولة والاعتراف بالمؤهلات والجهة المنظمة.",
      "en": "Before filing, check practice rights, credentials and the relevant regulator.",
      "zh": "申报前先核查执业资格、专业资质及主管机构。"
    },
    "features": [
      {
        "ar": "تحديد الجهة المنظمة للتخصص",
        "en": "Identify profession-specific regulator",
        "zh": "确定专业主管机构"
      },
      {
        "ar": "قائمة اعتماد المؤهلات والمستندات",
        "en": "Credentials and document checklist",
        "zh": "资格认证及文件清单"
      },
      {
        "ar": "خطة التأسيس وفق ضوابط المهنة",
        "en": "Profession-specific formation roadmap",
        "zh": "符合行业规定的设立路线图"
      }
    ],
    "requirements": {
      "ar": "التراخيص المهنية والسجل الأجنبي وبيانات الشركاء.",
      "en": "Professional licences, foreign registration and owners.",
      "zh": "专业许可证、境外登记及股东资料。"
    },
    "exclusions": {
      "ar": "رسوم الترخيص المهني والعضويات والاختبارات الخارجية غير مشمولة.",
      "en": "Professional licensing, memberships and examinations are excluded.",
      "zh": "不含专业许可、会员费及考试费用。"
    },
    "installments": 2
  },
  {
    "slug": "professional-add",
    "group": "professional",
    "id": "add",
    "price": 58000,
    "previousPrice": 59000,
    "title": {
      "ar": "توسيع نطاق مكتب أو نشاط مهني",
      "en": "Professional practice expansion",
      "zh": "拓展专业服务业务"
    },
    "audience": {
      "ar": "ترغب في إضافة خدمة مهنية أو شريك أو تغيير هيكل منشأة قائمة.",
      "en": "You plan to add a professional service, partner or change an existing practice.",
      "zh": "您计划增加专业服务、合伙人或调整现有机构结构。"
    },
    "pitch": {
      "ar": "نبدأ بتحديد أثر التغيير على الترخيص المهني قبل تعديل السجل أو نطاق الممارسة.",
      "en": "We check the licensing impact of change before amending registrations or scope.",
      "zh": "先评估业务变化对专业许可的影响，再办理登记变更。"
    },
    "features": [
      {
        "ar": "تدقيق نطاق الممارسة الحالي",
        "en": "Audit current practice scope",
        "zh": "核查现有执业范围"
      },
      {
        "ar": "تحليل موافقات التوسع أو الشراكة",
        "en": "Expansion and partnership approvals review",
        "zh": "扩展与合伙审批评估"
      },
      {
        "ar": "تنسيق مستندات وتتابع التعديل",
        "en": "Amendment documentation plan",
        "zh": "变更文件与办理计划"
      }
    ],
    "requirements": {
      "ar": "الترخيص الحالي والخدمة الجديدة وهيكل الشركاء.",
      "en": "Existing licence, proposed new service and partner structure.",
      "zh": "现有许可、新服务及合伙人结构。"
    },
    "exclusions": {
      "ar": "أي اعتماد مهني جديد ورسوم الجهات وتكاليف الاختبارات خارج الباقة.",
      "en": "New accreditations, authority fees and exam costs are excluded.",
      "zh": "不含新增资格认证、政府费用或考试费用。"
    },
    "installments": 3
  },
  {
    "slug": "professional-scratch",
    "group": "professional",
    "id": "scratch",
    "price": 88000,
    "previousPrice": 89000,
    "title": {
      "ar": "تأسيس ممارسة مهنية جديدة من الصفر",
      "en": "New regulated professional practice",
      "zh": "从零设立受监管专业机构"
    },
    "audience": {
      "ar": "تؤسس نشاطًا مهنيًا جديدًا يتطلب توافقًا بين الكيان والمزاولة والاعتمادات.",
      "en": "You are starting a regulated practice that must align entity, licensing and qualifications.",
      "zh": "您计划新设受监管专业机构，须协调实体、许可与执业资质。"
    },
    "pitch": {
      "ar": "نضع مسارًا يراعي التسلسل الصحيح للموافقات، من مؤهلات الأفراد إلى التأسيس والتشغيل.",
      "en": "Plan the correct sequence of approvals, from individual credentials to company formation.",
      "zh": "按正确顺序规划审批：个人资质、公司设立及运营许可。"
    },
    "features": [
      {
        "ar": "خطة أهلية وملكية للممارسة المهنية",
        "en": "Practice eligibility and ownership plan",
        "zh": "专业业务资格与股权方案"
      },
      {
        "ar": "مراجعة ملفات الاعتماد والترخيص",
        "en": "Accreditation and licensing dossier review",
        "zh": "资质认证与许可资料审核"
      },
      {
        "ar": "خارطة متطلبات التشغيل والامتثال",
        "en": "Operational and compliance roadmap",
        "zh": "运营与合规路线图"
      }
    ],
    "requirements": {
      "ar": "الأنشطة والتخصصات والمؤهلات وجنسيات الشركاء والميزانية.",
      "en": "Professions, qualifications, owner nationalities and budget.",
      "zh": "专业领域、资质、股东国籍及预算。"
    },
    "exclusions": {
      "ar": "الرسوم الرسمية ورأس المال ورسوم الاعتماد والموارد التشغيلية غير مشمولة.",
      "en": "Official fees, capital, accreditation and operational resources are excluded.",
      "zh": "不含政府费用、资本金、认证及运营成本。"
    },
    "installments": 3
  }
];
export const packageDisclosure: Trilingual = {
  "ar": "الأسعار المعلنة هي أتعاب باقات خدماتنا المهنية فقط بالريال السعودي. أي تخفيض يخص أتعابنا حصريًا، ولا يخفض الرسوم الحكومية أو رسوم الجهات الرسمية أو الضرائب أو رأس المال أو تكاليف الأطراف الخارجية. تعتمد الأهلية ونطاق التنفيذ على النشاط والمستندات والموافقات. يثبت السعر النهائي ومحتوى الخدمة في عرض مكتوب قبل أي التزام.",
  "en": "Published package prices are our proposed professional service fees in SAR only. Any discount applies exclusively to our service fees, never government/authority charges, taxes, required capital, or third-party costs. Eligibility and scope depend on the activity, documents and approvals. The final scope and fee are confirmed in a written quotation before any commitment.",
  "zh": "公布的套餐价格仅为我们的拟议专业服务费（沙特里亚尔）。任何折扣只适用于我们的服务费，不适用于政府及主管机构费用、税费、所需资本金或第三方成本。具体资格和服务范围取决于业务、文件与审批；最终价格及服务内容以签署前的书面报价为准。"
};
