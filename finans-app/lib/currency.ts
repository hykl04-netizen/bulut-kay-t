/**
 * Çoklu para birimi desteği için yardımcılar.
 * Gelir/Gider işlemlerine TRY dışında bir para birimi girildiğinde, güncel
 * kuru çekip TL karşılığını (`try_equivalent`) otomatik hesaplar.
 *
 * Kur kaynağı: frankfurter.app (Avrupa Merkez Bankası verisine dayanır,
 * API anahtarı gerektirmez, ücretsizdir). Ağ isteği başarısız olursa
 * kullanıcı kuru elle girebilir.
 */

export type SupportedCurrency = 'TRY' | 'USD' | 'EUR' | 'GBP';

export const SUPPORTED_CURRENCIES: { code: SupportedCurrency; label: string; symbol: string }[] = [
  { code: 'TRY', label: 'Türk Lirası', symbol: '₺' },
  { code: 'USD', label: 'ABD Doları', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'İngiliz Sterlini', symbol: '£' },
];

const RATE_CACHE_KEY_PREFIX = 'finansapp:fx-rate:';
const RATE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 saat

interface CachedRate {
  rate: number;
  fetchedAt: number;
}

function readCache(currency: string): CachedRate | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(RATE_CACHE_KEY_PREFIX + currency);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRate;
    if (Date.now() - parsed.fetchedAt > RATE_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(currency: string, rate: number) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      RATE_CACHE_KEY_PREFIX + currency,
      JSON.stringify({ rate, fetchedAt: Date.now() } satisfies CachedRate)
    );
  } catch {
    // localStorage kapalı/dolu olabilir — kritik değil, kur her seferinde ağdan çekilir.
  }
}

/**
 * `currency` biriminden 1 birimin kaç TL ettiğini döner (örn. USD → 34.56).
 * TRY için her zaman 1 döner. Ağ hatasında `null` döner; çağıran taraf
 * kullanıcıdan manuel kur istemeli.
 */
export async function fetchRateToTRY(currency: SupportedCurrency): Promise<number | null> {
  if (currency === 'TRY') return 1;

  const cached = readCache(currency);
  if (cached) return cached.rate;

  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${currency}&to=TRY`);
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data?.rates?.TRY;
    if (typeof rate !== 'number' || !Number.isFinite(rate)) return null;
    writeCache(currency, rate);
    return rate;
  } catch {
    return null;
  }
}

export function convertToTRY(amount: number, exchangeRate: number): number {
  return Math.round(amount * exchangeRate * 100) / 100;
}

// ---------------------------------------------------------------------------
// Para biçimlendirme — TEK KAYNAK
//
// Bu üç fonksiyon uygulamadaki tüm tutar gösterimlerinin tek kaynağıdır.
// Daha önce 19 ayrı dosyada `new Intl.NumberFormat('tr-TR', ...)` kopyası
// vardı; kuruş gösterimi ve para birimi davranışı dosyadan dosyaya
// kayıyordu. Yeni kodda doğrudan bunları kullanın, yerel formatter tanımlamayın.
//
// Intl.NumberFormat örneği oluşturmak pahalıdır (her çağrıda locale verisi
// çözümlenir), bu yüzden örnekler anahtara göre önbelleklenir.
// ---------------------------------------------------------------------------

interface MoneyOptions {
  /** Varsayılan 2. Rapor/özet kartlarında kuruşu gizlemek için 0 verin. */
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, options: MoneyOptions): Intl.NumberFormat {
  const key = `${currency}|${options.maximumFractionDigits ?? ''}|${options.minimumFractionDigits ?? ''}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;
  const created = new Intl.NumberFormat('tr-TR', { style: 'currency', currency, ...options });
  formatterCache.set(key, created);
  return created;
}

/**
 * Tutarı Türkçe biçimde, para birimi simgesiyle döndürür.
 * Geçersiz bir para birimi kodu gelirse (kullanıcı verisinden gelebilir)
 * Intl hata fırlatır; bu durumda sade bir yedek biçim döneriz.
 */
export function formatCurrency(
  amount: number,
  currency: string = 'TRY',
  options: MoneyOptions = {}
): string {
  try {
    return getFormatter(currency, options).format(amount);
  } catch {
    return `${amount.toFixed(options.maximumFractionDigits ?? 2)} ${currency}`;
  }
}

/** `formatCurrency(amount, 'TRY')` kısayolu — en sık kullanılan biçim. */
export function formatTRY(amount: number): string {
  return formatCurrency(amount, 'TRY');
}

/**
 * Kuruşsuz TL — özet kartları, bütçe ve rapor başlıklarında sayıyı
 * okunur tutmak için kullanılır (örn. "₺12.480").
 */
export function formatTRYWhole(amount: number): string {
  return formatCurrency(amount, 'TRY', { maximumFractionDigits: 0 });
}
