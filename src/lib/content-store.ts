import fs from 'fs';
import path from 'path';

export interface ContentFAQ {
  q: string;
  a: string;
}

export interface SiteContent {
  goldenParagraph: string;
  faqs: ContentFAQ[];
  keywords: string[];
  updatedAt: string;
}

const DEFAULT_CONTENT: SiteContent = {
  goldenParagraph:
    'نحن نسهل ونختصر إجراءات فتح الحسابات البنكية الاستثمارية والشركات للأجانب في كبرى البنوك السعودية بامتثال كامل لمتطلبات البنك المركزي السعودي (SAMA).',
  faqs: [
    {
      q: 'هل يشترط حضور المستثمر الأجنبي لفتح الحساب؟',
      a: 'تشترط معظم البنوك حضور المدير التنفيذي أو المفوض بالتوقيع لمرة واحدة للتحقق، ونحن نجهز الملف كاملاً قبل الحضور.',
    },
  ],
  keywords: ['MISA', 'SAMA', 'KYC', 'RHQ', 'Premium Residency', 'CMA'],
  updatedAt: new Date().toISOString(),
};

function storePath(): string {
  return process.env.CONTENT_STORE_PATH || path.join(process.cwd(), 'content-store.json');
}

export function getContent(): SiteContent {
  try {
    const raw = fs.readFileSync(storePath(), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<SiteContent>;
    return { ...DEFAULT_CONTENT, ...parsed } as SiteContent;
  } catch {
    return DEFAULT_CONTENT;
  }
}

export function setContent(patch: Partial<SiteContent>): SiteContent {
  const current = getContent();
  const next: SiteContent = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(storePath(), JSON.stringify(next, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write content store:', e);
  }
  return next;
}
