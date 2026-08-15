// app/(dashboard)/borc-alacak/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Trash2, CheckCircle2, HandCoins, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface Debt {
  id: string;
  direction: 'borc' | 'alacak';
  counterparty: string;
  amount: number;
  due_date: string | null;
  status: 'acik' | 'kapandi';
  notes: string | null;
}

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
function formatTRY(value: number) {
  return TRY_FORMATTER.format(value);
}

export default function BorcAlacakPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [direction, setDirection] = useState<'borc' | 'alacak'>('alacak');
  const [counterparty, setCounterparty] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDebts();
  }, []);

  const fetchDebts = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (!error && data) setDebts(data);
    }
    setLoading(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'acik' ? 'kapandi' : 'acik';
    const { error } = await supabase.from('debts').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, status: newStatus as any } : d)));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('debts').delete().eq('id', id);
    if (!error) {
      setDebts((prev) => prev.filter((d) => d.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <Plus className="h-4 w-4" />
          Yeni Kayıt Ekle
        </button>
      </div>

      {/* Tablo Alanı */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 font-medium">Yön</th>
                <th className="px-6 py-4 font-medium">Kişi / Kurum</th>
                <th className="px-6 py-4 font-medium text-right">Tutar</th>
                <th className="px-6 py-4 font-medium">Vade Tarihi</th>
                <th className="px-6 py-4 font-medium">Durum</th>
                <th className="px-6 py-4 font-medium text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">Yükleniyor...</td>
                </tr>
              ) : debts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">Kayıtlı borç veya alacak bulunmuyor.</td>
                </tr>
              ) : (
                debts.map((debt) => (
                  <tr key={debt.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        debt.direction === 'alacak'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                      }`}>
                        {debt.direction === 'alacak' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {debt.direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{debt.counterparty}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                      {formatTRY(Number(debt.amount))}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">{debt.due_date || '-'}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(debt.id, debt.status)}
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold transition ${
                          debt.status === 'kapandi'
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-400'
                        }`}
                      >
                        {debt.status === 'kapandi' ? 'Kapandı' : 'Açık'}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <button
                        onClick={() => handleDelete(debt.id)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
}