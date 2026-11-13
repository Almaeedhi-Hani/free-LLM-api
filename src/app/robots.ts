import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.SITE_URL || 'https://free-llm-api-1-didl.onrender.com';

  const userAgents = [
    // 1. القواعد العامة والمحركات العالمية الشاملة
    '*',
    'CCBot',

    // 2. روبوتات الذكاء الاصطناعي الغربية والأمريكية
    'GPTBot',
    'ChatGPT-User',
    'OAI-SearchBot',
    'Google-Extended',
    'PerplexityBot',
    'ClaudeBot',
    'Claude-Web',
    'Anthropic-AI',
    'Meta-ExternalAgent',
    'Meta-ExternalFetcher',
    'bingbot',
    'Adidxbot',
    'Applebot',
    'Applebot-Extended',
    'Cohere-AI',

    // 3. روبوتات الذكاء الاصطناعي والبحث الصينية
    'Baiduspider',
    'Baiduspider-render',
    'Bytespider',
    'AlibabaBot',
    'TencentTraveler',
    'Sogou web spider',
    'YisouSpider',
    '360Spider',

    // 4. روبوتات الذكاء الاصطناعي الأوروبية والروسية
    'Yandex',
    'YandexBot',
    'MojeekBot',
    'Qwantify',
  ];

  return {
    rules: userAgents.map((userAgent) => ({
      userAgent,
      allow: '/',
      disallow: ['/admin/', '/api/admin/', '/api/geo/', '/api/cron'],
    })),
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
