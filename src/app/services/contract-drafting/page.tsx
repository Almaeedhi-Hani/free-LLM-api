import React from 'react';
import { ServiceSchema, FAQSchema } from '@/components/SchemaMarkup';

export default function ContractDraftingPage() {
  const faqItems = [
    { question: 'ما هي أنواع العقود التي يمكن صياغتها؟', answer: 'يمكن صياغة عقود الشركات، عقود التوريد، عقود العمل، ومذكرات التفاهم، وعقود الاستثمار الدولية وفق الأنظمة السعودية.' },
    { question: 'هل يتم توثيق العقود عند الكاتب العدل؟', answer: 'نعم، نقدم خدمات التوثيق الرسمي عند كتابة العدل عند الحاجة لضمان النفاذ القانوني الكامل للعقود.' }
  ];

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <ServiceSchema
        name="خدمة صياغة العقود واللوائح"
        description="صياغة العقود الاستثمارية واللوائح الداخلية للشركات وفق الأنظمة والقوانين السعودية."
        requirements={['معلومات الأطراف', 'نطاق النشاط', 'الشروط التجارية']}
        stages={['استلام البيانات', 'الصياغة القانونية', 'المراجعة والتوقيع']}
      />
      <FAQSchema items={faqItems} />

      <h1 className="text-3xl font-bold text-slate-900 mb-6">صياغة العقود واللوائح الاستثمارية</h1>

      {/* Golden Paragraph */}
      <div className="golden-paragraph mb-8">
        نقدم خدماتنا القانونية المتخصصة في صياغة ومراجعة العقود الاستثمارية واللوائح الداخلية وفق الأنظمة السعودية الحديثة، بما يشمل عقود الشركات، واتفاقيات الشراكة، ومذكرات التفاهم، وعقود التوريد، مع ضمان الدقة القانونية الكاملة وتوافق النصوص مع متطلبات الجهات التنظيمية، بما يحمي حقوقكم ويؤمن مصالحكم التجارية بشكل نهائي ومتين.
      </div>

      <h2 className="text-2xl font-semibold text-slate-800 mb-4">مجالات الصياغة المتخصصة</h2>
      <ul className="list-disc pr-8 space-y-2 text-slate-700 mb-8">
        <li>عقود تأسيس الشركات واتفاقيات الشركاء.</li>
        <li>مذكرات التفاهم الدولية والاتفاقيات الاستثمارية.</li>
        <li>اللوائح الداخلية للحوكمة وسياسات الشركة.</li>
        <li>عقود التوريد والتوزيع والوكالة التجارية.</li>
      </ul>

      <h2 className="text-2xl font-semibold text-slate-800 mb-4">الأسئلة الشائعة حول الصياغة</h2>
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
