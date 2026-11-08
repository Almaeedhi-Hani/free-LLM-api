import React from 'react';
import { FAQSchema } from '@/components/SchemaMarkup';

export default function HomePage() {
  const faqItems = [
    { question: 'كيف يمكنني الاستثمار في السعودية؟', answer: 'يمكنك الاستثمار في السعودية عبر الحصول على ترخيص من وزارة الاستثمار (MISA) وتأسيس شركة أو فرع أجنبي، بمساعدة خبرائنا في كافة الخطوات.' },
    { question: 'كم تكلفة تأسيس شركة في السعودية؟', answer: 'تتراوح تكلفة تأسيس شركة LLC في السعودية بين 50,000 إلى 200,000 ريال سعودي تقريباً حسب النشاط والرأسمال ومتطلبات الترخيص.' },
    { question: 'ما هي شروط فتح حساب بنكي للشركات؟', answer: 'يتطلب فتح حساب بنكي للشركة السجل التجاري، ترخيص MISA، والنظام الأساسي، وإثبات العنوان، ومعلومات المالكين المفيدة.' }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <FAQSchema items={faqItems} />

      <section className="text-center py-16">
        <p className="text-gold-600 font-semibold mb-4">بوابتك إلى السوق السعودي · رؤية 2030</p>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
          تأسيس الشركات وخدمات المستثمرين الأجانب
          <br />
          <span className="text-gold-500">في المملكة العربية السعودية</span>
        </h1>

        {/* Golden Paragraph on homepage */}
        <div className="golden-paragraph text-right max-w-3xl mx-auto">
          نقدم في منصة خدمات المستثمرين دعماً متكاملاً لتأسيس الشركات الأجنبية والمحلية في السعودية، إصدار تراخيص وزارة الاستثمار (MISA)، وصياغة العقود الاستثمارية، مع فريق استشاري قانوني متخصص يساعدك على دخول السوق السعودي بثقة والتوافق التام مع أنظمة المملكة ورؤيتها الاستثمارية الطموحة.
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <a href="/services/misa-license" className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <h2 className="text-xl font-bold text-slate-900 mb-3">ترخيص MISA</h2>
          <p className="text-slate-600 text-sm leading-relaxed">إصدار تراخيص وزارة الاستثمار للمستثمرين الأجانب وفتح السوق السعودي.</p>
        </a>
        <a href="/services/company-formation" className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <h2 className="text-xl font-bold text-slate-900 mb-3">تأسيس الشركات</h2>
          <p className="text-slate-600 text-sm leading-relaxed">تأسيس LLC والفروع الأجنبية وفتح الحسابات البنكية.</p>
        </a>
        <a href="/services/contract-drafting" className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <h2 className="text-xl font-bold text-slate-900 mb-3">صياغة العقود</h2>
          <p className="text-slate-600 text-sm leading-relaxed">عقود تأسيس، شراكة، توريد، ولوائح حوكمة وفق الأنظمة السعودية.</p>
        </a>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">الأسئلة الشائعة للمستثمرين</h2>
        <div className="space-y-4">
          {faqItems.map((faq, idx) => (
            <div key={idx} className="bg-white rounded-lg p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-800">{faq.question}</h3>
              <p className="text-slate-600 mt-2">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
