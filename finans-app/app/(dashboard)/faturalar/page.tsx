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
  STATUS_LABELS,
  type DisplayStatus,
  type InvoiceWithCustomer,
} from '@/lib/invoices';
import { toast } from '@/components/ui/toaster';
import { DataTable } from '@/components/data-table/data-table';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { invoiceColumns } from './columns';

import { MobileList, MobileListCard } from '@/components/finans/mobile-list';

/**
 * Faz 5 — kesilen faturaların listesi. "Gecikti" durumu saklanmıyor,
 * vade tarihinden türetiliyor (bkz. lib/invoices.ts → resolveStatus).
 */

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString('tr-TR');
}

const FILTERS: { key: DisplayStatus | 'hepsi'; label: string }[] = [
  { key: 'hepsi', label: 'Hepsi' },
  { key: 'taslak', label: 'Taslak' },
  { key: 'gonderildi', label: 'Gönderildi' },
  { key: 'gecikti', label: 'Gecikti' },
  { key: 'odendi', label: 'Ödendi' },
  { key: 'iptal', label: 'İptal' },
];

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
      <PageHeader
        icon={FileText}
        title="Kesilen Faturalar"
        description="Müşterilerinize kestiğiniz satış faturaları. Bu belgeler resmi e-Fatura değildir; PDF olarak indirilip paylaşılabilen ticari faturalardır."
        actions={
          <Link
            href="/faturalar/yeni"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Yeni Fatura
          </Link>
        }
      />

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
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${ filter === f.key ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground hover:bg-muted' }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <TableSkeleton columns={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={invoices.length === 0 ? 'Henüz fatura kesilmemiş.' : 'Bu filtreye uyan fatura yok.'}
          description={
            invoices.length === 0 ? (
              <>
                Başlamak için önce{' '}
                <Link href="/cariler" className="text-primary hover:underline">
                  bir cari ekleyin
                </Link>
                , sonra fatura oluşturun.
              </>
            ) : (
              'Farklı bir durum filtresi seçmeyi deneyin.'
            )
          }
        />
      ) : (
        <>
          {/* Telefonda liste, masaüstünde tablo — aynı veri, iki sunum.
              6 sütunlu tablo 390px'e sığmıyor; yatay kaydırma da tarama
              alışkanlığını bozuyor. */}
          <div className="md:hidden">
            <MobileListCard>
              <MobileList
                emptyText="Fatura yok."
                rows={visible.map((inv) => ({
                  id: inv.id,
                  title: inv.customers?.name ?? inv.invoice_number,
                  subtitle: `${inv.invoice_number} · ${formatDate(inv.issue_date)}`,
                  icon: FileText,
                  value: formatMoney(Number(inv.total), inv.currency),
                  valueNote: STATUS_LABELS[inv.display],
                  href: `/faturalar/${inv.id}`,
                }))}
              />
            </MobileListCard>
          </div>

          <div className="hidden md:block">
  <DataTable columns={invoiceColumns} data={visible} />
          </div>
        </>
      )}
    </div>
  );
}
