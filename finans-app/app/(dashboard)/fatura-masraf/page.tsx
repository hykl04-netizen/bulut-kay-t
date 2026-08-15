'use client';

import { useState, useEffect } from 'react';
import { Plus, X, ClipboardPaste } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { columns, Bill } from './columns';
import { supabase } from '@/lib/supabase/client';
import { BulkPasteModal } from './bulk-paste-modal';

export default function FaturaMasrafPage() {
  const [data, setData] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] = useState<'aylik' | 'yillik'>('aylik');

  const fetchBills = async () => {
    setLoading(true);
    const { data: bills, error } = await supabase
      .from('bills')
      .select('*')
      .order('due_date', { ascending: true });

    if (!error && bills) {
      setData(bills as Bill[]);
    } else if (error) {
      console.error('Fatura/Masraf veri çekme hatası:', error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBills();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setDueDate('');
    setIsRecurring(false);
    setRecurrencePeriod('aylik');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('bills').insert({
      user_id: user.id,
      title,
      amount: parseFloat(amount),
      due_date: dueDate || null,
      is_recurring: isRecurring,
      recurrence_period: isRecurring ? recurrencePeriod : null,
      status: 'odenmedi',
    });

    if (!error) {
      setIsModalOpen(false);
      resetForm();
      fetchBills();
    } else {
      alert('Kayıt sırasında bir hata oluştu: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('bills').delete().eq('id', id);
    if (error) {
      alert('Silinemedi: ' + error.message);
    } else {
      fetchBills();
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: 'odendi' | 'odenmedi') => {
    const newStatus = currentStatus === 'odendi' ? 'odenmedi' : 'odendi';
    const { error } = await supabase.from('bills').update({ status: newStatus }).eq('id', id);
    if (error) {
      alert('Durum güncellenemedi: ' + error.message);
    } else {
      fetchBills();
    }
  };

  const handleCellEdit = async (id: string, field: 'title' | 'amount' | 'due_date', value: string) => {
    const previous = data.find((item) => item.id === id);
    if (!previous) return;

    const parsedValue: string | number | null = field === 'amount' ? parseFloat(value) : (value || null);

    setData((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: parsedValue } : item)));

    const payload: Record<string, string | number | null> =
      field === 'amount' ? { amount: parsedValue as number } : { [field]: value || null };
    const { error } = await supabase.from('bills').update(payload).eq('id', id);
    if (error) {
      setData((prev) => prev.map((item) => (item.id === id ? previous : item)));
      alert('Güncellenemedi: ' + error.message);
      throw error;
    }
  };

  const handleBulkImport = async (
    rows: { user_id: string; title: string; amount: number; due_date: string | null; is_recurring: boolean; recurrence_period: 'aylik' | 'yillik' | null; status: 'odenmedi' }[]
  ) => {
    const { data: inserted, error } = await supabase.from('bills').insert(rows).select();
    if (error) {
      alert('Toplu ekleme sırasında bir hata oluştu: ' + error.message);
      throw error;
    }
    if (inserted) {
      setData((prev) =>
        [...(inserted as Bill[]), ...prev].sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date < b.due_date ? -1 : 1;
        })
      );
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Fatura ve Masraflar</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Tüm fatura ve tekrarlayan masraflarınızı buradan yönetin.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!userId) { alert('Kullanıcı bilgisi yükleniyor, birazdan tekrar deneyin.'); return; }
              setIsBulkModalOpen(true);
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <ClipboardPaste className="w-4 h-4" />
            Excel&apos;den Yapıştır
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Fatura/Masraf Ekle
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-slate-500 dark:text-slate-400">Veriler yükleniyor...</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data}
            meta={{ onDelete: handleDelete, onToggleStatus: handleToggleStatus, onCellEdit: handleCellEdit }}
          />
        )}
      </div>

      {isBulkModalOpen && userId && (
        <BulkPasteModal
          userId={userId}
          onClose={() => setIsBulkModalOpen(false)}
          onImport={handleBulkImport}
        />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Yeni Fatura/Masraf Ekle</h2>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Başlık</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100" placeholder="Örn: Elektrik Faturası, Netflix..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tutar (₺)</label>
                <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100" placeholder="0.00" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vade Tarihi</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100" />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                />
                <label htmlFor="isRecurring" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Bu tekrarlayan bir fatura/masraf
                </label>
              </div>

              {isRecurring && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tekrar Sıklığı</label>
                  <div className="flex gap-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <label className={`flex-1 text-center py-2 rounded-md cursor-pointer transition-colors ${recurrencePeriod === 'aylik' ? 'bg-white dark:bg-slate-900 shadow-sm font-medium text-slate-900 dark:text-slate-50' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                      <input type="radio" className="hidden" checked={recurrencePeriod === 'aylik'} onChange={() => setRecurrencePeriod('aylik')} />
                      Aylık
                    </label>
                    <label className={`flex-1 text-center py-2 rounded-md cursor-pointer transition-colors ${recurrencePeriod === 'yillik' ? 'bg-white dark:bg-slate-900 shadow-sm font-medium text-slate-900 dark:text-slate-50' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                      <input type="radio" className="hidden" checked={recurrencePeriod === 'yillik'} onChange={() => setRecurrencePeriod('yillik')} />
                      Yıllık
                    </label>
                  </div>
                </div>
              )}

              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-lg mt-4 transition-colors">
                Kaydet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}