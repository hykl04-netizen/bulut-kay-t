// app/(dashboard)/gelir-gider/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Plus, ClipboardPaste, X } from 'lucide-react';
import { FileUpload } from '@/components/file-upload';
import { DataTable } from '@/components/data-table/data-table';
import { TransactionList } from '@/components/finans/transaction-list';
import { AdvancedFilterBar, applyAdvancedFilter, EMPTY_ADVANCED_FILTER, type AdvancedFilterValue } from '@/components/data-table/advanced-filter';
import { columns, type Transaction } from './columns';
import { BulkPasteModal } from './bulk-paste-modal';
import { toast } from '@/components/ui/toaster';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { SUPPORTED_CURRENCIES, SupportedCurrency, fetchRateToTRY, convertToTRY, formatCurrency } from '@/lib/currency';

import { useKeyboardShortcut } from '@/lib/use-keyboard-shortcut';
import { getCurrentWorkspaceId } from '@/lib/supabase/workspace';
import { useTeamRole } from '@/lib/use-team-role';
import { canEditData } from '@/lib/team';

import { TableSkeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
}

const SELECT_WITH_CATEGORY = '*, category:categories(name, color)';

export default function GelirGiderPage() {
  const { role, loading: roleLoading } = useTeamRole();
  const canEdit = roleLoading || !role || canEditData(role);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Gelişmiş arama ve filtreleme
  const [filters, setFilters] = useState<AdvancedFilterValue>(EMPTY_ADVANCED_FILTER);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [type, setType] = useState<'gelir' | 'gider'>('gider');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tekrarlayan işlem otomasyonu (maaş, kira geliri, abonelik gideri vb.)
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] = useState('aylik');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  // Çoklu para birimi
  const [currency, setCurrency] = useState<SupportedCurrency>('TRY');
  const [exchangeRate, setExchangeRate] = useState('1');
  const [isFetchingRate, setIsFetchingRate] = useState(false);

  useEffect(() => {
    if (currency === 'TRY') return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setIsFetchingRate(true);
    });
    fetchRateToTRY(currency).then((rate) => {
      if (cancelled) return;
      setIsFetchingRate(false);
      if (rate !== null) {
        setExchangeRate(rate.toFixed(4));
      } else {
        toast.info('Güncel kur çekilemedi, lütfen kuru elle girin.');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currency]);

  const handleCurrencyChange = (value: SupportedCurrency) => {
    setCurrency(value);
    if (value === 'TRY') setExchangeRate('1');
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const workspaceId = await getCurrentWorkspaceId(user.id);
      setWorkspaceId(workspaceId);

      // İşlemleri çek
      const { data: txData } = await supabase
        .from('transactions')
        .select(SELECT_WITH_CATEGORY)
        .eq('workspace_id', workspaceId)
        .order('date', { ascending: false });

      if (txData) setTransactions(txData as unknown as Transaction[]);

      // Kategorileri çek
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (catData) setCategories(catData);
    }
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchData();
    });
  }, []);

  // Faz 7.2/7.3 — hücre bazlı düzenleme: önce local state'i optimistic güncelle,
  // hata olursa eski değere geri dön, başarılı olursa tam yeniden çekim YAPMA.
  const handleCellEdit = async (
    id: string,
    field: 'description' | 'amount' | 'date',
    value: string
  ) => {
    const previous = transactions.find((t) => t.id === id);
    if (!previous) return;

    const parsedValue = field === 'amount' ? parseFloat(value) || 0 : value;

    // Tutar hücre üzerinden değiştirilirse, kayıtta saklı kur ile TL karşılığını
    // (try_equivalent) da güncel tutuyoruz — aksi halde döviz cinsinden işlemlerde
    // rapor/özet toplamları yanlış kalır.
    const updatePayload: Record<string, unknown> = { [field]: parsedValue };
    if (field === 'amount') {
      const rate = previous.exchange_rate ?? 1;
      updatePayload.try_equivalent = convertToTRY(parsedValue as number, rate);
    }

    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updatePayload } : t))
    );

    const { error } = await supabase.from('transactions').update(updatePayload).eq('id', id);

    if (error) {
      // Eski değere geri dön
      setTransactions((prev) => prev.map((t) => (t.id === id ? previous : t)));
      throw error;
    }
  };

  // Faz 7.4 — Excel'den toplu yapıştırma: satırları tek seferde insert edip
  // local state'e optimistic olarak ekle (tam yeniden çekim yok).
  const handleBulkImport = async (
    rows: {
      workspace_id: string;
      type: 'gelir' | 'gider';
      amount: number;
      description: string;
      date: string;
      category_id: string | null;
    }[]
  ) => {
    const { data, error } = await supabase
      .from('transactions')
      .insert(rows)
      .select(SELECT_WITH_CATEGORY);

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      setTransactions((prev) =>
        [...(data as unknown as Transaction[]), ...prev].sort((a, b) => (a.date < b.date ? 1 : -1))
      );
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setType('gider');
    setCategoryId('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setReceiptUrl('');
    setIsRecurring(false);
    setRecurrencePeriod('aylik');
    setRecurrenceEndDate('');
    setCurrency('TRY');
    setExchangeRate('1');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tx: Transaction) => {
    setEditingId(tx.id);
    setType(tx.type);
    setCategoryId(tx.category_id || '');
    setAmount(tx.amount.toString());
    setDate(tx.date);
    setDescription(tx.description || '');
    setReceiptUrl(tx.receipt_url || '');
    setIsRecurring(tx.is_recurring ?? false);
    setRecurrencePeriod(tx.recurrence_period || 'aylik');
    setRecurrenceEndDate(tx.recurrence_end_date || '');
    setCurrency((tx.currency as SupportedCurrency) || 'TRY');
    setExchangeRate((tx.exchange_rate ?? 1).toString());
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
    const workspaceId = await getCurrentWorkspaceId(user.id);

    const parsedAmount = parseFloat(amount) || 0;
    const parsedRate = parseFloat(exchangeRate) || 1;

    const payload = {
      workspace_id: workspaceId,
      type,
      category_id: categoryId || null,
      amount: parsedAmount,
      date,
      description,
      receipt_url: receiptUrl || null,
      is_recurring: isRecurring,
      recurrence_period: isRecurring ? recurrencePeriod : null,
      recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate : null,
      currency,
      exchange_rate: currency === 'TRY' ? 1 : parsedRate,
      try_equivalent: convertToTRY(parsedAmount, currency === 'TRY' ? 1 : parsedRate),
    };

    if (editingId) {
      // Güncelle — optimistic: tam yeniden çekim yerine local state'i güncelle
      const { data, error } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', editingId)
        .select(SELECT_WITH_CATEGORY)
        .single();
      if (!error && data) {
        setTransactions((prev) =>
          prev.map((t) => (t.id === editingId ? (data as unknown as Transaction) : t))
        );
        setIsModalOpen(false);
      } else {
        toast.error(`Güncellenirken hata oluştu: ${error?.message ?? 'Bilinmeyen hata'}`);
      }
    } else {
      // Yeni Ekle — optimistic: dönen kaydı doğrudan listeye ekle
      const { data, error } = await supabase
        .from('transactions')
        .insert(payload)
        .select(SELECT_WITH_CATEGORY)
        .single();
      if (!error && data) {
        setTransactions((prev) =>
          [data as unknown as Transaction, ...prev].sort((a, b) => (a.date < b.date ? 1 : -1))
        );
        setIsModalOpen(false);
      } else {
        toast.error(`Eklenirken hata oluştu: ${error?.message ?? 'Bilinmeyen hata'}`);
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog('Bu kaydı silmek istediğinize emin misiniz?'))) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } else {
      toast.error(`Silinirken hata oluştu: ${error.message}`);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  const filteredTransactions = useMemo(
    () =>
      applyAdvancedFilter(transactions, filters, {
        dateField: 'date',
        amountField: 'amount',
        categoryField: 'category_id',
        searchFields: ['description'],
      }),
    [transactions, filters]
  );

  // Klavye kısayolları: N = yeni işlem ekle, / = arama kutusuna odaklan
  useKeyboardShortcut('n', () => handleOpenAddModal(), [], { enabled: canEdit && !isModalOpen && !isBulkModalOpen });
  useKeyboardShortcut('/', () => searchInputRef.current?.focus(), []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gelir ve Gider Yönetimi"
        description="Finansal hareketlerinizi profesyonel kategorilerle takip edin, faturalarınızı ekleyin."
        actions={
          <>
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <button
                  onClick={() => setIsBulkModalOpen(true)}
                  className="btn-outline"
                >
                  <ClipboardPaste className="h-4 w-4" />
                  Excel&apos;den Yapıştır
                </button>
                <button
                  onClick={handleOpenAddModal}
                  className="btn-gold-cta inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  Yeni İşlem Ekle
                </button>
              </>
            )}
          </div>
          </>
        }
      />


      {/* Arama ve Gelişmiş Filtreleme */}
      {!loading && (
        <AdvancedFilterBar
          value={filters}
          onChange={setFilters}
          categories={categories}
          searchPlaceholder="Açıklamada ara... ( / )"
          searchInputRef={searchInputRef}
        />
      )}

      {/* Liste Tablosu — inline düzenlenebilir hücrelerle (çift tıkla → düzenle) */}
      {loading ? (
        <TableSkeleton columns={6} />
      ) : (
        <>
          {filteredTransactions.length === 0 && transactions.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Filtrelere uyan kayıt bulunamadı ({transactions.length} kayıttan 0&apos;ı gösteriliyor).
            </p>
          )}
          {/* Telefonda banka tarzı liste, masaüstünde tablo.
              6 sütunlu bir tablo 390px'e sığmıyor; yatay kaydırma da
              tarama alışkanlığını bozuyor. Aynı veri, iki sunum. */}
          <div className="md:hidden">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <TransactionList
                rows={filteredTransactions.map((t) => ({
                  id: t.id,
                  title: t.description || t.category?.name || 'Kayıt',
                  subtitle: t.category?.name ?? null,
                  date: t.date,
                  amount: Number(t.try_equivalent ?? t.amount),
                  direction: t.type,
                  accentColor: t.category?.color ?? null,
                }))}
                emptyText="Bu filtreye uyan kayıt yok."
              />
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Düzenlemek için geniş ekranda açın veya kaydın üzerine dokunun.
            </p>
          </div>

          <div className="hidden md:block">
            <DataTable
              columns={columns}
              data={filteredTransactions}
              meta={{
                canEdit,
                onEdit: handleOpenEditModal,
                onDelete: handleDelete,
                onCellEdit: handleCellEdit,
              }}
            />
          </div>
        </>
      )}

      {/* Ekleme / Düzenleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-lg font-bold">{editingId ? 'İşlemi Düzenle' : 'Yeni İşlem Ekle'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-muted-foreground dark:hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">İşlem Tipi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setType('gelir'); setCategoryId(''); }}
                    className={`rounded-xl py-2 text-sm font-medium transition ${
                      type === 'gelir'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    Gelir
                  </button>
                  <button
                    type="button"
                    onClick={() => { setType('gider'); setCategoryId(''); }}
                    className={`rounded-xl py-2 text-sm font-medium transition ${
                      type === 'gider'
                        ? 'bg-rose-600 text-white shadow'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    Gider
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Kategori</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="form-input"
                  >
                    <option value="" className="dark:bg-popover dark:text-popover-foreground">Kategori Seçin</option>
                    {filteredCategories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="dark:bg-popover dark:text-popover-foreground">{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Tutar</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="form-input"
                    />
                    <select
                      value={currency}
                      onChange={(e) => handleCurrencyChange(e.target.value as SupportedCurrency)}
                      className="w-24 shrink-0 rounded-xl border border-border bg-transparent px-2 py-2 text-sm focus:border-accent focus:outline-none dark:text-foreground"
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code} className="dark:bg-popover dark:text-popover-foreground">{c.code}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {currency !== 'TRY' && (
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Kur (1 {currency} = ? TL) {isFetchingRate && <span className="italic">güncelleniyor...</span>}
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <span className="text-xs text-muted-foreground">TL Karşılığı</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(convertToTRY(parseFloat(amount) || 0, parseFloat(exchangeRate) || 1), 'TRY')}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Tarih</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Açıklama</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Örn: Sunucu ve bulut hizmeti"
                    className="form-input"
                  />
                </div>
              </div>

              {/* Tekrarlayan işlem otomasyonu */}
              <div className="rounded-xl border border-border p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground dark:text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  Bu işlem tekrarlansın (maaş, kira, abonelik vb.)
                </label>
                {isRecurring && (
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Sıklık</label>
                      <select
                        value={recurrencePeriod}
                        onChange={(e) => setRecurrencePeriod(e.target.value)}
                        className="form-input"
                      >
                        <option value="aylik" className="dark:bg-popover dark:text-popover-foreground">Aylık</option>
                        <option value="yillik" className="dark:bg-popover dark:text-popover-foreground">Yıllık</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Bitiş Tarihi (Opsiyonel)</label>
                      <input
                        type="date"
                        value={recurrenceEndDate}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Fiş / Belge Yükleme Bileşeni */}
              <FileUpload
                onUploadSuccess={(url) => setReceiptUrl(url)}
                label="Fiş / Fatura / Belge Ekle (Opsiyonel)"
                initialUrl={editingId ? receiptUrl : null}
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-gold-cta rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel'den Toplu Ekleme Modalı */}
      {isBulkModalOpen && workspaceId && (
        <BulkPasteModal
          categories={categories}
          workspaceId={workspaceId}
          onClose={() => setIsBulkModalOpen(false)}
          onImport={handleBulkImport}
        />
      )}
    </div>
  );
}