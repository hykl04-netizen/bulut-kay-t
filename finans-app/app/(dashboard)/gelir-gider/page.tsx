'use client';

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { columns, Transaction } from './columns';
import { supabase } from '@/lib/supabase/client';

type Category = { id: string; name: string; color: string; type: string };

export default function GelirGiderPage() {
  const [data, setData] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [type, setType] = useState<'gelir' | 'gider'>('gider');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState<string>('');

  const fetchTransactions = async () => {
    setLoading(true);
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*, category:categories(name, color)')
      .order('date', { ascending: false });

    if (!error && transactions) {
      setData(transactions as unknown as Transaction[]);
    } else if (error) {
      console.error('Veri çekme hatası:', error.message);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data: cats } = await supabase.from('categories').select('*');
    if (cats) setCategories(cats as Category[]);
  };

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setType('gider');
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategoryId('');
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setType(transaction.type);
    setAmount(String(transaction.amount));
    setDescription(transaction.description);
    setDate(transaction.date);
    setCategoryId(transaction.category_id ?? '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu işlemi silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      alert('Silinemedi: ' + error.message);
    } else {
      fetchTransactions();
    }
  };

  const handleCellEdit = async (id: string, field: 'description' | 'amount' | 'date', value: string) => {
    const payload: Record<string, string | number> = field === 'amount' ? { amount: parseFloat(value) } : { [field]: value };
    const { error } = await supabase.from('transactions').update(payload).eq('id', id);
    if (error) {
      alert('Güncellenemedi: ' + error.message);
      throw error;
    }
    fetchTransactions();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      type,
      amount: parseFloat(amount),
      description,
      date,
      category_id: categoryId || null,
    };

    const { error } = editingId
      ? await supabase.from('transactions').update(payload).eq('id', editingId)
      : await supabase.from('transactions').insert(payload);

    if (!error) {
      setIsModalOpen(false);
      resetForm();
      fetchTransactions();
    } else {
      alert('Kayıt sırasında bir hata oluştu: ' + error.message);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gelir ve Giderler</h1>
          <p className="text-slate-500 mt-1">Tüm finansal hareketlerinizi buradan yönetin.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni İşlem Ekle
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
            meta={{ onEdit: handleEdit, onDelete: handleDelete, onCellEdit: handleCellEdit }}
          />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? 'İşlemi Düzenle' : 'Yeni İşlem Ekle'}
              </h2>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">İşlem Tipi</label>
                <div className="flex gap-4 p-1 bg-slate-100 rounded-lg">
                  <label className={`flex-1 text-center py-2 rounded-md cursor-pointer transition-colors ${type === 'gelir' ? 'bg-white shadow-sm font-medium text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
                    <input type="radio" className="hidden" checked={type === 'gelir'} onChange={() => { setType('gelir'); setCategoryId(''); }} />
                    Gelir
                  </label>
                  <label className={`flex-1 text-center py-2 rounded-md cursor-pointer transition-colors ${type === 'gider' ? 'bg-white shadow-sm font-medium text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>
                    <input type="radio" className="hidden" checked={type === 'gider'} onChange={() => { setType('gider'); setCategoryId(''); }} />
                    Gider
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">Kategori seçin (opsiyonel)</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tutar (₺)</label>
                <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="0.00" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="Örn: Market, Maaş..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tarih</label>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
              </div>

              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-lg mt-4 transition-colors">
                {editingId ? 'Güncelle' : 'Kaydet'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}