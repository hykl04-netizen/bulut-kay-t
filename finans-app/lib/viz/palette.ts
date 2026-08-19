/**
 * Grafik renk paleti — DOĞRULANMIŞ.
 *
 * Eski palet (lib/onboarding.ts'teki kategori tohum renkleri) görselleştirme
 * denetiminden GEÇMİYORDU:
 *   - #f97316 (turuncu) ↔ #ef4444 (kırmızı): normal görüşte ΔE 10.4
 *     (eşik 15) — renk körü olmayan biri bile pastadaki iki dilimi
 *     ayırt edemiyordu
 *   - #64748b (slate): kroma tabanının altında, gri okunuyordu
 *
 * Aşağıdaki 8 slot her iki modda da altı denetimin tamamını geçiyor
 * (kart yüzeyleri #ffffff ve #171b37 ile doğrulandı):
 *   açık  → CVD ΔE 9.1 · normal görüş ΔE 19.6
 *   koyu  → CVD ΔE 8.4 · normal görüş ΔE 19.3
 *
 * KURALLAR
 *   1. Sıra sabittir; renkler DÖNGÜYE SOKULMAZ. 9. seri üretilmez —
 *      `foldToOther()` ile "Diğer"e katlanır.
 *   2. Renk varlığı takip eder, sırasını değil. Filtre bir seriyi
 *      elerse kalanların rengi DEĞİŞMEZ.
 *   3. Durum renkleri (gelir/gider/uyarı) seri rengi olarak kullanılmaz.
 *   4. Metin asla seri rengini giymez; kimlik metnin YANINDAKİ renkli
 *      işaretten gelir.
 */

export type VizMode = 'light' | 'dark';

/** Kategorik seri renkleri — sabit sıra. */
export const SERIES_LIGHT = [
  '#2a78d6', // 1 mavi
  '#eb6834', // 2 turuncu
  '#1baf7a', // 3 turkuaz
  '#eda100', // 4 sarı
  '#e87ba4', // 5 macenta
  '#008300', // 6 yeşil
  '#4a3aa7', // 7 mor
  '#e34948', // 8 kırmızı
] as const;

export const SERIES_DARK = [
  '#3987e5',
  '#d95926',
  '#199e70',
  '#c98500',
  '#d55181',
  '#008300',
  '#9085e9',
  '#e66767',
] as const;

export const MAX_SERIES = SERIES_LIGHT.length;

/** "Diğer" kovası — kasıtlı olarak nötr; kimlik taşımaz. */
export const OTHER_COLOR_LIGHT = '#94a3b8';
export const OTHER_COLOR_DARK = '#64748b';

/**
 * Durum renkleri. Seri paletinden AYRI tutulur; "4. seri" olarak
 * yeniden kullanılmaz. Her zaman ikon + etiketle birlikte gösterilir,
 * asla tek başına renkle değil.
 */
export const STATUS = {
  gelir: { light: '#0f9d63', dark: '#34d399' },
  gider: { light: '#dc2626', dark: '#f87171' },
  uyari: { light: '#b45309', dark: '#fbbf24' },
  notr: { light: '#64748b', dark: '#94a3b8' },
} as const;

export type StatusKey = keyof typeof STATUS;

export function statusColor(key: StatusKey, mode: VizMode): string {
  return STATUS[key][mode];
}

/**
 * Bir varlığın (kategori adı gibi) rengini sabit sırayla verir.
 * `index` çağıran tarafta varlığa göre SABİTLENMİŞ olmalı — sıralama
 * değiştiğinde renk değişmemeli.
 */
export function seriesColor(index: number, mode: VizMode): string {
  const palette = mode === 'dark' ? SERIES_DARK : SERIES_LIGHT;
  if (index < 0 || index >= palette.length) {
    return mode === 'dark' ? OTHER_COLOR_DARK : OTHER_COLOR_LIGHT;
  }
  return palette[index];
}

export interface Slice {
  label: string;
  value: number;
}

/**
 * 8'den fazla dilimi "Diğer"e katlar. Yeni renk ÜRETMEZ — paletin
 * dışına çıkmak, doğrulanmış ayırt edilebilirliği bozar.
 */
export function foldToOther<T extends Slice>(
  slices: T[],
  limit: number = MAX_SERIES
): (Slice & { isOther?: boolean })[] {
  if (slices.length <= limit) return slices;
  const sorted = [...slices].sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, limit - 1);
  const tailTotal = sorted.slice(limit - 1).reduce((sum, s) => sum + s.value, 0);
  return [...head, { label: 'Diğer', value: tailTotal, isOther: true }];
}
