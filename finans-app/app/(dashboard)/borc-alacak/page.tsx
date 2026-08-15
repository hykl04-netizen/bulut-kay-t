'use client';

import { useState, useEffect } from 'react';
import { Plus, X, ClipboardPaste } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { columns, Debt } from './columns';
import { supabase } from '@/lib/supabase/client';
import { BulkPasteModal } from './bulk-paste-modal';

export default function BorcAlacakPage() {
  const [data, setData] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [direction, setDirection] = useState<'borc' | 'alacak'>('borc');
  const [counterparty, setCounterparty] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const fetchDebts = async () => {
    setLoading(true);
    const { data: debts, error } = await supabase
      .from('debts')
      .select('*')
      .order('due_date', { ascending: true });

    if (!error && debts) {
      setData(debts as Debt[]);
    } else if (error) {
      console.error('Borç-Alacak veri çekme hatası:', error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDebts();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const resetForm = () => {
    setDirection('borc');
    setCounterparty('');
    setAmount('');
    setDueDate('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('debts').insert({
      user_id: user.id,
      direction,
      counterparty,
      amount: parseFloat(amount),
      due_date: dueDate || null,
      notes: notes || null,
      status: 'acik',
    });

    if (!error) {
      setIsModalOpen(false);
      resetForm();
      fetchDebts();
    } else {
      alert('Kayıt sırasında bir hata oluştu: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('debts').delete().eq('id', id);
    if (error) {
      alert('Silinemedi: ' + error.message);
    } else {
      fetchDebts();
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: 'acik' | 'kapandi') => {
    const newStatus = currentStatus === 'acik' ? 'kapandi' : 'acik';
    const { error } = await supabase.from('debts').update({ status: newStatus }).eq('id', id);
    if (error) {
      alert('Durum güncellenemedi: ' + error.message);
    } else {
      fetchDebts();
    }
  };

  const handleCellEdit = async (id: string, field: 'counterparty' | 'amount' | 'due_date', value: string) => {
    const previous = data.find((item) => item.id === id);
    if (!previous) return;

    const parsedValue: string | number | null = field === 'amount' ? parseFloat(value) : (value || null);

    setData((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: parsedValue } : item)));

    const payload: Record<string, string | number | null> =
      field === 'amount' ? { amount: parsedValue as number } : { [field]: value || null };
    const { error } = await supabase.from('debts').update(payload).eq('id', id);
    if (error) {
      setData((prev) => prev.map((item) => (item.id === id ? previous : item)));
      alert('Güncellenemedi: ' + error.message);
      throw error;
    }
  };

  const handleBulkImport = async (
    rows: { user_id: string; direction: 'borc' | 'alacak'; counterparty: string; amount: number; due_date: string | null; notes: string | null; status: 'acik' }[]
  ) => {
    const { data: inserted, error } = await supabase.from('debts').insert(rows).select();
    if (error) {
      alert('Toplu ekleme sırasında bir hata oluştu: ' + error.message);
      throw error;
    }
    if (inserted) {
      setData((prev) =>
        [...(inserted as Debt[]), ...prev].sort((a, b) => {
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Borç ve Alacaklar</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Tüm borç ve alacaklarınızı buradan takip edin.</p>
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
            Yeni Kayıt Ekle
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
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Yeni Borç/Alacak Ekle</h2>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tür</label>
                <div className="flex gap-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <label className={`flex-1 text-center py-2 rounded-md cursor-pointer transition-colors ${direction === 'borc' ? 'bg-white dark:bg-slate-900 shadow-sm font-medium text-rose-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                    <input type="radio" className="hidden" checked={direction === 'borc'} onChange={() => setDirection('borc')} />
                    Borç (ben ödeyeceğim)
                  </label>
                  <label className={`flex-1 text-center py-2 rounded-md cursor-pointer transition-colors ${direction === 'alacak' ? 'bg-white dark:bg-slate-900 shadow-sm font-medium text-emerald-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                    <input type="radio" className="hidden" checked={direction === 'alacak'} onChange={() => setDirection('alacak')} />
                    Alacak (bana ödenecek)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kime / Kimden</label>
                <input type="text" required value={counterparty} onChange={(e) => setCounterparty(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100" placeholder="Örn: Ahmet, ABC Şirketi..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tutar (₺)</label>
                <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100" placeholder="0.00" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vade Tarihi (opsiyonel)</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Not (opsiyonel)</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100" placeholder="Ek bilgi..." />
              </div>

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