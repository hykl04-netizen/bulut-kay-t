// FinansApp — minimal service worker
//
// Bilinçli olarak next-pwa / Serwist gibi bir paket KULLANMIYORUZ: bu proje
// Next.js 16 + Turbopack ile derleniyor ve o paketlerin ikisi de (tam veya
// kısmen) Webpack gerektiriyor. Bunun yerine elle yazılmış, sade bir "app
// shell" servis çalışanı kullanıyoruz. next.config.ts / Turbopack'e dokunmaz.
//
// Strateji:
// - Supabase'e giden (finansal veri) istekleri HİÇ karışmıyoruz — asla eski/
//   bayat veri servis etmemek için bunlar her zaman ağdan gidiyor.
// - Aynı-origin statik varlıklar (JS/CSS/ikonlar): cache-first, arka planda
//   ağdan tazeleme (stale-while-revalidate).
// - Sayfa gezinmeleri (navigation): network-first; ağ yoksa önbellekteki son
//   görünümü, o da yoksa çok basit bir "çevrimdışısınız" sayfası döner.

const CACHE_VERSION = 'finansapp-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

const OFFLINE_FALLBACK_HTML = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Çevrimdışı — FinansApp</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0;
    display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; text-align: center; }
  h1 { font-size: 1.25rem; margin-bottom: 8px; }
  p { color: #94a3b8; margin: 0; }
</style></head>
<body><div><h1>İnternet bağlantısı yok</h1>
<p>FinansApp'ın verilerine ulaşmak için bağlantınızı kontrol edip tekrar deneyin.</p></div></body></html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {
      // Precache tek tek denenebilir hale getirilebilir; ilk sürümde
      // sessizce başarısız olması kurulumu engellemesin.
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('finansapp-') && key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isSupabaseRequest(url) {
  return url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Finansal veriye asla önbellekten cevap verme — her zaman ağa git.
  if (isSupabaseRequest(url)) return;

  // Başka origin'lere (fontlar, vb.) karışma, tarayıcının varsayılanına bırak.
  if (url.origin !== self.location.origin) return;

  // Sayfa gezinmeleri: network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || new Response(OFFLINE_FALLBACK_HTML, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        })
    );
    return;
  }

  // Statik varlıklar (_next/static, ikonlar, vb.): cache-first + arkada tazele
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

// Mobil bildirimler (PWA push) — sunucudaki `/api/cron/bildirim-gonder`
// route'u web-push ile bu olayı tetikler. Payload JSON: { title, body, url }.
self.addEventListener('push', (event) => {
  let payload = { title: 'FinansApp', body: 'Yeni bir bildiriminiz var.', url: '/' };
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/' },
    })
  );
});

// Bildirime tıklanınca ilgili sayfayı (zaten açık bir sekme varsa onu odaklayarak,
// yoksa yeni sekme açarak) gösterir.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
