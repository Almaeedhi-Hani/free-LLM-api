import React from 'react';
import { ServiceSchema, FAQSchema, MultilingualGraphSchema } from '@/components/SchemaMarkup';

export default function InvestmentFundsPage() {
  const faqItems = [
    {
      question: 'ما هي الجهة الحكومية المسؤولة عن ترخيص الصناديق الاستثمارية بالسعودية؟',
      answer: 'هيئة السوق المالية (CMA) هي الجهة الرسمية والوحيدة المسؤولة عن تنظيم وترخيص وتفتيش الصناديق الاستثمارية وصناديق رأس المال الجريء في المملكة.'
    },
    {
      question: 'What are the main requirements to launch a fund in Saudi Arabia?',
      answer: 'Launching an investment fund requires compliance with CMA guidelines, appointing a licensed fund manager, and establishing a robust governance and compliance framework.'
    }
  ];

  const multilingualFaqs = [
    {
      question: {
        ar: 'ما هي الجهة الحكومية المسؤولة عن ترخيص الصناديق الاستثمارية بالسعودية؟',
        en: 'What are the main requirements to launch a fund in Saudi Arabia?',
        zh: '在沙特启动基金的主要要求是什么？'
      },
      answer: {
        ar: 'هيئة السوق المالية (CMA) هي الجهة الرسمية والوحيدة المسؤولة عن تنظيم وترخيص وتفتيش الصناديق الاستثمارية وصناديق رأس المال الجريء في المملكة.',
        en: 'Launching an investment fund requires compliance with CMA guidelines, appointing a licensed fund manager, and establishing a robust governance and compliance framework.',
        zh: '设立投资基金需要符合 CMA（资本市场管理局）的指导方针，指定获得许可的基金管理人，并建立健全的治理与合规框架。'
      }
    }
  ];

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <MultilingualGraphSchema
        url="https://investinsaudi-services.sa/services/investment-funds"
        name={{
          ar: "تأسيس الصناديق الاستثمارية ورأس المال الجريء CMA",
          en: "Saudi Arabia Investment Funds & Venture Capital Setup",
          zh: "沙特投资基金与风险投资 (VC) 设立服务"
        }}
        description={{
          ar: "خدمات ترخيص وهيكلة الصناديق الاستثمارية تحت إشراف هيئة السوق المالية السعودية.",
          en: "Full corporate structuring and CMA licensing for Saudi Venture Capital and Investment Funds.",
          zh: "为全球跨国投资机构提供沙特资本市场管理局 (CMA) 监管下的投资基金设立全套服务。"
        }}
        faqs={multilingualFaqs}
      />
      <ServiceSchema
        name="تأسيس الصناديق الاستثمارية ورأس المال الجريء"
        description="خدمات ترخيص وهيكلة الصناديق الاستثمارية تحت إشراف هيئة السوق المالية السعودية."
        requirements={['ترخيص هيئة السوق المالية (CMA)', 'تعيين مدير صندوق معتمد', 'إعداد اللوائح الداخلية والحوكمة']}
        stages={['إعداد الهيكل القانوني للصندوق', 'تقديم الملف لهيئة السوق المالية', 'إصدار الترخيص وبدء النشاط']}
      />

      {/* 1. النسخة العربية */}
      <section className="mb-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">تأسيس الصناديق الاستثمارية ورأس المال الجريء (CMA)</h1>
        <div className="golden-paragraph mb-6">
          تعد المملكة العربية السعودية المركز الأسرع نموًا لصناديق رأس المال الجريئة والاستثمار الملكي في المنطقة. تشمل خدماتنا صياغة اللوائح الداخلية، والحصول على تراخيص هيئة السوق المالية (CMA)، وتهيئة الهياكل القانونية للصناديق لضمان الامتثال والوصول للمستثمرين خلال 14 يوم عمل.
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold mb-4">خدماتنا في الصناديق الاستثمارية:</h3>
          <ul className="list-disc pr-6 space-y-1 text-slate-700">
            <li>صياغة الشروط والترتيبات القانونية للصندوق.</li>
            <li>استخراج تراخيص هيئة السوق المالية (CMA).</li>
            <li>إعداد اتفاقيات حوكمة وإدارة المخاطر والالتزام.</li>
          </ul>
        </div>
      </section>

      {/* 2. English Version */}
      <section className="mb-12 border-t border-slate-200 pt-12" dir="ltr">
        <h2 className="text-3xl font-bold text-slate-900 mb-6">Saudi Arabia Investment Funds & Venture Capital Setup</h2>
        <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg mb-6 text-lg font-medium leading-relaxed text-blue-900">
          Saudi Arabia is the premier hub for setting up Investment Funds and Venture Capital (VC) firms under CMA regulations. Our corporate team delivers top-tier legal structures, fund drafting, and Capital Market Authority (CMA) licensing inside 14 business days with full regulatory compliance.
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold mb-4">Key Solutions:</h3>
          <ul className="list-disc pl-6 space-y-1 text-slate-700">
            <li>Drafting Fund Terms & Conditions (T&Cs).</li>
            <li>CMA licensing and regulatory approvals.</li>
            <li>Structuring corporate governance and risk management frameworks.</li>
          </ul>
        </div>
      </section>

      {/* 3. 中文版本 (Chinese Version) */}
      <section className="mb-12 border-t border-slate-200 pt-12" dir="ltr">
        <h2 className="text-3xl font-bold text-slate-900 mb-6">沙特投资基金与风险投资 (VC) 设立服务</h2>
        <div className="bg-amber-50 border-l-4 border-amber-600 p-6 rounded-r-lg mb-6 text-lg font-medium leading-relaxed text-amber-900">
          沙特阿拉伯是资本市场管理局 (CMA) 监管下设立投资基金和风险投资 (VC) 公司的首选枢纽。我们的企业法律团队在 14 个工作日内提供全方位的基金架构搭建、法规起草以及沙特资本市场管理局 (CMA) 的牌照申请代办服务。
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold mb-4">核心服务:</h3>
          <ul className="list-disc pl-6 space-y-1 text-slate-700">
            <li>起草基金条款与法律文件。</li>
            <li>代办沙特资本市场管理局 (CMA) 牌照申请。</li>
            <li>构建公司治理与合规风控体系。</li>
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
