

const EXCLUDED_DOMAINS = new Set([
  'misa.gov.sa', 'sama.gov.sa', 'cma.gov.sa', 'mol.gov.sa', 'mci.gov.sa',
  'modon.gov.sa', 'zatca.gov.sa', 'hrsd.gov.sa', 'momah.gov.sa',
  'wikipedia.org', 'en.wikipedia.org', 'ar.wikipedia.org', 'zh.wikipedia.org',
  'youtube.com', 'linkedin.com', 'facebook.com', 'twitter.com', 'x.com',
  'reddit.com', 'quora.com', 'medium.com',
]);

const EXCLUDED_SUFFIXES = ['.gov.sa', '.edu.sa', '.gov.cn', '.gouv.fr'];

export function isExcludedDomain(domain: string): boolean {
  const d = (domain || '').toLowerCase().trim();
  if (!d) return true;
  if (EXCLUDED_DOMAINS.has(d)) return true;
  if (EXCLUDED_SUFFIXES.some((s) => d.endsWith(s))) return true;
  // Directory/news/official patterns
  if (/(directory|yellowpages|yelp|trustpilot|glassdoor|indeed)/.test(d)) return true;
  return false;
}
