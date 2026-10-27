import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${getSiteUrl()}/`,
      lastModified: new Date('2026-10-27'),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
