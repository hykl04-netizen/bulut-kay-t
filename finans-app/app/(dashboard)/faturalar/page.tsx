'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentWorkspaceId } from '@/lib/supabase/workspace';
import {
  fetchInvoices,
  formatMoney,
  resolveStatus,
  STATUS_CLASSES,
  STATUS_LABELS,
  type DisplayStatus,
  type InvoiceWithCustomer,
} from '@/lib/invoices';
import { toast } from '@/components/ui/toaster';

/**
 * Faz 5 — kesilen faturaların listesi. "Gecikti" durumu saklanmıyor,
 * vade tarihinden türetiliyor (bkz. lib/invoices.ts → resolveStatus).
 */

const FILTERS: { key: DisplayStatus | 'hepsi'; label: string }[] = [
  { key: 'hepsi', label: 'Hepsi' },
  { key: 'taslak', label: 'Taslak' },
  { key: 'gonderildi', label: 'Gönderildi' },
  { key: 'gecikti', label: 'Gecikti' },
  { key: 'odendi', label: 'Ödendi' },
  { key: 'iptal', label: 'İptal' },
];

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString('tr-TR');
}

export default function FaturalarPage() {
  const [invoices, setInvoices] = useState<InvoiceWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DisplayStatus | 'hepsi'>('hepsi');

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

  const withStatus = invoices.map((inv) => ({ ...inv, display: resolveStatus(inv) }));
  const visible = filter === 'hepsi' ? withStatus : withStatus.filter((i) => i.display === filter);

  const openTotal = withStatus
    .filter((i) => i.display === 'gonderildi' || i.display === 'gecikti')
    .reduce((sum, i) => sum + Number(i.total), 0);
  const overdueCount = withStatus.filter((i) => i.display === 'gecikti').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-brand-gold" />
          <h1 className="text-3xl font-bold text-foreground">Kesilen Faturalar</h1>
        </div>
        <Link
          href="/faturalar/yeni"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-secondary transition"
        >
          <Plus className="h-4 w-4" />
          Yeni Fatura
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Müşterilerinize kestiğiniz satış faturaları. Bu belgeler resmi e-Fatura değildir;
        PDF olarak indirilip paylaşılabilen ticari faturalardır.
      </p>

      {/* Özet */}
      {!loading && invoices.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Tahsil edilmemiş</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{formatMoney(openTotal)}</p>
          </div>
          <div
            className={`rounded-xl border p-4 ${
              overdueCount > 0
                ? 'border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30'
                : 'border-border bg-card'
            }`}
          >
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {overdueCount > 0 && <AlertCircle className="h-4 w-4 text-rose-600" />}
              Vadesi geçmiş
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">{overdueCount} fatura</p>
          </div>
        </div>
      )}

      {/* Filtreler */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === f.key
                ? 'bg-primary text-white'
                : 'border border-border bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Yükleniyor...</p>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="font-medium text-foreground">
            {invoices.length === 0 ? 'Henüz fatura kesilmemiş.' : 'Bu filtreye uyan fatura yok.'}
          </p>
          {invoices.length === 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              Başlamak için önce{' '}
              <Link href="/cariler" className="text-primary hover:underline">
                bir cari ekleyin
              </Link>
              , sonra fatura oluşturun.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">No</th>
                <th className="px-4 py-3 font-medium">Cari</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Vade</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 text-right font-medium">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/faturalar/${inv.id}`} className="font-medium text-primary hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-foreground">{inv.customers?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.issue_date)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.due_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[inv.display]}`}>
                      {STATUS_LABELS[inv.display]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    {formatMoney(Number(inv.total), inv.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
