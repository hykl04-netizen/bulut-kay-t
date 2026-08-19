'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, Loader2, FileDown, ArrowLeft, Ban, Repeat } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentWorkspaceId } from '@/lib/supabase/workspace';
import {
  calcItem,
  calcInvoiceTotals,
  fetchCustomers,
  fetchInvoice,
  formatMoney,
  nextInvoiceNumber,
  saveInvoice,
  syncInvoiceIncome,
  updateInvoiceStatus,
  STATUS_LABELS,
  STATUS_CLASSES,
  resolveStatus,
  type Customer,
  type InvoiceItem,
  type InvoiceStatus,
} from '@/lib/invoices';
import { exportInvoiceToPDF } from '@/lib/invoice-pdf';
import { KDV_RATES } from '@/lib/vat';
import { toast } from '@/components/ui/toaster';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { PageLoading } from '@/components/ui/skeleton';
/**
 * Faz 5 — fatura oluşturma/düzenleme formu. Hem /faturalar/yeni hem
 * /faturalar/[id] tarafından kullanılır.
 *
 * Birim fiyatlar KDV HARİÇ girilir; her satırın KDV'si ayrı hesaplanır
 * (lib/invoices.ts → calcItem). Böylece farklı KDV oranlı kalemler aynı
 * faturada bir arada olabilir.
 */

