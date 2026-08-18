/**
 * Öneri 9 — hata görünürlüğü.
 *
 * Şu ana kadar hiçbir hata izleme yoktu: bir kullanıcı hata aldığında sizin
 * haberiniz olmuyordu, ancak o kişi size yazarsa öğreniyordunuz.
 *
 * Bu modül bilinçli olarak SAĞLAYICIDAN BAĞIMSIZ ve BAĞIMLILIKSIZ tutuldu:
 * `NEXT_PUBLIC_HATA_BILDIRIM_URL` tanımlıysa hatalar oraya JSON olarak
 * gönderilir, tanımlı değilse yalnızca konsola yazılır. Böylece hiçbir üçüncü
 * taraf script'i varsayılan olarak yüklenmiyor (gizlilik metnindeki taahhüt
 * korunuyor) ve sağlayıcı değiştirmek tek bir ortam değişkeni.
 *
 * SENTRY'E GEÇMEK İSTERSENİZ:
 *   1) npm i @sentry/nextjs && npx @sentry/wizard@latest -i nextjs
 *   2) Aşağıdaki `reportError` gövdesini `Sentry.captureException(error)` ile
 *      değiştirin — çağrı noktaları (error.tsx / global-error.tsx) aynı kalır.
 * Sentry otomatik yakalama ve kaynak haritası desteği sunar; bu modül yalnızca
 * elle raporlanan hataları görür.
 */

export interface ErrorContext {
  /** Hatanın nereden geldiği: 'sayfa', 'global', 'elle' vb. */
  source?: string;
  /** Next.js'in ürettiği hata özeti (sunucu tarafı hatalarında dolu gelir). */
  digest?: string;
  extra?: Record<string, unknown>;
}

function endpoint(): string | null {
  return process.env.NEXT_PUBLIC_HATA_BILDIRIM_URL || null;
}

export function isErrorReportingConfigured(): boolean {
  return Boolean(endpoint());
}

export function reportError(error: unknown, context: ErrorContext = {}): void {
  const normalized =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: 'UnknownError', message: String(error) };

  // Geliştirme sırasında her zaman konsola da yaz.
  console.error('[FinansApp]', normalized.message, error);

  const url = endpoint();
  if (!url) return;

  const payload = {
    ...normalized,
    ...context,
    url: typeof window !== 'undefined' ? window.location.href : null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    at: new Date().toISOString(),
  };

  try {
    // sendBeacon sayfa kapanırken bile iletir; yoksa fetch'e düşülür.
    // Hata bildirimi başarısız olursa SESSİZCE yutulur — raporlama hatasının
    // asıl hatayı gölgelemesi kullanıcı için daha kötü olurdu.
    const body = JSON.stringify(payload);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // yut
  }
}
