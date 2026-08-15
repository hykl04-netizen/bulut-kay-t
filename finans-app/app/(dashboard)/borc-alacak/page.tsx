// app/(dashboard)/borc-alacak/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, ClipboardPaste, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { DataTable } from '@/components/data-table/data-table';
import { columns, type Debt } from './columns';
import { BulkPasteModal } from './bulk-paste-modal';

export default function BorcAlacakPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const [direction, setDirection] = useState<'borc' | 'alacak'>('alacak');
  const [counterparty, setCounterparty] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDebts = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (!error && data) setDebts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchDebts();
    });
  }, []);

  // Faz 7.4 — Excel'den toplu yapıştırma: satırları tek seferde insert edip
  // local state'e optimistic olarak ekle (tam yeniden çekim yok).
  const handleBulkImport = async (
    rows: {
      user_id: string;
      direction: 'borc' | 'alacak';
      counterparty: string;
      amount: number;
      due_date: string | null;
      notes: string | null;
      status: 'acik';
    }[]
  ) => {
    const { data, error } = await supabase.from('debts').insert(rows).select('*');

    if (error) {
      alert('Toplu ekleme sırasında hata oluştu: ' + error.message);
      return;
    }

    if (data) {
      setDebts((prev) =>
        [...(data as Debt[]), ...prev].sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date < b.due_date ? -1 : 1;
        })
      );
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'acik' ? 'kapandi' : 'acik';
    const { error } = await supabase.from('debts').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, status: newStatus as 'acik' | 'kapandi' } : d)));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('debts').delete().eq('id', id);
    if (!error) {
      setDebts((prev) => prev.filter((d) => d.id !== id));
    }
  };

  // Faz 7.2/7.3 — hücre bazlı optimistic düzenleme
  const handleCellEdit = async (
    id: string,
    field: 'counterparty' | 'amount' | 'due_date' | 'notes',
    value: string
  ) => {
    const previous = debts.find((d) => d.id === id);
    if (!previous) return;

    // 'due_date' boş string olarak gelirse (kullanıcı tarihi silerse) Postgres'in
    // `date` kolonuna boş string yazılamaz — null gönderilmeli.
    const parsedValue =
      field === 'amount' ? parseFloat(value) || 0 : field === 'due_date' && value === '' ? null : value;

    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: parsedValue } : d)));

    const { error } = await supabase.from('debts').update({ [field]: parsedValue }).eq('id', id);
    if (error) {
      setDebts((prev) => prev.map((d) => (d.id === id ? previous : d)));
      throw error;
    }
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
      direction,
      counterparty,
      amount: parseFloat(amount) || 0,
      due_date: dueDate || null,
      notes: notes || null,
      status: 'acik',
    };

    const { error } = await supabase.from('debts').insert(payload);
    if (!error) {
      setIsModalOpen(false);
      setDirection('alacak');
      setCounterparty('');
      setAmount('');
      setDueDate('');
      setNotes('');
      await fetchDebts();
    } else {
      alert('Hata oluştu: ' + error.message);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Borç ve Alacaklar</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Kişi ve kurumlara olan borçlarınızı ve alacaklarınızı buradan yönetin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ClipboardPaste className="h-4 w-4" />
            Excel&apos;den Yapıştır
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <Plus className="h-4 w-4" />
            Yeni Kayıt Ekle
          </button>
        </div>
      </div>

      {/* Liste Tablosu — inline düzenlenebilir hücrelerle (çift tıkla → düzenle) */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          Yükleniyor...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={debts}
          meta={{
            onDelete: handleDelete,
            onToggleStatus: handleToggleStatus,
            onCellEdit: handleCellEdit,
          }}
        />
      )}

      {/* Ekleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="text-lg font-bold">Yeni Borç / Alacak Ekle</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">İşlem Yönü</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection('alacak')}
                    className={`rounded-xl py-2 text-sm font-medium transition ${
                      direction === 'alacak' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Alacak (Bana Ödenecek)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('borc')}
                    className={`rounded-xl py-2 text-sm font-medium transition ${
                      direction === 'borc' ? 'bg-rose-600 text-white shadow' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Borç (Ben Ödeyeceğim)
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Kişi / Kurum Adı</label>
                <input
                  type="text"
                  required
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz / ABC Şirketi"
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
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Notlar (Opsiyonel)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Açıklama..."
                  className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:text-white"
                />
              </div>

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
                  {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
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