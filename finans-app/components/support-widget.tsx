'use client';

import Script from 'next/script';

/**
 * Faz 8 — canlı destek widget'ı (Crisp, Tawk.to, Intercom vb.).
 *
 * Sağlayıcıya bağımlı kalmamak için widget yalnızca bir ORTAM DEĞİŞKENİ ile
 * açılır: `NEXT_PUBLIC_DESTEK_WIDGET_SRC` tanımlıysa o script yüklenir, değilse
 * hiçbir şey render edilmez. Böylece:
 *
 *   - Değişken tanımlanmadan uygulama hiçbir üçüncü taraf script'i yüklemez
 *     (gizlilik metnindeki "üçüncü taraf takip çerezi kullanılmaz" ifadesi
 *     varsayılan olarak doğru kalır),
 *   - Sağlayıcı değiştirmek tek bir değişken güncellemesi.
 *
 * KURULUM: Sağlayıcınızın verdiği gömme kodundaki script URL'sini
 * `NEXT_PUBLIC_DESTEK_WIDGET_SRC` olarak tanımlayın. Örnek (Tawk.to):
 *   NEXT_PUBLIC_DESTEK_WIDGET_SRC=https://embed.tawk.to/XXXXXXXX/default
 *
 * ÖNEMLİ: Canlı destek widget'ları kullanıcı verisi işler. Bir sağlayıcı
 * bağlamadan önce gizlilik metnindeki (app/(pazarlama)/gizlilik) "Çerezler" ve
 * "Aktarım" bölümlerini bu sağlayıcıyı da kapsayacak şekilde güncelleyin.
 */
export function SupportWidget() {
  const src = process.env.NEXT_PUBLIC_DESTEK_WIDGET_SRC;
  if (!src) return null;

  return <Script src={src} strategy="lazyOnload" crossOrigin="anonymous" />;
}
