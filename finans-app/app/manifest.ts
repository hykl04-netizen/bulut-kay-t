import type { MetadataRoute } from 'next';

// Next.js bu dosyayı otomatik olarak /manifest.webmanifest'e derler ve
// <head>'e <link rel="manifest"> etiketini kendisi ekler — next-pwa/Serwist
// gibi 3. parti paketlere gerek yok, bu yüzden next.config.ts'e (dolayısıyla
// Turbopack'e) hiç dokunmuyoruz.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FinansApp — Kişisel Finans Yönetimi',
    short_name: 'FinansApp',
    description: 'Gelir/gider, borç/alacak, fatura, yatırım ve varlıklarınızı tek yerden takip edin.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#0f172a',
    orientation: 'portrait-primary',
    lang: 'tr',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
