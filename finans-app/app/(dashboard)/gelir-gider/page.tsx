// app/(dashboard)/gelir-gider/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Plus, ClipboardPaste, X } from 'lucide-react';
import { FileUpload } from '@/components/file-upload';
import { DataTable } from '@/components/data-table/data-table';
import { columns, type Transaction } from './columns';
import { BulkPasteModal } from './bulk-paste-modal';

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
}

const SELECT_WITH_CATEGORY = '*, category:categories(name, color)';

export default function GelirGiderPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

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

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);

      // İşlemleri çek
      const { data: txData } = await supabase
        .from('transactions')
        .select(SELECT_WITH_CATEGORY)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (txData) setTransactions(txData as unknown as Transaction[]);

      // Kategorileri çek
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
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

    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: parsedValue } : t))
    );

    const { error } = await supabase.from('transactions').update({ [field]: parsedValue }).eq('id', id);

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
      user_id: string;
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
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsSubmitting(false);
      alert('Oturumunuz sona ermiş görünüyor. Lütfen sayfayı yenileyip tekrar giriş yapın.');
      return;
    }

    const payload = {
      user_id: user.id,
      type,
      category_id: categoryId || null,
      amount: parseFloat(amount) || 0,
      date,
      description,
      receipt_url: receiptUrl || null,
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
        alert('Güncellenirken hata oluştu.');
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
        alert('Eklenirken hata oluştu.');
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Gelir ve Gider Yönetimi</h1>
          <p className="mt-1 text-muted-foreground dark:text-muted-foreground">
            Finansal hareketlerinizi profesyonel kategorilerle takip edin, faturalarınızı ekleyin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted dark:border-border dark:text-foreground dark:hover:bg-secondary"
          >
            <ClipboardPaste className="h-4 w-4" />
            Excel&apos;den Yapıştır
          </button>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-secondary dark:bg-secondary dark:text-foreground dark:hover:bg-slate-200"
          >
            <Plus className="h-4 w-4" />
            Yeni İşlem Ekle
          </button>
        </div>
      </div>

      {/* Liste Tablosu — inline düzenlenebilir hücrelerle (çift tıkla → düzenle) */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card py-12 text-center text-muted-foreground shadow-sm dark:border-border dark:bg-primary">
          Yükleniyor...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={transactions}
          meta={{
            onEdit: handleOpenEditModal,
            onDelete: handleDelete,
            onCellEdit: handleCellEdit,
          }}
        />
      )}

      {/* Ekleme / Düzenleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl dark:bg-primary dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-border pb-4 dark:border-border">
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
                        : 'bg-secondary text-muted-foreground dark:bg-secondary dark:text-muted-foreground'
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
                        : 'bg-secondary text-muted-foreground dark:bg-secondary dark:text-muted-foreground'
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
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-border dark:text-white"
                  >
                    <option value="" className="dark:bg-primary">Kategori Seçin</option>
                    {filteredCategories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="dark:bg-primary">{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Tutar (TL)</label>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Tarih</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-border dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Açıklama</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Örn: Sunucu ve bulut hizmeti"
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-border dark:text-white"
                  />
                </div>
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
                  className="rounded-xl px-4 py-2 text-sm text-muted-foreground hover:bg-secondary dark:text-muted-foreground dark:hover:bg-secondary"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white transition hover:bg-secondary disabled:opacity-50 dark:bg-secondary dark:text-foreground dark:hover:bg-slate-200"
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
          categories={categories}
          userId={userId}
          onClose={() => setIsBulkModalOpen(false)}
          onImport={handleBulkImport}
        />
      )}
    </div>
  );
}