import type { InvoiceWithCustomer } from './invoices';
import { resolveStatus } from './invoices';

/**
 * Öneri 6 — alacak yaşlandırma ve cari bakiyesi.
 *
 * "Bu müşteri bana ne kadar borçlu ve ne zamandır geciktiriyor" sorusu, küçük
 * işletmenin en sık baktığı şey. Mevcut fatura verisinden hesaplanıyor; ek
 * tablo gerekmiyor.
 *
 * Kapsam: yalnızca TAHSİL EDİLMEMİŞ faturalar (gönderilmiş ama ödenmemiş).
 * Taslak faturalar henüz müşteriye iletilmediği için, iptal edilenler de
 * geçersiz olduğu için alacak sayılmaz.
 */

export type AgingBucket = 'guncel' | 'gun_0_30' | 'gun_31_60' | 'gun_61_90' | 'gun_90_plus';

export const BUCKET_LABELS: Record<AgingBucket, string> = {
  guncel: 'Vadesi gelmedi',
  gun_0_30: '0-30 gün',
  gun_31_60: '31-60 gün',
  gun_61_90: '61-90 gün',
  gun_90_plus: '90+ gün',
};

export const BUCKET_ORDER: AgingBucket[] = ['guncel', 'gun_0_30', 'gun_31_60', 'gun_61_90', 'gun_90_plus'];

/** Vadesinden bu yana geçen gün sayısı (negatifse vadesi gelmemiş). */
export function daysOverdue(dueDate: string | null, today = new Date()): number | null {
  if (!dueDate) return null;
  const due = new Date(`${dueDate}T23:59:59`);
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export function bucketFor(dueDate: string | null, today = new Date()): AgingBucket {
  const days = daysOverdue(dueDate, today);
  // Vade girilmemiş faturayı gecikmiş saymak yanıltıcı olur — "vadesi gelmedi".
  if (days === null || days < 0) return 'guncel';
  if (days <= 30) return 'gun_0_30';
  if (days <= 60) return 'gun_31_60';
  if (days <= 90) return 'gun_61_90';
  return 'gun_90_plus';
}

export interface CustomerAging {
  customerId: string | null;
  customerName: string;
  buckets: Record<AgingBucket, number>;
  total: number;
  invoiceCount: number;
  oldestOverdueDays: number;
}

function emptyBuckets(): Record<AgingBucket, number> {
  return { guncel: 0, gun_0_30: 0, gun_31_60: 0, gun_61_90: 0, gun_90_plus: 0 };
}

/** Tahsil edilmemiş faturaları cari bazında yaşlandırma kovalarına dağıtır. */
export function buildAging(invoices: InvoiceWithCustomer[], today = new Date()): CustomerAging[] {
  const open = invoices.filter((inv) => {
    const display = resolveStatus(inv);
    return display === 'gonderildi' || display === 'gecikti';
  });

  const byCustomer = new Map<string, CustomerAging>();

  for (const inv of open) {
    const key = inv.customer_id ?? '__belirsiz__';
    let row = byCustomer.get(key);
    if (!row) {
      row = {
        customerId: inv.customer_id,
        customerName: inv.customers?.name ?? 'Cari belirtilmemiş',
        buckets: emptyBuckets(),
        total: 0,
        invoiceCount: 0,
        oldestOverdueDays: 0,
      };
      byCustomer.set(key, row);
    }

    const amount = Number(inv.total) || 0;
    row.buckets[bucketFor(inv.due_date, today)] += amount;
    row.total += amount;
    row.invoiceCount += 1;
    row.oldestOverdueDays = Math.max(row.oldestOverdueDays, daysOverdue(inv.due_date, today) ?? 0);
  }

  // En riskli cari en üstte: önce en eski gecikme, sonra en büyük tutar.
  return [...byCustomer.values()].sort(
    (a, b) => b.oldestOverdueDays - a.oldestOverdueDays || b.total - a.total
  );
}

/** Tüm carilerin kova toplamları — özet satırı için. */
export function totalsByBucket(rows: CustomerAging[]): Record<AgingBucket, number> {
  const totals = emptyBuckets();
  for (const row of rows) {
    for (const bucket of BUCKET_ORDER) totals[bucket] += row.buckets[bucket];
  }
  return totals;
}
