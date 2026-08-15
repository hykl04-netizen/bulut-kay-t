// app/(dashboard)/fatura-masraf/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Plus, Trash2, Edit3, Receipt, ExternalLink, X, Calendar } from 'lucide-react';
import { FileUpload } from '@/components/file-upload';

interface Bill {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  is_recurring: boolean;
  recurrence_period: string;
  status: 'odendi' | 'odenmedi';
  receipt_url?: string;
  categories?: { name: string };
}

interface Category {
  id: string;
  name: string;
  type: string;
}

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
function formatTRY(value: number) {
  return TRY_FORMATTER.format(value);
}

export default function FaturaMasrafPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] = useState('aylik');
  const [status, setStatus] = useState<'odendi' | 'odenmedi'>('odenmedi');
  const [categoryId, setCategoryId] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: billData } = await supabase
        .from('bills')
        .select('*, categories(name)')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (billData) setBills(billData);

      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'gider');

      if (catData) setCategories(catData);
    }
    setLoading(false);
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setTitle('');
    setAmount('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setIsRecurring(false);
    setRecurrencePeriod('aylik');
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
    setStatus(bill.status);
    setReceiptUrl(bill.receipt_url || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      title,
      amount: parseFloat(amount) || 0,
      due_date: dueDate,
      is_recurring: isRecurring,
      recurrence_period: isRecurring ? recurrencePeriod : null,
      status,
      category_id: categoryId || null,
      receipt_url: receiptUrl || null,
    };

    if (editingId) {
      const { error } = await supabase.from('bills').update(payload).eq('id', editingId);
      if (!error) {
        setIsModalOpen(false);
        await fetchData();
      } else {
        alert('Güncellenirken hata oluştu.');
      }
    } else {
      const { error } = await supabase.from('bills').insert(payload);
      if (!error) {
        setIsModalOpen(false);
        await fetchData();
      } else {
        alert('Eklenirken hata oluştu.');
      }
    }
    setIsSubmitting(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'odendi' ? 'odenmedi' : 'odendi';
    const { error } = await supabase.from('bills').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setBills((prev) => prev.map((b) => (b.id === id ? { ...b, status: newStatus as any } : b)));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu faturayı silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('bills').delete().eq('id', id);
    if (!error) {
      setBills((prev) => prev.filter((b) => b.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Fatura ve Masraflar</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Kurumsal faturalarınızı, aboneliklerinizi ve ödeme vadelerinizi buradan yönetin.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <Plus className="h-4 w-4" />
          Yeni Fatura/Masraf Ekle
        </button>
      </div>

      {/* Tablo Alanı */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 font-medium">Başlık</th>
                <th className="px-6 py-4 font-medium text-right">Tutar</th>
                <th className="px-6 py-4 font-medium">Vade Tarihi</th>
                <th className="px-6 py-4 font-medium">Tekrar</th>
                <th className="px-6 py-4 font-medium">Durum</th>
                <th className="px-6 py-4 font-medium text-center">Belge</th>
                <th className="px-6 py-4 font-medium text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Yükleniyor...</td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Kayıtlı fatura bulunmuyor.</td>
                </tr>
              ) : (
                bills.map((bill) => (
                  <tr key={bill.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{bill.title}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                      {formatTRY(Number(bill.amount))}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">{bill.due_date}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {bill.is_recurring ? `Tekrarlayan (${bill.recurrence_period})` : 'Tek seferlik'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(bill.id, bill.status)}
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold transition ${
                          bill.status === 'odendi'
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-400'
                        }`}
                      >
                        {bill.status === 'odendi' ? 'Ödendi' : 'Ödenmedi'}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      {bill.receipt_url ? (
                        <a
                          href={bill.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Görüntüle
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(bill)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          title="Düzenle"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(bill.id)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ekleme / Düzenleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="text-lg font-bold">{editingId ? 'Faturayı Düzenle' : 'Yeni Fatura / Masraf Ekle'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Fatura / Masraf Başlığı</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Bulut Sunucu / Ofis Kirası"
                  className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Tutar (TL)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Vade Tarihi</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Kategori</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:text-white"
                  >
                    <option value="" className="dark:bg-slate-900">Seçiniz</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="dark:bg-slate-900">{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Durum</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:text-white"
                  >
                    <option value="odenmedi" className="dark:bg-slate-900">Ödenmedi</option>
                    <option value="odendi" className="dark:bg-slate-900">Ödendi</option>
                  </select>
                </div>
              </div>

              {/* Fatura Belgesi Yükleme */}
              <FileUpload onUploadSuccess={(url) => setReceiptUrl(url)} label="Fatura Belgesi / PDF Yükle (Opsiyonel)" />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  {isSubmitting ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}