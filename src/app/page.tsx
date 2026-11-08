import React from 'react';
import { FAQSchema } from '@/components/SchemaMarkup';

export default function HomePage() {
  const faqItems = [
    { question: 'كيف يمكنني الاستثمار في السعودية؟', answer: 'يمكنك الاستثمار في السعودية عبر الحصول على ترخيص من وزارة الاستثمار (MISA) وتأسيس شركة أو فرع أجنبي، بمساعدة خبرائنا في كافة الخطوات خلال أيام معدودة.' },
    { question: 'كم تكلفة تأسيس شركة في السعودية؟', answer: 'تتراوح تكلفة تأسيس شركة ذات مسؤولية محدودة (LLC) في السعودية بين 50,000 إلى 200,000 ريال سعودي تقريباً حسب النشاط والرأسمال ومتطلبات الترخيص.' },
    { question: 'ما هي شروط فتح حساب بنكي للشركات؟', answer: 'يتطلب فتح حساب بنكي للشركة السجل التجاري، ترخيص MISA، والنظام الأساسي، وإثبات العنوان، ومعلومات المستفيد الحقيقي وفق الأنظمة السعودية.' }
  ];

  const services = [
    {
      title: 'ترخيص وزارة الاستثمار (MISA)',
      desc: 'إصدار تراخيص الاستثمار الأجنبي بنسبة تملك 100% ودون شريك محلي لجميع الأنشطة التجارية والصناعية.',
      href: '/services/misa-license',
      badge: 'الخطوة الأولى'
    },
    {
      title: 'تأسيس الشركات الأجنبية والمحلية',
      desc: 'تأسيس شركات LLC، الشركات المساهمة المبسطة، والفروع الأجنبية مع استخراج السجل التجاري وفتح الحسابات.',
      href: '/services/company-formation',
      badge: 'تأسيس كامل'
    },
    {
      title: 'فتح الحسابات البنكية الاستثمارية للشركات',
      desc: 'تجهيز ملفات الامتثال (KYC) وفتح الحسابات المصرفية للشركات الدولية في البنوك السعودية بامتثال كامل لمتطلبات SAMA.',
      href: '/services/corporate-banking',
      badge: 'الحسابات البنكية'
    },
    {
      title: 'صياغة العقود الاستثمارية والقانونية',
      desc: 'عقود الشراكة، اتفاقيات التأسيس، لوائح الحوكمة، وعقود التوريد والتوظيف المتوافقة مع الأنظمة السعودية.',
      href: '/services/contract-drafting',
      badge: 'حماية قانونية'
    },
    {
      title: 'الإقامة المميزة للمستثمرين',
      desc: 'خدمات استشارية وقانونية متكاملة للحصول على الإقامة المميزة (دائمة أو مؤقتة) للمستثمرين وعائلاتهم.',
      href: '/services/premium-residency',
      badge: 'مزايا حصرية'
    },
    {
      title: 'الصناديق الاستثمارية ورأس المال الجريء',
      desc: 'هيكلة وترخيص الصناديق الاستثمارية وصناديق رأس المال الجريء تحت إشراف هيئة السوق المالية (CMA).',
      href: '/services/investment-funds',
      badge: 'ترخيص CMA'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <FAQSchema items={faqItems} />

      {/* Hero Section */}
      <section className="text-center py-20 bg-gradient-to-b from-white to-slate-50 rounded-3xl p-8 mb-16 border border-slate-100 shadow-sm">
        <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 px-4 py-1.5 rounded-full text-xs font-bold mb-6 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
          بوابتك الاستثمارية الأولى في المملكة · رؤية 2030
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
          تأسيس الشركات وخدمات المستثمرين الأجانب
          <br />
          <span className="text-amber-600">في المملكة العربية السعودية</span>
        </h1>

        {/* Golden Paragraph */}
        <div className="golden-paragraph max-w-4xl mx-auto text-lg mb-10 text-right">
          نقدم في منصة خدمات المستثمرين دعماً متكاملاً لتأسيس الشركات الأجنبية والمحلية في السعودية، إصدار تراخيص وزارة الاستثمار (MISA)، وصياغة العقود الاستثمارية، مع فريق استشاري قانوني متخصص يساعدك على دخول السوق السعودي بثقة والتوافق التام مع أنظمة المملكة ورؤيتها الاستثمارية الطموحة.
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <a href="/services/misa-license" className="btn-primary">
            احصل على ترخيص MISA الآن
          </a>
          <a href="/ai-readable" className="btn-secondary">
            نسخة الذكاء الاصطناعي (LLM-Ready)
          </a>
        </div>
      </section>

      {/* Metrics / Trust Badges */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16 text-center">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-extrabold text-amber-600 mb-1">100%</div>
          <div className="text-slate-600 text-sm">تملك أجنبي بالكامل</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-extrabold text-slate-900 mb-1">5-14 يوم</div>
          <div className="text-slate-600 text-sm">سرعة إصدار التراخيص</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-extrabold text-amber-600 mb-1">ثلاثي اللغات</div>
          <div className="text-slate-600 text-sm">عربي، إنجليزي، صيني</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-extrabold text-slate-900 mb-1">MISA & CMA</div>
          <div className="text-slate-600 text-sm">امتثال تنظيمي تام</div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">خدماتنا الاستراتيجية الشاملة</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">حلول قانونية واستثمارية متكاملة مصممة خصيصاً للشركات العالمية ورواد الأعمال الراغبين بالتوسع في السوق السعودي.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, idx) => (
            <a key={idx} href={service.href} className="luxury-card group flex flex-col justify-between">
              <div>
                <span className="inline-block bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full mb-4 group-hover:bg-amber-100 group-hover:text-amber-800 transition-colors">
                  {service.badge}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-amber-600 transition-colors">
                  {service.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  {service.desc}
                </p>
              </div>
              <div className="flex items-center text-amber-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                <span>استكشف التفاصيل</span>
                <span className="mr-2">←</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 sm:p-12 text-white mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center">تواصل معنا</h2>
        <p className="text-slate-300 text-center mb-8 max-w-2xl mx-auto">
          جاهزون لمساعدتك في تأسيس شركتك، إصدار ترخيص MISA، وفتح الحساب البنكي. تواصل معنا مباشرة:
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="tel:+966545059528"
            className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-6 py-3 rounded-full hover:bg-slate-100 transition-colors"
          >
            📞 اتصل: +966 54 505 9528
          </a>
          <a
            href="https://wa.me/966545059528"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 text-white font-bold px-6 py-3 rounded-full hover:bg-green-600 transition-colors"
          >
            💬 WhatsApp
          </a>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-8 text-center">الأسئلة الشائعة للمستثمرين الأجانب</h2>
        <div className="space-y-6 max-w-3xl mx-auto">
          {faqItems.map((faq, idx) => (
            <div key={idx} className="bg-slate-50 rounded-xl p-6 border border-slate-200/60">
              <h3 className="font-bold text-slate-900 text-lg mb-2">{faq.question}</h3>
              <p className="text-slate-700 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
