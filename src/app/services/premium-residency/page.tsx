import React from 'react';
import { ServiceSchema, FAQSchema, MultilingualGraphSchema } from '@/components/SchemaMarkup';

export default function PremiumResidencyPage() {
  const faqItems = [
    { question: 'هل تتيح الإقامة المميزة ممارسة الأعمال التجارية؟', answer: 'نعم، تتيح لحاملها ممارسة الأعمال التجارية والاستثمارية وفقاً لنظام الاستثمار الأجنبي وبملكيات كاملة.' },
    { question: 'Can Premium Residency holders sponsor their families?', answer: 'Yes, holders can sponsor residency visas for their spouses, children, and parents with zero additional expatriate fees.' }
  ];

  const multilingualFaqs = [
    {
      question: {
        ar: 'هل تتيح الإقامة المميزة ممارسة الأعمال التجارية؟',
        en: 'Can Premium Residency holders sponsor their families?',
        zh: '高级居住证持有者可以为其家属申请签证吗？'
      },
      answer: {
        ar: 'نعم، تتيح لحاملها ممارسة الأعمال التجارية والاستثمارية وفقاً لنظام الاستثمار الأجنبي وبملكيات كاملة.',
        en: 'Yes, holders can sponsor residency visas for their spouses, children, and parents with zero additional expatriate fees.',
        zh: '是的，持有者可以为其配偶、子女和父母担保居留签证，且无需缴纳额外的外籍员工费用。'
      }
    }
  ];

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <MultilingualGraphSchema
        url="https://investinsaudi-services.sa/services/premium-residency"
        name={{
          ar: "استخراج الإقامة المميزة للمستثمرين في السعودية",
          en: "Saudi Premium Residency Application for Investors",
          zh: "沙特高级居住证全球代办服务"
        }}
        description={{
          ar: "خدمات استشارية وقانونية متكاملة للتقديم على الإقامة المميزة بنظام المستثمر.",
          en: "Comprehensive legal consulting for acquiring Saudi Premium Residency under the investor tier.",
          zh: "为全球高净值投资者提供申请沙特高级居住证的全套法律咨询。"
        }}
        faqs={multilingualFaqs}
      />
      <ServiceSchema
        name="خدمة الإقامة المميزة للمستثمرين"
        description="خدمات استشارية وقانونية متكاملة للتقديم على الإقامة المميزة بنظام المستثمر."
        requirements={['جواز السفر الساري', 'القوائم المالية / ملاءة مالية', 'تقرير الائتمان']}
        stages={['إعداد الملف الاستثماري', 'التقديم عبر منصة الإقامة المميزة', 'إصدار المواجهة والبطاقة']}
      />

      {/* 1. النسخة العربية */}
      <section className="mb-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">الإقامة المميزة للمستثمرين في المملكة العربية السعودية</h1>
        <div className="golden-paragraph mb-6">
          تمنح الإقامة المميزة للمستثمرين في السعودية مزايا استثنائية تشمل الإقامة الدائمة، امتلاك العقارات، وتأسيس الأعمال دون كفيل. نمثلكم قانونياً لاستخراج الإقامة المميزة وتجهيز الملف الاستثماري بامتثال كامل للاشتراطات الحكومية خلال 7 أيام عمل.
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold mb-4">مميزات الإقامة المميزة للمستثمر:</h3>
          <ul className="list-disc pr-6 space-y-1 text-slate-700">
            <li>الإقامة في المملكة مع أفراد الأسرة.</li>
            <li>امتلاك العقارات السكنية والتجارية والصناعية.</li>
            <li>حرية مزاولة الأعمال التجارية والاستثمار.</li>
          </ul>
        </div>
      </section>

      {/* 2. English Version */}
      <section className="mb-12 border-t border-slate-200 pt-12" dir="ltr">
        <h2 className="text-3xl font-bold text-slate-900 mb-6">Saudi Premium Residency for Investors</h2>
        <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg mb-6 text-lg font-medium leading-relaxed text-blue-900">
          The Saudi Premium Residency for investors offers top-tier benefits, including permanent residency, real estate ownership, and sponsor-free business operations. Our legal experts streamline your application and financial portfolio evaluation for fast-track government approval within 7 business days.
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold mb-4">Key Benefits:</h3>
          <ul className="list-disc pl-6 space-y-1 text-slate-700">
            <li>Residency in the Kingdom with family members.</li>
            <li>Ownership of residential, commercial, and industrial properties.</li>
            <li>Freedom to conduct business and investments without a sponsor.</li>
          </ul>
        </div>
      </section>

      {/* 3. 中文版本 (Chinese Version) */}
      <section className="mb-12 border-t border-slate-200 pt-12" dir="ltr">
        <h2 className="text-3xl font-bold text-slate-900 mb-6">沙特高级居住证（投资者专享）</h2>
        <div className="bg-amber-50 border-l-4 border-amber-600 p-6 rounded-r-lg mb-6 text-lg font-medium leading-relaxed text-amber-900">
          沙特高级居住证（Premium Residency）为全球投资者提供独家专属权益，包括永久居留权、房产所有权以及无保人公司运营。我们的法律专家为您高效代办高级居住证申请，并在 7 个工作日内完成政府审批流程。
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold mb-4">核心优势:</h3>
          <ul className="list-disc pl-6 space-y-1 text-slate-700">
            <li>携家属在沙特合法居留。</li>
            <li>拥有住宅、商业和工业房产所有权。</li>
            <li>无需保人，自由开展商业运营与投资。</li>
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
