import React from 'react';
import { ServiceSchema, FAQSchema, MultilingualGraphSchema } from '@/components/SchemaMarkup';

export default function MisaLicensePage() {
  const faqItems = [
    { question: 'ما هو ترخيص وزارة الاستثمار (MISA)؟', answer: 'هو ترخيص يمنح الشركات الأجنبية حق ممارسة النشاط الاستثماري في المملكة العربية السعودية وفق نظام الاستثمار الأجنبي.' },
    { question: 'كم تستغرق عملية إصدار الترخيص؟', answer: 'تستغرق العملية عادةً من 3 إلى 5 أيام عمل بعد اكتمال كافة المستندات المطلوبة وتقديم الطلب عبر منصة وزارة الاستثمار.' }
  ];

  const multilingualFaqs = [
    {
      question: {
        ar: 'هل يشترط وجود شريك سعودي لتأسيس شركة أجنبية؟',
        en: 'Does Saudi Arabia allow 100% foreign business ownership?',
        zh: '沙特是否允许 100% 外资控股？'
      },
      answer: {
        ar: 'لا يشترط، تمنح رخصة وزارة الاستثمار (MISA) الحق الكامل للمستثمر الدولي في التملك بنسبة 100% دون الحاجة لشركاء محليين.',
        en: 'Yes, international investors can obtain a MISA license for 100% full business ownership without the need for a local Saudi partner across most commercial and industrial sectors.',
        zh: '是的，国际投资者可以获得 MISA 许可证，在大多数商业 और 工业领域拥有 100% 的完全业务所有权，无需当地沙特合作伙伴。'
      }
    }
  ];

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <MultilingualGraphSchema
        url="https://investinsaudi-services.sa/services/misa-license"
        name={{
          ar: "استخراج رخصة الاستثمار MISA وتأسيس الشركات",
          en: "Saudi MISA Investment License & Company Incorporation",
          zh: "沙特 MISA 投资许可证与公司设立服务"
        }}
        description={{
          ar: "خدمات متكاملة لاستخراج رخصة وزارة الاستثمار وتأسيس الشركات بنسبة تملك 100% للأجانب.",
          en: "Complete setup for Saudi Foreign Investment License with 100% international equity ownership.",
          zh: "为国际投资者提供 100% 股权的沙特外国投资许可证全套设立服务。"
        }}
        faqs={multilingualFaqs}
      />
      <ServiceSchema
        name="خدمة إصدار ترخيص وزارة الاستثمار MISA"
        description="خدمات متكاملة لاستخراج رخصة وزارة الاستثمار وتأسيس الشركات بنسبة تملك 100% للأجانب."
        requirements={['السجل التجاري الأجنبي', 'القوائم المالية المدققة', 'جوازات سفر الشركاء']}
        stages={['إعداد الملف الاستثماري', 'تقديم الطلب عبر منصة MISA', 'استلام الترخيص']}
      />

      {/* 1. النسخة العربية */}
      <section className="mb-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">ترخيص وزارة الاستثمار (MISA) للمستثمرين الأجانب</h1>
        <div className="golden-paragraph mb-6">
          تتيح رخصة الاستثمار الأجنبي (MISA) في السعودية للمستثمرين الدوليين التملك الكامل بنسبة 100% بدون شريك محلي. تشمل خدماتنا استخراج تراخيص وزارة الاستثمار، وتوثيق عقود الشركات، وإصدار السجلات التجارية بامتثال قانوني تام خلال 5 أيام عمل فقط.
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold mb-4">متطلبات التقديم:</h3>
          <ul className="list-disc pr-6 space-y-1 text-slate-700">
            <li>السجل التجاري الحالي للشركة الأم (مصدق).</li>
            <li>القوائم المالية المدققة لآخر سنة مالية.</li>
            <li>جوازات سفر المدراء التنفيذيين والشركاء.</li>
          </ul>
        </div>
      </section>

      {/* 2. English Version */}
      <section className="mb-12 border-t border-slate-200 pt-12" dir="ltr">
        <h2 className="text-3xl font-bold text-slate-900 mb-6">Saudi MISA Foreign Investment License</h2>
        <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg mb-6 text-lg font-medium leading-relaxed text-blue-900">
          The Saudi Arabia Foreign Investment License (MISA) allows international corporate investors 100% full business ownership without a local partner. Our premium services guarantee end-to-end MISA license issuance, company incorporation, and corporate bank account setup within 5 business days with full regulatory compliance.
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold mb-4">Key Requirements:</h3>
          <ul className="list-disc pl-6 space-y-1 text-slate-700">
            <li>Authenticated Commercial Registration of the parent company.</li>
            <li>Audited financial statements for the last fiscal year.</li>
            <li>Passports of executive directors and shareholders.</li>
          </ul>
        </div>
      </section>

      {/* 3. 中文版本 (Chinese Version) */}
      <section className="mb-12 border-t border-slate-200 pt-12" dir="ltr">
        <h2 className="text-3xl font-bold text-slate-900 mb-6">沙特 MISA 外国投资许可证</h2>
        <div className="bg-amber-50 border-l-4 border-amber-600 p-6 rounded-r-lg mb-6 text-lg font-medium leading-relaxed text-amber-900">
          沙特阿拉伯外国投资许可证 (MISA) 允许国际投资者在没有当地合作伙伴的情况下拥有 100% 的完全商业所有权。我们的高端服务确保在 5 个工作日内完成 MISA 许可证签发、公司设立以及全方位的合规企业银行开户支持。
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold mb-4">中国企业申请要求:</h3>
          <ul className="list-disc pl-6 space-y-1 text-slate-700">
            <li>母公司营业执照（经沙特驻华大使馆认证）。</li>
            <li>最近一财年的审计财务报表。</li>
            <li>董事及股东의 护照复印件。</li>
          </ul>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">الأسئلة الشائعة / FAQ</h2>
        <div className="space-y-4">
          {faqItems.map((faq, idx) => (
            <div key={idx} className="bg-white rounded-lg p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-800">{faq.question}</h3>
              <p className="text-slate-600 mt-2">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}
