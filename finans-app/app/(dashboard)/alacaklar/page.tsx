'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { HandCoins, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentWorkspaceId } from '@/lib/supabase/workspace';
import { fetchInvoices, formatMoney, resolveStatus, type InvoiceWithCustomer } from '@/lib/invoices';
import {
  buildAging,
  totalsByBucket,
  BUCKET_LABELS,
  BUCKET_ORDER,
  daysOverdue,
  type CustomerAging,
} from '@/lib/receivables';
import { toast } from '@/components/ui/toaster';

/**
 * Öneri 6 — alacak yaşlandırma tablosu.
 *
 * Tahsil edilmemiş faturaları cari bazında 0-30 / 31-60 / 61-90 / 90+ gün
 * kovalarına dağıtır. En riskli cari en üstte (önce en eski gecikme).
 */
export default function AlacaklarPage() {
  const [invoices, setInvoices] = useState<InvoiceWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const wsId = await getCurrentWorkspaceId(user.id);
      if (cancelled) return;
      try {
        const list = await fetchInvoices(wsId);
        if (!cancelled) setInvoices(list);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Faturalar yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Yükleniyor...
      </div>
    );
  }

  const rows = buildAging(invoices);
  const totals = totalsByBucket(rows);
  const grandTotal = BUCKET_ORDER.reduce((s, b) => s + totals[b], 0);
  const overdueTotal = grandTotal - totals.guncel;

  const invoicesOf = (row: CustomerAging) =>
    invoices
      .filter((inv) => {
        const display = resolveStatus(inv);
        if (display !== 'gonderildi' && display !== 'gecikti') return false;
        return (inv.customer_id ?? '__belirsiz__') === (row.customerId ?? '__belirsiz__');
      })
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HandCoins className="h-7 w-7 text-brand-gold" />
        <h1 className="text-3xl font-bold text-foreground">Alacak Yaşlandırma</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Gönderilmiş ama henüz tahsil edilmemiş faturalarınız. Taslak ve iptal edilen faturalar
        alacak sayılmaz.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="font-medium text-foreground">Tahsil edilmemiş faturanız yok.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href="/faturalar" className="text-primary hover:underline">
              Kesilen faturalar
            </Link>{' '}
            sayfasından yeni fatura oluşturabilirsiniz.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Toplam alacak</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{formatMoney(grandTotal)}</p>
            </div>
            <div
              className={`rounded-xl border p-4 ${
                overdueTotal > 0
                  ? 'border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30'
                  : 'border-border bg-card'
              }`}
            >
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {overdueTotal > 0 && <AlertTriangle className="h-4 w-4 text-rose-600" />}
                Vadesi geçmiş
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">{formatMoney(overdueTotal)}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Cari</th>
                  {BUCKET_ORDER.map((b) => (
                    <th key={b} className="px-4 py-3 text-right font-medium">
                      {BUCKET_LABELS[b]}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium">Toplam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => {
                  const key = row.customerId ?? '__belirsiz__';
                  const isOpen = expanded === key;
                  return (
                    <Fragment key={key}>
                      <tr
                        onClick={() => setExpanded(isOpen ? null : key)}
                        className="cursor-pointer hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground">{row.customerName}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {row.invoiceCount} fatura
                          </span>
                          {row.oldestOverdueDays > 0 && (
                            <span className="ml-2 rounded-full bg-rose-100 px-1.5 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                              {row.oldestOverdueDays} gün
                            </span>
                          )}
                        </td>
                        {BUCKET_ORDER.map((b) => (
                          <td
                            key={b}
                            className={`px-4 py-3 text-right ${
                              row.buckets[b] === 0
                                ? 'text-muted-foreground/40'
                                : b === 'gun_90_plus' || b === 'gun_61_90'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-foreground'
                            }`}
                          >
                            {row.buckets[b] === 0 ? '—' : formatMoney(row.buckets[b])}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right font-semibold text-foreground">
                          {formatMoney(row.total)}
                        </td>
                      </tr>

                      {isOpen &&
                        invoicesOf(row).map((inv) => {
                          const overdue = daysOverdue(inv.due_date) ?? 0;
                          return (
                            <tr key={inv.id} className="bg-muted/20 text-xs">
                              <td className="px-4 py-2 pl-8" colSpan={2}>
                                <Link
                                  href={`/faturalar/${inv.id}`}
                                  className="text-primary hover:underline"
                                >
                                  {inv.invoice_number}
                                </Link>
                                <span className="ml-2 text-muted-foreground">
                                  vade{' '}
                                  {inv.due_date
                                    ? new Date(`${inv.due_date}T00:00:00`).toLocaleDateString('tr-TR')
                                    : '—'}
                                  {overdue > 0 ? ` · ${overdue} gün gecikmiş` : ''}
                                </span>
                              </td>
                              <td colSpan={3} />
                              <td className="px-4 py-2 text-right text-foreground">
                                {formatMoney(Number(inv.total), inv.currency)}
                              </td>
                            </tr>
                          );
                        })}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-border bg-muted/30">
                <tr>
                  <td className="px-4 py-3 font-semibold text-foreground">Toplam</td>
                  {BUCKET_ORDER.map((b) => (
                    <td key={b} className="px-4 py-3 text-right font-semibold text-foreground">
                      {totals[b] === 0 ? '—' : formatMoney(totals[b])}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-bold text-foreground">
                    {formatMoney(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            Bir cariye tıklayarak o carinin açık faturalarını görebilirsiniz.
          </p>
        </>
      )}
    </div>
  );
}
