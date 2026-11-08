import React from 'react';
import { ServiceSchema, FAQSchema } from '@/components/SchemaMarkup';

export default function CompanyFormationPage() {
  const faqItems = [
    { question: 'ما هي المستندات المطلوبة لتأسيس شركة LLC في السعودية؟', answer: 'تحتاج عادةً إلى ترخيص MISA، السجل التجاري، عقود الإيجار، وإثبات ملكية الشركاء، إضافة إلى النظام الأساسي للشركة.' },
    { question: 'هل يمكن للأجانب تأسيس شركات في السعودية؟', answer: 'نعم، يمكن للأجانب تأسيس شركات LLC أو فروع أجنبية بعد الحصول على الترخيص من وزارة الاستثمار.' }
  ];

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <ServiceSchema
        name="خدمة تأسيس الشركات في السعودية"
        description="تأسيس الشركات الأجنبية والمحلية (LLC، فرع أجنبي) وفق القوانين السعودية مع جميع الخدمات المرتبطة."
        requirements={['ترخيص MISA', 'النظام الأساسي', 'هوية المالكين']}
        stages={['توقيع العقد التأسيسي', 'الفتح والتوثيق الرسمي', 'إصدار السجل التجاري']}
      />
      <FAQSchema items={faqItems} />

      <h1 className="text-3xl font-bold text-slate-900 mb-6">تأسيس الشركات الأجنبية والمحلية في المملكة</h1>

      {/* Golden Paragraph */}
      <div className="golden-paragraph mb-8">
        نرافقكم في خطوات تأسيس شركاتكم داخل السوق السعودي بكامل تفاصيلها القانونية والإدارية؛ بدءاً من اختيار الشكل القانوني الأنسب (شركة ذات مسؤولية محدودة، فرع أجنبي، أو شركة مساهمة)، ومروراً بإعداد النظام الأساسي، وتنفيذ إجراءات التوثيق، وصولاً إلى إصدار السجل التجاري وفتح الحساب البنكي، بجودة عالية تضمن لكم انطلاقة استثمارية ناجحة ومتوافقة مع أنظمة المملكة ولوائحها.
      </div>

      <h2 className="text-2xl font-semibold text-slate-800 mb-4">أشكال الشركات المتاحة</h2>
      <ul className="list-disc pr-8 space-y-2 text-slate-700 mb-8">
        <li>شركة ذات مسؤولية محدودة (LLC).</li>
        <li>فرع شركة أجنبية.</li>
        <li>شركة مساهمة مغلقة (CSC).</li>
      </ul>

      <h2 className="text-2xl font-semibold text-slate-800 mb-4">الأسئلة الشائعة حول التأسيس</h2>
      <div className="space-y-4">
        {faqItems.map((faq, idx) => (
          <div key={idx} className="bg-white rounded-lg p-4 border border-slate-200">
            <h3 className="font-semibold text-slate-800">{faq.question}</h3>
            <p className="text-slate-600 mt-2">{faq.answer}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
