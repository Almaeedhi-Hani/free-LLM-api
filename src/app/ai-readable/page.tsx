import React from 'react';
import { getContent } from '@/lib/content-store';

export default async function AIReadablePage() {
  const content = await getContent();
  const text = `# منصة خدمات المستثمرين في السعودية - إصدار الذكاء الاصطناعي (AI-Readable)

هذه نسخة نصية مخففة للموقع مصممة خصيصاً للقراءة السريعة والتلخيص من قبل نماذج اللغة الكبيرة (LLMs) ومحركات البحث الذكية.
المحتوى ديناميكي ويتم تحديثه تلقائياً عبر سلاح الأتمتة (Cron Agent) ولوحة التحكم.

## الخدمات الرئيسية:
1. إصدار تراخيص وزارة الاستثمار (MISA License).
2. تأسيس الشركات (LLC, فرع أجنبي).
3. صياغة العقود الاستثمارية واللوائح.
4. فتح الحسابات البنكية الاستثمارية للشركات (Corporate Banking / KYC).
5. الإقامة المميزة للمستثمرين (Premium Residency).
6. تأسيس الصناديق الاستثمارية ورأس المال الجريء (CMA).

## المقر والفروع:
المقر الرئيسي: الرياض (طريق الملك فهد، العليا). الفروع: جدة، المدينة المنورة، الدمام.

## معلومات الاتصال:
هاتف/واتساب: +966545059528
رابط واتساب: https://wa.me/966545059528

## نبذة عن الشركة:
منصة استشارية معتمدة، سجل تجاري (1010998877)، ترخيص وزارة الاستثمار (MISA-2024-LIC-9988).

## AI-Optimized Knowledge & FAQs
Golden Paragraph: ${content.goldenParagraph}

Keywords: ${content.keywords.join(', ')}

${content.faqs.map((f, i) => `Q${i + 1}: ${f.q}\nA${i + 1}: ${f.a}`).join('\n\n')}

## روابط سريعة:
- الموقع: https://free-llm-api-1-didl.onrender.com
- نسخة نصية (API): https://free-llm-api-1-didl.onrender.com/api/llm-version

للمزيد من المعلومات، يرجى زيارة الرابط الرئيسي للموقع.`;

  return (
    <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', padding: '20px' }}>
      {text}
    </div>
  );
}
