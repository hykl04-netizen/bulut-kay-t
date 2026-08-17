// app/(dashboard)/fatura-masraf/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Plus, ClipboardPaste, X } from 'lucide-react';
import { FileUpload } from '@/components/file-upload';
import { DataTable } from '@/components/data-table/data-table';
import { AdvancedFilterBar, applyAdvancedFilter, EMPTY_ADVANCED_FILTER, type AdvancedFilterValue } from '@/components/data-table/advanced-filter';
import { KdvCalculator } from '@/components/kdv-calculator';
import { OcrReceiptButton, type OcrResult } from '@/components/ocr-receipt-button';
import { columns, type Bill } from './columns';
import { BulkPasteModal } from './bulk-paste-modal';
import { toast } from '@/components/ui/toaster';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useKeyboardShortcut } from '@/lib/use-keyboard-shortcut';
import { getCurrentAccountId } from '@/lib/supabase/account';
import { useTeamRole } from '@/lib/use-team-role';
import { canEditData } from '@/lib/team';

interface Category {
  id: string;
  name: string;
  type: string;
}

export default function FaturaMasrafPage() {
  const { role, loading: roleLoading } = useTeamRole();
  const canEdit = roleLoading || !role || canEditData(role);
  const [bills, setBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Gelişmiş arama ve filtreleme
  const [filters, setFilters] = useState<AdvancedFilterValue>(EMPTY_ADVANCED_FILTER);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] = useState('aylik');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [status, setStatus] = useState<'odendi' | 'odenmedi'>('odenmedi');
  const [categoryId, setCategoryId] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const accountId = await getCurrentAccountId(user.id);
      setUserId(accountId);
      const { data: billData } = await supabase
        .from('bills')
        .select('*, categories(name)')
        .eq('user_id', accountId)
        .order('due_date', { ascending: true });

      if (billData) setBills(billData);

      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', accountId)
        .eq('type', 'gider');

      if (catData) setCategories(catData);
    }
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchData();
    });
  }, []);


  // Faz 7.4 — Excel'den toplu yapıştırma: satırları tek seferde insert edip
  // local state'e optimistic olarak ekle (tam yeniden çekim yok).
  const handleBulkImport = async (
    rows: {
      user_id: string;
      title: string;
      amount: number;
      due_date: string | null;
      is_recurring: boolean;
      recurrence_period: 'aylik' | 'yillik' | null;
      status: 'odenmedi';
    }[]
  ) => {
    const { data, error } = await supabase.from('bills').insert(rows).select('*, categories(name)');

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      setBills((prev) =>
        [...(data as Bill[]), ...prev].sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date < b.due_date ? -1 : 1;
        })
      );
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setTitle('');
    setAmount('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setIsRecurring(false);
    setRecurrencePeriod('aylik');
    setRecurrenceEndDate('');
    setStatus('odenmedi');
    setCategoryId('');
    setReceiptUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (bill: Bill) => {
    setEditingId(bill.id);
    setTitle(bill.title);
    setAmount(bill.amount.toString());
    setDueDate(bill.due_date || '');
    setIsRecurring(bill.is_recurring);
    setRecurrencePeriod(bill.recurrence_period || 'aylik');
    setRecurrenceEndDate(bill.recurrence_end_date || '');
    setStatus(bill.status);
    setCategoryId(bill.category_id || '');
    setReceiptUrl(bill.receipt_url || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsSubmitting(false);
      toast.error('Oturumunuz sona ermiş görünüyor. Lütfen sayfayı yenileyip tekrar giriş yapın.');
      return;
    }
    const accountId = await getCurrentAccountId(user.id);

    const payload = {
      user_id: accountId,
      title,
      amount: parseFloat(amount) || 0,
      due_date: dueDate,
      is_recurring: isRecurring,
      recurrence_period: isRecurring ? recurrencePeriod : null,
      recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate : null,
      status,
      category_id: categoryId || null,
      receipt_url: receiptUrl || null,
    };

    if (editingId) {
      // Güncelle — optimistic: tam yeniden çekim yerine local state'i güncelle
      const { data, error } = await supabase
        .from('bills')
        .update(payload)
        .eq('id', editingId)
        .select('*, categories(name)')
        .single();
      if (!error && data) {
        setBills((prev) => prev.map((b) => (b.id === editingId ? (data as Bill) : b)));
        setIsModalOpen(false);
      } else {
        console.error('Fatura güncellenirken hata:', error);
        toast.error(`Güncellenirken hata oluştu: ${error?.message ?? 'Bilinmeyen hata'}`);
      }
    } else {
      // Yeni Ekle — optimistic: dönen kaydı doğrudan listeye ekle
      const { data, error } = await supabase
        .from('bills')
        .insert(payload)
        .select('*, categories(name)')
        .single();
      if (!error && data) {
        setBills((prev) =>
          [data as Bill, ...prev].sort((a, b) => {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return a.due_date < b.due_date ? -1 : 1;
          })
        );
        setIsModalOpen(false);
      } else {
        console.error('Fatura eklenirken hata:', error);
        toast.error(`Eklenirken hata oluştu: ${error?.message ?? 'Bilinmeyen hata'}`);
      }
    }
    setIsSubmitting(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'odendi' ? 'odenmedi' : 'odendi';
    const { error } = await supabase.from('bills').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setBills((prev) => prev.map((b) => (b.id === id ? { ...b, status: newStatus as 'odendi' | 'odenmedi' } : b)));
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog('Bu faturayı silmek istediğinize emin misiniz?'))) return;
    const { error } = await supabase.from('bills').delete().eq('id', id);
    if (!error) {
      setBills((prev) => prev.filter((b) => b.id !== id));
    } else {
      toast.error(`Silinirken hata oluştu: ${error.message}`);
    }
  };

  // Faz 7.2/7.3 — hücre bazlı optimistic düzenleme
  const handleCellEdit = async (
    id: string,
    field: 'title' | 'amount' | 'due_date',
    value: string
  ) => {
    const previous = bills.find((b) => b.id === id);
    if (!previous) return;

    const parsedValue =
      field === 'amount'
        ? parseFloat(value) || 0
        : field === 'due_date' && value === ''
        ? null
        : value;

    setBills((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: parsedValue } : b)));

    const { error } = await supabase.from('bills').update({ [field]: parsedValue }).eq('id', id);
    if (error) {
      setBills((prev) => prev.map((b) => (b.id === id ? previous : b)));
      throw error;
    }
  };

  const filteredBills = useMemo(
    () =>
      applyAdvancedFilter(bills, filters, {
        dateField: 'due_date',
        amountField: 'amount',
        categoryField: 'category_id',
        searchFields: ['title'],
      }),
    [bills, filters]
  );

  // Klavye kısayolları: N = yeni fatura/masraf ekle, / = arama kutusuna odaklan
  useKeyboardShortcut('n', () => handleOpenAddModal(), [], { enabled: canEdit && !isModalOpen && !isBulkModalOpen });
  useKeyboardShortcut('/', () => searchInputRef.current?.focus(), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Fatura ve Masraflar</h1>
          <p className="mt-1 text-muted-foreground dark:text-muted-foreground">
            Kurumsal faturalarınızı, aboneliklerinizi ve ödeme vadelerinizi buradan yönetin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted dark:border-border dark:text-foreground dark:hover:bg-secondary"
              >
                <ClipboardPaste className="h-4 w-4" />
                Excel&apos;den Yapıştır
              </button>
              <button
                onClick={handleOpenAddModal}
                className="btn-gold-cta inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-secondary dark:bg-secondary dark:text-foreground dark:hover:bg-slate-200"
              >
                <Plus className="h-4 w-4" />
                Yeni Fatura/Masraf Ekle
              </button>
            </>
          )}
        </div>
      </div>

      {/* Arama ve Gelişmiş Filtreleme */}
      {!loading && (
        <AdvancedFilterBar
          value={filters}
          onChange={setFilters}
          categories={categories}
          searchPlaceholder="Başlıkta ara... ( / )"
          searchInputRef={searchInputRef}
        />
      )}

      {/* Liste Tablosu — inline düzenlenebilir hücrelerle (çift tıkla → düzenle) */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card py-12 text-center text-muted-foreground shadow-sm dark:border-border dark:bg-primary">
          Yükleniyor...
        </div>
      ) : (
        <>
          {filteredBills.length === 0 && bills.length > 0 && (
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
              Filtrelere uyan kayıt bulunamadı ({bills.length} kayıttan 0&apos;ı gösteriliyor).
            </p>
          )}
          <DataTable
            columns={columns}
            data={filteredBills}
            meta={{
              canEdit,
              onEdit: handleOpenEditModal,
              onDelete: handleDelete,
              onToggleStatus: handleToggleStatus,
              onCellEdit: handleCellEdit,
            }}
          />
        </>
      )}

      {/* Ekleme / Düzenleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl dark:bg-primary dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-border pb-4 dark:border-border">
              <h2 className="text-lg font-bold">{editingId ? 'Faturayı Düzenle' : 'Yeni Fatura / Masraf Ekle'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-muted-foreground dark:hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {!editingId && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2.5 dark:bg-secondary/20">
                  <p className="text-xs text-muted-foreground">Fişin fotoğrafını çekin, tutar/tarih otomatik doldurulsun.</p>
                  <OcrReceiptButton
                    onExtracted={(result: OcrResult) => {
                      if (result.title) setTitle(result.title);
                      if (result.amount != null) setAmount(result.amount.toString());
                      if (result.date) setDueDate(result.date);
                    }}
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Fatura / Masraf Başlığı</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Bulut Sunucu / Ofis Kirası"
                  className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-border dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                <div className="mb-1 flex items-center justify-between">
                    <label className="block text-sm font-medium text-foreground dark:text-muted-foreground">Tutar (TL)</label>
                    <KdvCalculator onApply={(gross) => setAmount(gross.toFixed(2))} />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-border dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Vade Tarihi</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-border dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Kategori</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-border dark:text-white"
                  >
                    <option value="" className="dark:bg-primary">Seçiniz</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="dark:bg-primary">{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Durum</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'odendi' | 'odenmedi')}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-border dark:text-white"
                  >
                    <option value="odenmedi" className="dark:bg-primary">Ödenmedi</option>
                    <option value="odendi" className="dark:bg-primary">Ödendi</option>
                  </select>
                </div>
              </div>

              {/* Tekrarlayan fatura otomasyonu */}
              <div className="rounded-xl border border-border p-3 dark:border-border">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground dark:text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  Bu fatura tekrarlansın (kira, abonelik vb.)
                </label>
                {isRecurring && (
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">Sıklık</label>
                      <select
                        value={recurrencePeriod}
                        onChange={(e) => setRecurrencePeriod(e.target.value)}
                        className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-border dark:text-white"
                      >
                        <option value="aylik" className="dark:bg-primary">Aylık</option>
                        <option value="yillik" className="dark:bg-primary">Yıllık</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">Bitiş Tarihi (Opsiyonel)</label>
                      <input
                        type="date"
                        value={recurrenceEndDate}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-border dark:text-white"
                      />
                    </div>
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
                  Vade tarihi geçtiğinde bir sonraki dönemin faturası otomatik olarak oluşturulur.
                </p>
              </div>

              {/* Fatura Belgesi Yükleme */}
              <FileUpload onUploadSuccess={(url) => setReceiptUrl(url)} label="Fatura Belgesi / PDF Yükle (Opsiyonel)" />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm text-muted-foreground hover:bg-secondary dark:text-muted-foreground dark:hover:bg-secondary"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-gold-cta rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white transition hover:bg-secondary disabled:opacity-50 dark:bg-secondary dark:text-foreground dark:hover:bg-slate-200"
                >
                  {isSubmitting ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel'den Toplu Ekleme Modalı */}
      {isBulkModalOpen && userId && (
        <BulkPasteModal
          userId={userId}
          onClose={() => setIsBulkModalOpen(false)}
          onImport={handleBulkImport}
        />
      )}
    </div>
  );
}