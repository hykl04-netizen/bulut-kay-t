import type { MetadataRoute } from 'next';

/**
 * Faz 7 — arama motoru yönergeleri.
 *
 * Yalnızca pazarlama ve yardım sayfaları taranmalı; uygulama içi sayfalar
 * (panel, ayarlar, faturalar…) zaten oturum ister ve indekslenmemeli.
 *
 * NOT: /robots.txt ve /sitemap.xml, lib/supabase/proxy.ts içindeki
 * PUBLIC_PREFIXES listesine eklendi — aksi halde proxy bunları /login'e
 * yönlendirir ve arama motorları siteyi hiç göremez.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL;

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/urun', '/fiyatlandirma', '/sss', '/yardim', '/iletisim', '/gizlilik', '/kullanim-sartlari'],
        disallow: ['/'],
      },
    ],
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
