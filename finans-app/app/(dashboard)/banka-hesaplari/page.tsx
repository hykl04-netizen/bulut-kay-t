// app/(dashboard)/banka-hesaplari/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Plus, Landmark, X, UploadCloud, Trash2, Pencil, Info } from 'lucide-react';
import { toast } from '@/components/ui/toaster';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { parseBankStatementCsv, ParsedBankRow } from '@/lib/bank-import';
import { SUPPORTED_CURRENCIES, formatCurrency } from '@/lib/currency';

interface BankAccount {
  id: string;
  name: string;
  bank_name: string | null;
  iban_last4: string | null;
  currency: string;
  current_balance: number;
}

interface Category {
  id: string;
  name: string;
  type: 'gelir' | 'gider';
}

export default function BankaHesaplariPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Hesap ekle/düzenle modalı
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [ibanLast4, setIbanLast4] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [currentBalance, setCurrentBalance] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // CSV içe aktarma modalı
  const [importAccountId, setImportAccountId] = useState<string | null>(null);
  const [importDefaultCategoryId, setImportDefaultCategoryId] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedBankRow[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data: accData, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Banka hesapları çekme hatası:', error.message);
        if (error.message.toLowerCase().includes('relation') || error.code === '42P01') {
          toast.error('Banka hesapları tablosu bulunamadı. Lütfen supabase/migrations klasöründeki SQL dosyasını Supabase\'de çalıştırın.');
        }
      }
      if (accData) setAccounts(accData);

      const { data: catData } = await supabase
        .from('categories')
        .select('id, name, type')
        .eq('user_id', user.id);
      if (catData) setCategories(catData);
    }
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchData();
    });
  }, []);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName('');
    setBankName('');
    setIbanLast4('');
    setCurrency('TRY');
    setCurrentBalance('0');
    setIsAccountModalOpen(true);
  };

  const handleOpenEditModal = (acc: BankAccount) => {
    setEditingId(acc.id);
    setName(acc.name);
    setBankName(acc.bank_name || '');
    setIbanLast4(acc.iban_last4 || '');
    setCurrency(acc.currency);
    setCurrentBalance(acc.current_balance.toString());
    setIsAccountModalOpen(true);
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

    const payload = {
      user_id: user.id,
      name,
      bank_name: bankName || null,
      iban_last4: ibanLast4 || null,
      currency,
      current_balance: parseFloat(currentBalance) || 0,
    };

    if (editingId) {
      const { data, error } = await supabase
        .from('bank_accounts')
        .update(payload)
        .eq('id', editingId)
        .select('*')
        .single();
      if (!error && data) {
        setAccounts((prev) => prev.map((a) => (a.id === editingId ? (data as BankAccount) : a)));
        setIsAccountModalOpen(false);
      } else {
        toast.error(`Güncellenirken hata oluştu: ${error?.message ?? 'Bilinmeyen hata'}`);
      }
    } else {
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert(payload)
        .select('*')
        .single();
      if (!error && data) {
        setAccounts((prev) => [...prev, data as BankAccount]);
        setIsAccountModalOpen(false);
      } else {
        toast.error(`Eklenirken hata oluştu: ${error?.message ?? 'Bilinmeyen hata'}`);
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({
      title: 'Hesabı Sil',
      message: 'Bu banka hesabını silmek istediğinize emin misiniz? Daha önce bu hesaptan içe aktarılmış işlemler silinmeyecek, sadece hesap bağlantıları kaldırılacaktır.',
      danger: true,
    }))) return;
    const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
    if (!error) {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } else {
      toast.error(`Silinirken hata oluştu: ${error.message}`);
    }
  };

  // --- CSV içe aktarma akışı ---

  const openImportFor = (accountId: string) => {
    setImportAccountId(accountId);
    setImportDefaultCategoryId('');
    setParsedRows([]);
    setSkippedCount(0);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { rows, skipped } = parseBankStatementCsv(text);
    if (rows.length === 0) {
      toast.error('CSV dosyasında Tarih ve Tutar sütunları bulunamadı. Lütfen bankanızın ekstre formatını kontrol edin.');
      return;
    }
    setParsedRows(rows);
    setSkippedCount(skipped);
  };

  const handleConfirmImport = async () => {
    if (!importAccountId || !userId || parsedRows.length === 0) return;
    setIsImporting(true);

    const rowsToInsert = parsedRows.map((r) => ({
      user_id: userId,
      type: (r.amount >= 0 ? 'gelir' : 'gider') as 'gelir' | 'gider',
      amount: Math.abs(r.amount),
      date: r.date,
      description: r.description,
      category_id: importDefaultCategoryId || null,
      currency: 'TRY',
      exchange_rate: 1,
      try_equivalent: Math.abs(r.amount),
      bank_account_id: importAccountId,
      external_ref: r.externalRef,
    }));

    // Aynı ekstrenin tekrar aktarılmasını önlemek için (bank_account_id, external_ref)
    // üzerinde benzersiz kısıtlama var — çakışan satırlar sessizce atlanır.
    const { data, error } = await supabase
      .from('transactions')
      .upsert(rowsToInsert, { onConflict: 'bank_account_id,external_ref', ignoreDuplicates: true })
      .select('id');

    setIsImporting(false);

    if (error) {
      toast.error(`İçe aktarma sırasında hata oluştu: ${error.message}`);
      return;
    }

    const insertedCount = data?.length ?? 0;
    const duplicateCount = rowsToInsert.length - insertedCount;
    toast.success(
      duplicateCount > 0
        ? `${insertedCount} işlem içe aktarıldı, ${duplicateCount} işlem daha önce aktarıldığı için atlandı.`
        : `${insertedCount} işlem başarıyla içe aktarıldı.`
    );

    setImportAccountId(null);
    setParsedRows([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const importAccount = accounts.find((a) => a.id === importAccountId);
  const expenseCategories = categories.filter((c) => c.type === 'gider');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Banka Hesapları</h1>
          <p className="mt-1 text-muted-foreground dark:text-muted-foreground">
            Hesaplarınızı tanımlayın, bankanızdan indirdiğiniz ekstre (CSV) dosyasını içe aktararak
            işlemlerinizi otomatik olarak Gelir/Gider listesine ekleyin.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="btn-gold-cta inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-secondary dark:bg-secondary dark:text-foreground dark:hover:bg-slate-200"
        >
          <Plus className="h-4 w-4" />
          Yeni Hesap Ekle
        </button>
      </div>

      {/* Gerçek Open Banking hakkında bilgilendirme */}
      <div className="flex gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm dark:border-border dark:bg-primary dark:text-muted-foreground">
        <Info className="h-5 w-5 shrink-0 text-brand-gold" />
        <p>
          Bankanıza canlı bağlanıp işlemleri otomatik çekme (gerçek &quot;Open Banking&quot;), BDDK lisanslı
          bir aracı kuruluş (TPP) üzerinden yapılabilir ve ayrı bir sözleşme/API anahtarı gerektirir.
          Bu sayfa, bankanızın internet şubesinden indirdiğiniz ekstre CSV&apos;sini içe aktararak aynı
          sonucu (işlemlerin elle tek tek girilmesine gerek kalmadan listeye eklenmesini) sağlar.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card py-12 text-center text-muted-foreground shadow-sm dark:border-border dark:bg-primary">
          Yükleniyor...
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-12 text-center text-muted-foreground shadow-sm dark:border-border dark:bg-primary">
          Henüz banka hesabı eklemediniz. &quot;Yeni Hesap Ekle&quot; ile başlayın.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-border dark:bg-primary">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-brand-gold" />
                  <div>
                    <h3 className="font-semibold text-foreground dark:text-foreground">{acc.name}</h3>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                      {acc.bank_name || 'Banka belirtilmedi'}{acc.iban_last4 ? ` · ****${acc.iban_last4}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleOpenEditModal(acc)} className="p-1.5 text-muted-foreground hover:text-foreground dark:hover:text-white">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(acc.id)} className="p-1.5 text-muted-foreground hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="mt-4 text-2xl font-bold text-foreground dark:text-foreground">
                {formatCurrency(acc.current_balance, acc.currency)}
              </p>

              <button
                onClick={() => openImportFor(acc.id)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted dark:border-border dark:text-foreground dark:hover:bg-secondary"
              >
                <UploadCloud className="h-4 w-4" />
                Ekstre (CSV) İçe Aktar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hesap Ekle/Düzenle Modalı */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl dark:bg-primary dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-border pb-4 dark:border-border">
              <h2 className="text-lg font-bold">{editingId ? 'Hesabı Düzenle' : 'Yeni Banka Hesabı'}</h2>
              <button onClick={() => setIsAccountModalOpen(false)} className="text-muted-foreground hover:text-foreground dark:hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Hesap Adı</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: İşletme Vadesiz Hesabı"
                  className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-border dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Banka</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Örn: Yapı Kredi"
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-border dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">IBAN (son 4 hane)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={ibanLast4}
                    onChange={(e) => setIbanLast4(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-border dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Para Birimi</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-border dark:text-white"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code} className="dark:bg-primary">{c.code} — {c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Güncel Bakiye</label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentBalance}
                    onChange={(e) => setCurrentBalance(e.target.value)}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-border dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
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

      {/* CSV İçe Aktarma Modalı */}
      {importAccountId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-2xl dark:bg-primary dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-border pb-4 dark:border-border">
              <h2 className="text-lg font-bold">
                {importAccount?.name} — Ekstre İçe Aktar
              </h2>
              <button
                onClick={() => { setImportAccountId(null); setParsedRows([]); }}
                className="text-muted-foreground hover:text-foreground dark:hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">
                  CSV Dosyası (Tarih, Açıklama, Tutar sütunları içermeli)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileSelected}
                  className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm dark:border-border dark:text-white"
                />
              </div>

              {parsedRows.length > 0 && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">
                      Varsayılan Kategori (giderler için, opsiyonel)
                    </label>
                    <select
                      value={importDefaultCategoryId}
                      onChange={(e) => setImportDefaultCategoryId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-border dark:text-white"
                    >
                      <option value="" className="dark:bg-primary">Kategorisiz</option>
                      {expenseCategories.map((cat) => (
                        <option key={cat.id} value={cat.id} className="dark:bg-primary">{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    {parsedRows.length} işlem okundu{skippedCount > 0 ? `, ${skippedCount} satır ayrıştırılamadığı için atlandı` : ''}.
                    Aşağıda ilk 8 satırın önizlemesi var.
                  </p>

                  <div className="max-h-64 overflow-y-auto rounded-xl border border-border dark:border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted dark:bg-secondary">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-foreground dark:text-foreground">Tarih</th>
                          <th className="px-3 py-2 text-left font-medium text-foreground dark:text-foreground">Açıklama</th>
                          <th className="px-3 py-2 text-right font-medium text-foreground dark:text-foreground">Tutar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(0, 8).map((row, i) => (
                          <tr key={i} className="border-t border-border dark:border-border">
                            <td className="px-3 py-2 text-muted-foreground dark:text-muted-foreground">{new Date(row.date).toLocaleDateString('tr-TR')}</td>
                            <td className="px-3 py-2 text-foreground dark:text-foreground">{row.description}</td>
                            <td className={`px-3 py-2 text-right font-medium ${row.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {formatCurrency(row.amount, 'TRY')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setImportAccountId(null); setParsedRows([]); }}
                  className="rounded-xl px-4 py-2 text-sm text-muted-foreground hover:bg-secondary dark:text-muted-foreground dark:hover:bg-secondary"
                >
                  İptal
                </button>
                <button
                  type="button"
                  disabled={parsedRows.length === 0 || isImporting}
                  onClick={handleConfirmImport}
                  className="btn-gold-cta rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white transition hover:bg-secondary disabled:opacity-50 dark:bg-secondary dark:text-foreground dark:hover:bg-slate-200"
                >
                  {isImporting ? 'Aktarılıyor...' : `${parsedRows.length} İşlemi İçe Aktar`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
