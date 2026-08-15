'use client';

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { columns, Debt } from './columns';
import { supabase } from '@/lib/supabase/client';

export default function BorcAlacakPage() {
  const [data, setData] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    const payload: Record<string, string | number | null> =
      field === 'amount' ? { amount: parseFloat(value) } : { [field]: value || null };
    const { error } = await supabase.from('debts').update(payload).eq('id', id);
    if (error) {
      alert('Güncellenemedi: ' + error.message);
      throw error;
    }
    fetchDebts();
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Borç ve Alacaklar</h1>
          <p className="text-slate-500 mt-1">Tüm borç ve alacaklarınızı buradan takip edin.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Kayıt Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-slate-500">Veriler yükleniyor...</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data}
            meta={{ onDelete: handleDelete, onToggleStatus: handleToggleStatus, onCellEdit: handleCellEdit }}
          />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Yeni Borç/Alacak Ekle</h2>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tür</label>
                <div className="flex gap-4 p-1 bg-slate-100 rounded-lg">
                  <label className={`flex-1 text-center py-2 rounded-md cursor-pointer transition-colors ${direction === 'borc' ? 'bg-white shadow-sm font-medium text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>
                    <input type="radio" className="hidden" checked={direction === 'borc'} onChange={() => setDirection('borc')} />
                    Borç (ben ödeyeceğim)
                  </label>
                  <label className={`flex-1 text-center py-2 rounded-md cursor-pointer transition-colors ${direction === 'alacak' ? 'bg-white shadow-sm font-medium text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
                    <input type="radio" className="hidden" checked={direction === 'alacak'} onChange={() => setDirection('alacak')} />
                    Alacak (bana ödenecek)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kime / Kimden</label>
                <input type="text" required value={counterparty} onChange={(e) => setCounterparty(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="Örn: Ahmet, ABC Şirketi..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tutar (₺)</label>
                <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="0.00" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vade Tarihi (opsiyonel)</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Not (opsiyonel)</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="Ek bilgi..." />
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