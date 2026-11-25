import type { Language, Intent } from './types';

export function normalizeDomain(input: string): string {
  const trimmed = (input || '').trim().toLowerCase();
  if (!trimmed) return '';
  let url = trimmed;
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '').replace(/\/+$/, '');
  } catch {
    return trimmed.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

export function detectLanguage(text: string): Language {
  const t = text || '';
  if (/[\u4e00-\u9fff]/.test(t)) return 'zh';
  if (/[\u0600-\u06ff]/.test(t)) return 'ar';
  return 'en';
}

const INTENT_PATTERNS: Array<{ intent: Intent; patterns: RegExp[] }> = [
  {
    intent: 'transactional',
    patterns: [
      /\b(buy|order|hire|register|apply|license|cost|price|quote|contact)\b/i,
      /(?:Ø´Ø±Ø§Ø¡|Ø·Ù„Ø¨|ØªØ³Ø¬ÙŠÙ„|ØªÙ‚Ø¯ÙŠÙ…|Ø±Ø®ØµØ©|ØªÙƒÙ„ÙØ©|Ø³Ø¹Ø±|Ø¹Ø±Ø¶|ØªÙˆØ§ØµÙ„)/,
      /(?:è´­ä¹°|ç”³è¯·|æ³¨å†Œ|è®¸å¯è¯|ä»·æ ¼|æŠ¥ä»·|è”ç³»)/,
    ],
  },
  {
    intent: 'commercial',
    patterns: [
      /\b(best|top|compare|vs|review|rating|alternative)\b/i,
      /(?:Ø£ÙØ¶Ù„|Ù…Ù‚Ø§Ø±Ù†Ø©|ØªÙ‚ÙŠÙŠÙ…|Ø¨Ø¯ÙŠÙ„)/,
      /(?:æœ€ä½³|å¯¹æ¯”|è¯„ä»·|æ›¿ä»£)/,
    ],
  },
  {
    intent: 'navigational',
    patterns: [
      /\b(login|portal|dashboard|official|website)\b/i,
      /(?:ØªØ³Ø¬ÙŠÙ„ Ø¯Ø®ÙˆÙ„|Ø¨ÙˆØ§Ø¨Ø©|Ù…ÙˆÙ‚Ø¹ Ø±Ø³Ù…ÙŠ)/,
      /(?:ç™»å½•|é—¨æˆ·|å®˜ç½‘)/,
    ],
  },
];

export function classifyIntent(term: string): Intent {
  const t = term || '';
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(t))) return intent;
  }
  return 'informational';
}
