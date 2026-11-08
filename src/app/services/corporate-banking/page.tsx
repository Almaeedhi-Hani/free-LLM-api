import React from 'react';
import { ServiceSchema, MultilingualGraphSchema } from '@/components/SchemaMarkup';

export default function CorporateBankingPage() {
  const faqItems = [
    {
      question: 'هل يشترط حضور المستثمر الأجنبي شخصياً لفتح الحساب البنكي في السعودية؟',
      answer: 'تشترط معظم البنوك السعودية حضور المفوض بالتوقيع أو المدير التنفيذي للشركة شخصياً لمرة واحدة للتوقيع والتحقق من الهوية، ونحن نتولى تجهيز الملف القانوني بالكامل قبل الحضور.'
    },
    {
      question: 'Which are the best Saudi banks for foreign corporate entities?',
      answer: 'Top recommendations include Saudi National Bank (SNB), Al Rajhi Bank, and Saudi Awwal Bank (SABB), depending on your company\'s operational and international trade needs.'
    }
  ];

  const multilingualFaqs = [
    {
      question: {
        ar: 'هل يشترط حضور المستثمر الأجنبي شخصياً لفتح الحساب البنكي في السعودية؟',
        en: 'Does the foreign investor need to attend in person to open a bank account in Saudi Arabia?',
        zh: '外国投资者需要亲自到沙特开立银行账户吗？'
      },
      answer: {
        ar: 'تشترط معظم البنوك السعودية حضور المفوض بالتوقيع أو المدير التنفيذي للشركة شخصياً لمرة واحدة للتوقيع والتحقق من الهوية، ونحن نتولى تجهيز الملف القانوني بالكامل قبل الحضور.',
        en: 'Most Saudi banks require the authorized signatory or CEO to attend in person once for verification, and we handle all legal documentation preparation beforehand.',
        zh: '大多数沙特银行要求授权签字人或首席执行官亲自到场一次进行验证，我们在到场前为您处理所有法律文件的准备工作。'
      }
    }
  ];

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <MultilingualGraphSchema
        url="https://investinsaudi-services.sa/services/corporate-banking"
        name={{
          ar: "فتح الحسابات البنكية الاستثمارية للشركات الأجنبية",
          en: "Saudi Corporate Investment Banking Setup for Foreign Entities",
          zh: "沙特外国企业投资银行开户服务"
        }}
        description={{
          ar: "تجهيز ملفات الامتثال وفتح الحسابات المصرفية للشركات الدولية في البنوك السعودية.",
          en: "Complete KYC structuring and legal representation for foreign corporate banking setup in KSA.",
          zh: "为全球跨国企业提供沙特中央银行合规下的企业投资账户设立全套代办服务。"
        }}
        faqs={multilingualFaqs}
      />
      <ServiceSchema
        name="فتح الحسابات البنكية الاستثمارية للشركات الأجنبية"
        description="تجهيز ملفات الامتثال وفتح الحسابات المصرفية للشركات الدولية في البنوك السعودية."
        requirements={['ترخيص وزارة الاستثمار MISA', 'السجل التجاري', 'ملف اعرف عميلك KYC']}
        stages={['إعداد وتدقيق مستندات الشركة', 'تقديم الطلب للبنوك المعتمدة', 'تفعيل الحساب البنكي الرأسمالي']}
      />

      {/* 1. النسخة العربية */}
      <section className="mb-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">فتح الحسابات البنكية الاستثمارية للشركات الأجنبية في السعودية</h1>
        <div className="golden-paragraph mb-6">
          نحن نسهل ونختصر إجراءات فتح الحسابات البنكية الاستثمارية والشركات للأجانب في كبرى البنوك السعودية بامتثال كامل لمتطلبات البنك المركزي السعودي (SAMA). نضمن لك إعداد ملف اعرف عميلك (KYC) وتفعيل الحساب الرأسمالي لإيداع رأس المال بأسرع وقت.
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold mb-4">متطلبات البنوك السعودية:</h3>
          <ul className="list-disc pr-6 space-y-1 text-slate-700">
            <li>رخصة وزارة الاستثمار السارية (MISA).</li>
            <li>السجل التجاري السعودي وعقد التأسيس.</li>
            <li>اكتمال نموذج "اعرف عميلك" (KYC) وهيكلة الملكية المستفيدة.</li>
          </ul>
        </div>
      </section>

      {/* 2. English Version */}
      <section className="mb-12 border-t border-slate-200 pt-12" dir="ltr">
        <h2 className="text-3xl font-bold text-slate-900 mb-6">Saudi Corporate Investment Banking Setup for Foreign Entities</h2>
        <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg mb-6 text-lg font-medium leading-relaxed text-blue-900">
          Opening a corporate investment bank account in Saudi Arabia requires strict regulatory compliance under SAMA rules. Our corporate banking experts streamline the entire KYC process and corporate documentation vetting to unlock your Saudi investment bank account swiftly across top-tier Saudi banks.
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold mb-4">Key Banking Requirements:</h3>
          <ul className="list-disc pl-6 space-y-1 text-slate-700">
            <li>Valid MISA Foreign Investment License.</li>
            <li>Saudi Commercial Registration and Articles of Association.</li>
            <li>Comprehensive KYC dossier and Ultimate Beneficial Ownership (UBO) disclosure.</li>
          </ul>
        </div>
      </section>

      {/* 3. 中文版本 (Chinese Version) */}
      <section className="mb-12 border-t border-slate-200 pt-12" dir="ltr">
        <h2 className="text-3xl font-bold text-slate-900 mb-6">沙特外国企业投资银行开户服务</h2>
        <div className="bg-gold-50 border-l-4 border-gold-600 p-6 rounded-r-lg mb-6 text-lg font-medium leading-relaxed text-gold-900">
          在沙特中央银行 (SAMA) 的监管规定下，在沙特开设企业投资银行账户需要严格的合规审计。我们的企业银行专家团队协助您高效通过“了解您的客户”(KYC) 审核并准备法律文件，确保在沙特顶级商业银行中快速开立企业海外账户。
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold mb-4">核心开户要求:</h3>
          <ul className="list-disc pl-6 space-y-1 text-slate-700">
            <li>有效的沙特投资部 (MISA) 许可证。</li>
            <li>沙特营业执照及公司章程。</li>
            <li>完整的 KYC（了解您的客户）档案与最终受益人披露。</li>
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
