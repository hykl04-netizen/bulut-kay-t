import type { MetadataRoute } from 'next';

// Next.js bu dosyayı otomatik olarak /manifest.webmanifest'e derler ve
// <head>'e <link rel="manifest"> etiketini kendisi ekler — next-pwa/Serwist
// gibi 3. parti paketlere gerek yok, bu yüzden next.config.ts'e (dolayısıyla
// Turbopack'e) hiç dokunmuyoruz.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FinansApp — Kurumsal Finans Yönetimi',
    short_name: 'FinansApp',
    description: 'Gelir/gider, borç/alacak, fatura, yatırım ve varlıklarınızı tek platformdan yönetin.',
    start_url: '/',
    display: 'standalone',
    /* Açılış ekranı (splash) rengi uygulamanın arka planıyla aynı olmalı;
       #ffffff iken açılışta beyaz bir kare yanıp sönüyordu. */
    background_color: '#eef0f7',
    theme_color: '#eef0f7',
    scope: '/',
    categories: ['finance', 'business', 'productivity'],
    orientation: 'portrait-primary',
    lang: 'tr',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    /* Uygulama kısayolları — telefonda simgeye uzun basınca çıkar.
       Native uygulamaların standart davranışı ve kullanıcıyı en sık
       yaptığı işe iki dokunuşta ulaştırır. */
    shortcuts: [
      {
        name: 'Gider ekle',
        short_name: 'Gider',
        url: '/gelir-gider?hizli=1',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Fatura kes',
        short_name: 'Fatura',
        url: '/faturalar/yeni',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Bu ayın özeti',
        short_name: 'Rapor',
        url: '/raporlar',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
