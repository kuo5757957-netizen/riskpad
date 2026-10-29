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
    {
      url: `${getSiteUrl()}/flowpad/`,
      lastModified: new Date('2026-10-29'),
      changeFrequency: 'hourly',
      priority: 0.4,
    },
  ];
}
