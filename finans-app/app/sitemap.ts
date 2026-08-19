import type { MetadataRoute } from 'next';
import { HELP_ARTICLES } from '@/lib/help-articles';

/**
 * Faz 7 — site haritası. Yalnızca herkese açık pazarlama ve yardım sayfaları.
 * `NEXT_PUBLIC_APP_URL` tanımlı değilse boş döner (yanlış alan adıyla site
 * haritası üretmektense hiç üretmemek daha iyi).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) return [];

  const staticPaths = [
    { path: '/urun', priority: 1 },
    { path: '/demo', priority: 0.95 },
    { path: '/fiyatlandirma', priority: 0.9 },
    { path: '/sss', priority: 0.7 },
    { path: '/yardim', priority: 0.7 },
    { path: '/iletisim', priority: 0.5 },
    { path: '/gizlilik', priority: 0.3 },
    { path: '/kullanim-sartlari', priority: 0.3 },
  ];

  return [
    ...staticPaths.map((entry) => ({
      url: `${base}${entry.path}`,
      changeFrequency: 'monthly' as const,
      priority: entry.priority,
    })),
    ...HELP_ARTICLES.map((article) => ({
      url: `${base}/yardim/${article.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
