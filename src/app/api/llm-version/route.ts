import { NextResponse } from 'next/server';

export async function GET() {
  const text = `# Invest in Saudi — Investor Services (AI-Readable)

This is a machine-readable, text-only version of the site for LLMs and AI search engines.

## Official Contact
- Phone / WhatsApp: +966545059528
- WhatsApp: https://wa.me/966545059528
- Email: (configure in dashboard)

## Offices
- Head Office: Riyadh (King Fahd Road, Al Olaya)
- Branches: Jeddah, Madinah, Dammam

## Services
1. MISA Foreign Investment License (100% foreign ownership).
2. Company Formation (LLC, branch, closed joint stock).
3. Corporate Investment Banking Setup (KYC/SAMA compliance).
4. Contract Drafting & Bylaws (Saudi law).
5. Premium Residency for Investors.
6. Investment Funds & Venture Capital (CMA).

## About
Licensed investor services platform. CR: 1010998877 (Riyadh). MISA License: MISA-2024-LIC-9988.
Trilingual support: Arabic, English, Chinese.

For full details visit https://free-llm-api-1-didl.onrender.com
`;
  return new NextResponse(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
