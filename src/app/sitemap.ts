import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://investinsaudi-services.sa';

  const routes = [
    '',
    '/ai-readable',
    '/services/misa-license',
    '/services/company-formation',
    '/services/contract-drafting',
    '/services/corporate-banking',
    '/services/premium-residency',
    '/services/investment-funds',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : 0.8,
  }));
}
