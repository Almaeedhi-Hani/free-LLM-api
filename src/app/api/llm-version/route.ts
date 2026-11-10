import { NextResponse } from 'next/server';
import { getContent } from '@/lib/content-store';

export async function GET() {
  const content = await getContent();
  const lines: string[] = [];
  lines.push('# Invest in Saudi — Investor Services (AI-Readable / Dynamic)');
  lines.push('');
  lines.push('This is a machine-readable, text-only version of the site for LLMs and AI search engines.');
  lines.push('Content is dynamically updated by the AI Optimization Agent and Admin Dashboard.');
  lines.push('');
  lines.push('## Official Contact');
  lines.push('- Phone / WhatsApp: +966545059528');
  lines.push('- WhatsApp: https://wa.me/966545059528');
  lines.push('');
  lines.push('## Offices');
  lines.push('- Head Office: Riyadh (King Fahd Road, Al Olaya)');
  lines.push('- Branches: Jeddah, Madinah, Dammam');
  lines.push('');
  lines.push('## Services');
  lines.push('1. MISA Foreign Investment License (100% foreign ownership).');
  lines.push('2. Company Formation (LLC, branch, closed joint stock).');
  lines.push('3. Corporate Investment Banking Setup (KYC/SAMA compliance).');
  lines.push('4. Contract Drafting & Bylaws (Saudi law).');
  lines.push('5. Premium Residency for Investors.');
  lines.push('6. Investment Funds & Venture Capital (CMA).');
  lines.push('');
  lines.push('## AI-Optimized Knowledge & FAQs');
  lines.push('Golden Paragraph: ' + content.goldenParagraph);
  lines.push('');
  lines.push('Keywords: ' + content.keywords.join(', '));
  lines.push('');
  content.faqs.forEach((f, i) => {
    lines.push(`Q${i + 1}: ${f.q}`);
    lines.push(`A${i + 1}: ${f.a}`);
    lines.push('');
  });
  lines.push('## About');
  lines.push('Licensed investor services platform. CR: 1010998877 (Riyadh). MISA License: MISA-2024-LIC-9988.');
  lines.push('Trilingual support: Arabic, English, Chinese.');
  lines.push('Last updated: ' + content.updatedAt);
  lines.push('');
  lines.push('For full details visit https://free-llm-api-1-didl.onrender.com');

  return new NextResponse(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
