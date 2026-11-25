

const KEYWORD_STOPWORDS = new Set([
  'in', 'saudi', 'arabia', 'ksa', 'the', 'a', 'an', 'for', 'of', 'to',
  'ÙÙŠ', 'Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ©', 'Ø³Ø¹ÙˆØ¯ÙŠ', 'Ù„', 'Ù…Ù†', 'Ø¹Ù„Ù‰',
  'åœ¨', 'æ²™ç‰¹', 'é˜¿æ‹‰ä¼¯', 'çš„',
]);

const KEYWORD_MODIFIERS = new Set([
  'fees', 'fee', 'cost', 'price', 'prices', 'requirements', 'requirement',
  'renewal', 'renew', 'check', 'verification', 'verify', 'online', 'application',
  'costs', 'procedure', 'process', 'documents', 'steps',
  'ØªÙƒÙ„ÙØ©', 'Ø±Ø³ÙˆÙ…', 'Ù…ØªØ·Ù„Ø¨Ø§Øª', 'ØªØ¬Ø¯ÙŠØ¯', 'ØªØ­Ù‚Ù‚', 'Ø§Ø¬Ø±Ø§Ø¡Ø§Øª', 'Ù…Ø³ØªÙ†Ø¯Ø§Øª',
  'è´¹ç”¨', 'è¦æ±‚', 'ç»­æœŸ', 'éªŒè¯',
]);

export function normalizeKeywordCore(term: string): string {
  const t = (term || '').toLowerCase().trim();
  if (!t) return '';
  const tokens = t.split(/\s+/).filter(Boolean);
  const core = tokens.filter((tok) => !KEYWORD_STOPWORDS.has(tok) && !KEYWORD_MODIFIERS.has(tok));
  return (core.length ? core : tokens).join(' ');
}

export function clusterKeywords<T extends { id: string; term: string; language: string; intent: string }>(
  keywords: T[]
): Array<{ core: string; language: string; intent: string; representative: T; members: T[] }> {
  const groups = new Map<string, T[]>();
  for (const k of keywords) {
    const core = normalizeKeywordCore(k.term);
    const key = `${k.language}|${k.intent}|${core}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(k);
  }
  const clusters = [];
  for (const entry of Array.from(groups.entries())) {
    const key = entry[0];
    const members = entry[1];
    const [language, intent, core] = key.split('|', 3);
    // representative: shortest term (most general)
    const representative = members.reduce((a, b) => (a.term.length <= b.term.length ? a : b));
    clusters.push({ core, language, intent, representative, members });
  }
  return clusters;
}