function emptyItem(): InvoiceItem {
  return {
    description: '',
    quantity: 1,
    unit_price: 0,
    vat_rate: 20,
    net_total: 0,
    vat_amount: 0,
    line_total: 0,
    sort_order: 0,
  };
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function InvoiceForm({ invoiceId }: { invoiceId?: string }) {
  const router = useRouter();
  const isEdit = Boolean(invoiceId);

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerId, setCustomerId] = useState<string>('');
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<InvoiceStatus>('taslak');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);
  // Tekrarlayan fatura (Öneri 10)
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] = useState<'aylik' | 'yillik'>('aylik');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const wsId = await getCurrentWorkspaceId(user.id);
      if (cancelled) return;
      setWorkspaceId(wsId);

      try {
        const list = await fetchCustomers(wsId);
        if (cancelled) return;
        setCustomers(list);

        if (invoiceId) {
          const { invoice, items: loadedItems } = await fetchInvoice(invoiceId);
          if (cancelled) return;
          setInvoiceNumber(invoice.invoice_number);
          setCustomerId(invoice.customer_id ?? '');
          setIssueDate(invoice.issue_date);
          setDueDate(invoice.due_date ?? '');
          setStatus(invoice.status);
          setNotes(invoice.notes ?? '');
          setItems(loadedItems.length > 0 ? loadedItems : [emptyItem()]);
          const rec = invoice as unknown as {
            is_recurring?: boolean;
            recurrence_period?: 'aylik' | 'yillik' | null;
            recurrence_end_date?: string | null;
          };
          setIsRecurring(Boolean(rec.is_recurring));
          if (rec.recurrence_period) setRecurrencePeriod(rec.recurrence_period);
          setRecurrenceEndDate(rec.recurrence_end_date ?? '');
        } else {
          // Numara yalnızca YENİ fatura için, form açılırken bir kez üretilir.
          const number = await nextInvoiceNumber(wsId);
          if (cancelled) return;
          setInvoiceNumber(number);
        }
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Fatura yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  const updateItem = (index: number, patch: Partial<InvoiceItem>) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const merged = { ...item, ...patch };
        return { ...merged, ...calcItem(merged.quantity, merged.unit_price, merged.vat_rate) };
      })
    );
  };

  const totals = calcInvoiceTotals(items);
  const isLocked = status === 'iptal';

  const handleSave = async (nextStatus?: InvoiceStatus) => {
    if (!workspaceId) return;
    const validItems = items.filter((i) => i.description.trim() && i.line_total > 0);
    if (validItems.length === 0) {
      toast.error('En az bir geçerli kalem girin (açıklama ve tutar zorunlu).');
      return;
    }

    setSaving(true);
    try {
      const id = await saveInvoice({
        workspaceId,
        invoiceId,
        invoiceNumber,
        customerId: customerId || null,
        issueDate,
        dueDate: dueDate || null,
        status: nextStatus ?? status,
        notes: notes.trim() || null,
        items: validItems,
        isRecurring,
        recurrencePeriod: isRecurring ? recurrencePeriod : null,
        recurrenceEndDate: isRecurring && recurrenceEndDate ? recurrenceEndDate : null,
      });
      // "Ödendi" işaretlenen fatura nakit akışına gelir olarak yansısın;
      // ödenmemişe dönerse o kayıt silinsin (bkz. syncInvoiceIncome).
      const effectiveStatus = nextStatus ?? status;
      await syncInvoiceIncome({
        workspaceId,
        invoiceId: id,
        status: effectiveStatus,
        issueDate,
        paidTotal: calcInvoiceTotals(validItems).total,
        currency: 'TRY',
        invoiceNumber,
        customerName: customers.find((c) => c.id === customerId)?.name ?? null,
      });

      toast.success(
        effectiveStatus === 'odendi'
          ? 'Fatura ödendi olarak kaydedildi; gelir kaydı oluşturuldu.'
          : effectiveStatus === 'gonderildi'
            ? 'Fatura gönderildi olarak işaretlendi.'
            : 'Fatura kaydedildi.'
      );
      router.push(`/faturalar/${id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fatura kaydedilemedi.');
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!invoiceId) return;
    const ok = await confirmDialog({
      title: 'Faturayı iptal et',
      message:
        'Fatura iptal edilsin mi? Numara yeniden kullanılmaz (muhasebe pratiği), kayıt geçmişte kalır.',
      confirmLabel: 'İptal Et',
      danger: true,
    });
    if (!ok) return;
    try {
      await updateInvoiceStatus(invoiceId, 'iptal');
      // İptal edilen faturanın gelir kaydı da kaldırılmalı.
      if (workspaceId) {
        await syncInvoiceIncome({
          workspaceId,
          invoiceId,
          status: 'iptal',
          issueDate,
          paidTotal: 0,
          currency: 'TRY',
          invoiceNumber,
        });
      }
      setStatus('iptal');
      toast.success('Fatura iptal edildi; varsa gelir kaydı kaldırıldı.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fatura iptal edilemedi.');
    }
  };

  const handlePdf = async () => {
    if (!workspaceId) return;
    try {
      // Marka bilgisi (ad + logo) ve satıcı vergi künyesi artık ikisi de
      // İŞLETME bazlı — company_settings workspace_id'ye taşındı.
      const [{ data: settings }, { data: ws }] = await Promise.all([
        supabase
          .from('company_settings')
          .select('company_name, logo_data_url')
          .eq('workspace_id', workspaceId)
          .maybeSingle(),
        supabase.from('workspaces').select('name, tax_number, address').eq('id', workspaceId).maybeSingle(),
      ]);
      const workspace = ws as { name: string; tax_number: string | null; address: string | null } | null;

      const customer = customers.find((c) => c.id === customerId) ?? null;
      const validItems = items.filter((i) => i.description.trim());

      await exportInvoiceToPDF(
        {
          id: invoiceId ?? '',
          workspace_id: workspaceId,
          customer_id: customerId || null,
          invoice_number: invoiceNumber,
          issue_date: issueDate,
          due_date: dueDate || null,
          status,
          currency: 'TRY',
          ...totals,
          notes: notes.trim() || null,
          paid_at: null,
          cancelled_at: null,
          cancel_reason: null,
        },
        validItems,
        customer,
        {
          companyName:
            (settings as { company_name?: string } | null)?.company_name ?? workspace?.name ?? null,
          logoDataUrl: (settings as { logo_data_url?: string } | null)?.logo_data_url ?? null,
          taxNumber: workspace?.tax_number ?? null,
          address: workspace?.address ?? null,
        }
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'PDF oluşturulamadı.');
    }
  };

  if (loading) {
    return (
      <PageLoading />
    );
  }

  const displayStatus = resolveStatus({ status, due_date: dueDate || null });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/faturalar" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Fatura {invoiceNumber}
          </h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[displayStatus]}`}>
            {STATUS_LABELS[displayStatus]}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePdf}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            <FileDown className="h-4 w-4" />
            PDF
          </button>
          {isEdit && !isLocked && (
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30"
            >
              <Ban className="h-4 w-4" />
              İptal Et
            </button>
          )}
        </div>
      </div>

      {isLocked && (
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Bu fatura iptal edilmiş. Kayıt geçmişte tutuluyor ve numarası yeniden kullanılmıyor.
        </div>
      )}

      {/* Başlık bilgileri */}
      <div className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="fatura-cari">Cari (Alıcı)</Label>
          <select
            id="fatura-cari"
            value={customerId}
            disabled={isLocked}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60"
          >
            <option value="">Seçiniz...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {customers.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Henüz cari yok —{' '}
              <Link href="/cariler" className="text-primary hover:underline">
                cari ekleyin
              </Link>
              .
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fatura-tarih">Düzenleme Tarihi</Label>
          <Input
            id="fatura-tarih"
            type="date"
            value={issueDate}
            disabled={isLocked}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fatura-vade">Vade Tarihi</Label>
          <Input
            id="fatura-vade"
            type="date"
            value={dueDate}
            disabled={isLocked}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      {/* Kalemler */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Kalemler</h2>
          <p className="text-xs text-muted-foreground">Birim fiyatlar KDV hariç girilir.</p>
        </div>

        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <Label htmlFor={`kalem-aciklama-${index}`} className="text-xs">
                  Açıklama
                </Label>
                <Input
                  id={`kalem-aciklama-${index}`}
                  value={item.description}
                  disabled={isLocked}
                  onChange={(e) => updateItem(index, { description: e.target.value })}
                  placeholder="Hizmet / ürün adı"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor={`kalem-miktar-${index}`} className="text-xs">
                  Miktar
                </Label>
                <Input
                  id={`kalem-miktar-${index}`}
                  inputMode="decimal"
                  value={item.quantity}
                  disabled={isLocked}
                  onChange={(e) => updateItem(index, { quantity: Number(e.target.value.replace(',', '.')) || 0 })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor={`kalem-fiyat-${index}`} className="text-xs">
                  Birim Fiyat
                </Label>
                <Input
                  id={`kalem-fiyat-${index}`}
                  inputMode="decimal"
                  value={item.unit_price}
                  disabled={isLocked}
                  onChange={(e) => updateItem(index, { unit_price: Number(e.target.value.replace(',', '.')) || 0 })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor={`kalem-kdv-${index}`} className="text-xs">
                  KDV
                </Label>
                <select
                  id={`kalem-kdv-${index}`}
                  value={item.vat_rate}
                  disabled={isLocked}
                  onChange={(e) => updateItem(index, { vat_rate: Number(e.target.value) })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60"
                >
                  {KDV_RATES.map((r) => (
                    <option key={r} value={r}>
                      %{r}
                    </option>
                  ))}
                  <option value={0}>%0</option>
                </select>
              </div>
              <div className="flex items-end justify-between gap-2 sm:col-span-1">
                <span className="text-sm font-medium text-foreground sm:hidden">
                  {formatMoney(item.line_total)}
                </span>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  disabled={isLocked || items.length === 1}
                  aria-label="Kalemi sil"
                  className="mb-1 rounded p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="hidden text-right text-sm text-muted-foreground sm:col-span-12 sm:block">
                Satır toplamı: <strong className="text-foreground">{formatMoney(item.line_total)}</strong>
              </p>
            </div>
          ))}
        </div>

        {!isLocked && (
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, emptyItem()])}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Plus className="h-4 w-4" />
            Kalem Ekle
          </button>
        )}

        <div className="border-t border-border pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Ara Toplam</span>
            <span>{formatMoney(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>KDV</span>
            <span>{formatMoney(totals.vat_total)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-foreground">
            <span>Genel Toplam</span>
            <span>{formatMoney(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* Tekrarlama (Öneri 10) */}
      <div className="rounded-xl border border-border bg-card p-5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={isRecurring}
            disabled={isLocked}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border"
          />
          <span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Repeat className="h-4 w-4" />
              Bu fatura düzenli tekrarlasın
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Dönem geldiğinde aynı kalemlerle yeni bir fatura <strong>taslak olarak</strong>
              &nbsp;oluşturulur. Gözden geçirip kendiniz gönderirsiniz.
            </span>
          </span>
        </label>

        {isRecurring && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tekrar-donem">Sıklık</Label>
              <select
                id="tekrar-donem"
                value={recurrencePeriod}
                disabled={isLocked}
                onChange={(e) => setRecurrencePeriod(e.target.value as 'aylik' | 'yillik')}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="aylik">Aylık</option>
                <option value="yillik">Yıllık</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tekrar-bitis">Bitiş tarihi (isteğe bağlı)</Label>
              <Input
                id="tekrar-bitis"
                type="date"
                value={recurrenceEndDate}
                disabled={isLocked}
                onChange={(e) => setRecurrenceEndDate(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Notlar */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-1.5">
        <Label htmlFor="fatura-not">Notlar</Label>
        <textarea
          id="fatura-not"
          rows={3}
          value={notes}
          disabled={isLocked}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ödeme koşulları, banka bilgisi vb."
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
        />
      </div>

      {/* Eylemler */}
      {!isLocked && (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={() => handleSave('taslak')}
            disabled={saving}
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-60"
          >
            Taslak Olarak Kaydet
          </button>
          {status !== 'odendi' && (
            <button
              onClick={() => handleSave('gonderildi')}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Gönderildi Olarak Kaydet
            </button>
          )}
          {isEdit && status === 'gonderildi' && (
            <button
              onClick={() => handleSave('odendi')}
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              Ödendi İşaretle
            </button>
          )}
        </div>
      )}
    </div>
  );
}
