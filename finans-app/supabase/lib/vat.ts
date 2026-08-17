/**
 * KDV (Türkiye) hesaplama yardımcıları. Fatura/Masraf formunda tutarı KDV'li
 * / KDV'siz olarak girip karşılığını hesaplamak için kullanılır.
 * Şema değişikliği gerektirmez — sadece "Tutar" alanına aktarılacak nihai
 * değeri hesaplayan saf fonksiyonlardır.
 */

export const KDV_RATES = [1, 10, 20] as const;
export type KdvRate = (typeof KDV_RATES)[number];

export interface KdvBreakdown {
  net: number; // KDV hariç tutar
  kdvAmount: number; // KDV tutarı
  gross: number; // KDV dahil toplam
  rate: number;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** KDV hariç (net) tutardan KDV dahil toplamı hesaplar. */
export function calcGrossFromNet(net: number, ratePercent: number): KdvBreakdown {
  const kdvAmount = round2(net * (ratePercent / 100));
  return { net: round2(net), kdvAmount, gross: round2(net + kdvAmount), rate: ratePercent };
}

/** KDV dahil (brüt) tutardan KDV'yi ayrıştırır. */
export function calcNetFromGross(gross: number, ratePercent: number): KdvBreakdown {
  const net = round2(gross / (1 + ratePercent / 100));
  const kdvAmount = round2(gross - net);
  return { net, kdvAmount, gross: round2(gross), rate: ratePercent };
}
