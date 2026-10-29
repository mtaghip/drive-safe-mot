import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site.ts';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: base + '/', changeFrequency: 'weekly', priority: 1 },
    { url: base + '/services', changeFrequency: 'monthly', priority: 0.8 },
    { url: base + '/book', changeFrequency: 'daily', priority: 0.9 },
    { url: base + '/book-mot-luton', changeFrequency: 'weekly', priority: 0.9 },
    { url: base + '/contact', changeFrequency: 'yearly', priority: 0.6 },
    { url: base + '/privacy', changeFrequency: 'yearly', priority: 0.2 },
  ];
}
