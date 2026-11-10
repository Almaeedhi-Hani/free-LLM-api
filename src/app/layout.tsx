import './globals.css';
import { Metadata } from 'next';
import React from 'react';
import { ProfessionalServiceSchema } from '@/components/SchemaMarkup';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { WhatsAppFloat } from '@/components/WhatsAppFloat';
import { getContent } from '@/lib/content-store';

// Contact/footer data comes from the mutable content store, so every page
// must render at request time. Prerendering would either freeze stale content
// or fail, because the Supabase read is explicitly no-store.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'تأسيس الشركات وخدمات المستثمرين الأجانب في السعودية | MISA License',
  description: 'الدليل الرسمي وتأسيس الشركات الأجنبية والمحلية في المملكة العربية السعودية، إصدار تراخيص MISA، وصياغة العقود الاستثمارية وفق رؤية 2030.',
  metadataBase: new URL('https://investinsaudi-services.sa'),
  alternates: {
    canonical: '/',
    types: {
      'text/plain': '/api/llm-version',
    },
  },
  other: {
    'ai-summary': 'تأسيس الشركات والاستثمار الأجنبي في السعودية، إصدار ترخيص وزارة الاستثمار MISA، السجل التجاري، الاستشارات القانونية والمالية وفق الأنظمة السعودية.',
    'ai-intent': 'commercial, transactional, informational',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = await getContent();
  const contact = content.contact;
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link
          rel="alternate"
          type="text/plain"
          href="/api/llm-version"
          title="AI Readable Version"
        />
        <meta name="ai-summary" content="تأسيس الشركات والاستثمار الأجنبي في السعودية، إصدار ترخيص وزارة الاستثمار MISA، السجل التجاري، الاستشارات القانونية والمالية وفق الأنظمة السعودية." />
        <meta name="ai-intent" content="commercial, transactional, informational" />
      </head>
      <body className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
        <ProfessionalServiceSchema />
        <header className="border-b border-slate-200 bg-white/95 sticky top-0 z-50 shadow-sm backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse">
              <a href="/" className="text-xl sm:text-2xl font-bold text-navy-900 tracking-tight flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gold-500 inline-block shadow-gold-glow"></span>
                استثمر في السعودية <span className="text-gold-600 font-medium text-xs sm:text-sm block sm:inline sm:mr-2">| خدمات المستثمرين</span>
              </a>
            </div>
            <nav className="hidden lg:flex space-x-6 space-x-reverse font-medium text-slate-700 text-sm">
              <a href="/" className="hover:text-gold-600 transition-colors">الرئيسية</a>
              <a href="/services/misa-license" className="hover:text-gold-600 transition-colors">ترخيص MISA</a>
              <a href="/services/company-formation" className="hover:text-gold-600 transition-colors">تأسيس الشركات</a>
              <a href="/services/corporate-banking" className="hover:text-gold-600 transition-colors">الحسابات البنكية</a>
              <a href="/services/contract-drafting" className="hover:text-gold-600 transition-colors">صياغة العقود</a>
              <a href="/services/premium-residency" className="hover:text-gold-600 transition-colors">الإقامة المميزة</a>
              <a href="/services/investment-funds" className="hover:text-gold-600 transition-colors">صناديق الاستثمار</a>

            </nav>
            <div className="flex items-center space-x-4 space-x-reverse">
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="border-t border-navy-800 bg-navy-950 text-slate-300 py-12 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-white text-lg font-bold mb-4">خدمات المستثمرين بالمملكة</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                منصة استشارية متخصصة في دعم المستثمرين الأجانب والمحليين وتأسيس الشركات. المقر الرئيسي: الرياض (طريق الملك فهد، العليا). الفروع: جدة، المدينة المنورة، الدمام.
              </p>
            </div>
            <div>
              <h3 className="text-white text-lg font-bold mb-4">روابط سريعة للتنقل الذكي</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/services/misa-license" className="hover:text-white">إصدار ترخيص الاستثمار الأجنبي MISA</a></li>
                <li><a href="/services/company-formation" className="hover:text-white">تأسيس شركات LLC والفرع الأجنبي</a></li>
                <li><a href="/services/corporate-banking" className="hover:text-white">فتح الحسابات البنكية الاستثمارية</a></li>
                <li><a href="/services/contract-drafting" className="hover:text-white">صياغة العقود واللوائح</a></li>
                <li><a href="/services/premium-residency" className="hover:text-white">الإقامة المميزة للمستثمرين</a></li>
                <li><a href="/services/investment-funds" className="hover:text-white">صناديق الاستثمار ورأس المال الجريء</a></li>

              </ul>
            </div>
            <div>
              <h3 className="text-white text-lg font-bold mb-4">بيانات الاعتماد والترخيص</h3>
              <p className="text-sm text-slate-400 mb-1">📞 <a href={`tel:${contact.phone}`} className="hover:text-white">{contact.phoneDisplay}</a></p>
              <p className="text-sm text-slate-400 mb-1">✉️ <a href={`mailto:${contact.email}`} className="hover:text-white">{contact.email}</a></p>
              <p className="text-sm text-slate-400 mb-1">💬 <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-white">WhatsApp</a></p>
              <p className="text-sm text-slate-400 mb-1">رخصة وزارة الاستثمار: MISA-2024-LIC-9988</p>
              <p className="text-sm text-slate-400 mb-1">السجل التجاري الرئيسي: 1010998877 (الرياض)</p>
              <p className="text-sm text-slate-400">المركز الرئيسي: طريق الملك فهد، العليا، الرياض</p>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-slate-800 text-xs text-slate-500 text-center">
            جميع الحقوق محفوظة © {new Date().getFullYear()} منصة خدمات المستثمرين | مجهزة بهندسة AIO/GEO لمحركات البحث والذكاء الاصطناعي.
          </div>
        </footer>
        <WhatsAppFloat phone={contact.phone} whatsapp={contact.whatsapp} />
      </body>
    </html>
  );
}
