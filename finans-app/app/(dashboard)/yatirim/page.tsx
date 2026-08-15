'use client';

import { useState, useEffect } from 'react';
import { Plus, X, ClipboardPaste } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { columns, Investment } from './columns';
import { supabase } from '@/lib/supabase/client';
import { BulkPasteModal } from './bulk-paste-modal';

const ASSET_TYPES = [
  { value: 'hisse', label: 'Hisse' },
  { value: 'doviz', label: 'Döviz' },
  { value: 'kripto', label: 'Kripto' },
  { value: 'fon', label: 'Fon' },
  { value: 'altin', label: 'Altın' },
] as const;

export default function YatirimPage() {
  const [data, setData] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [assetType, setAssetType] = useState<typeof ASSET_TYPES[number]['value']>('hisse');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currency, setCurrency] = useState('TRY');

  const fetchInvestments = async () => {
    setLoading(true);
    const { data: investments, error } = await supabase
      .from('investments')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && investments) {
      setData(investments as Investment[]);
    } else if (error) {
      console.error('Yatırım veri çekme hatası:', error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvestments();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setAssetType('hisse');
    setSymbol('');
    setQuantity('');
    setAvgCost('');
    setCurrentPrice('');
    setCurrency('TRY');
  };

  const handleEdit = (investment: Investment) => {
    setEditingId(investment.id);
    setAssetType(investment.asset_type);
    setSymbol(investment.symbol);
    setQuantity(String(investment.quantity));
    setAvgCost(investment.avg_cost !== null ? String(investment.avg_cost) : '');
    setCurrentPrice(investment.current_price !== null ? String(investment.current_price) : '');
    setCurrency(investment.currency);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu yatırımı silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('investments').delete().eq('id', id);
    if (error) {
      alert('Silinemedi: ' + error.message);
    } else {
      fetchInvestments();
    }
  };

  const handleCellEdit = async (id: string, field: 'quantity' | 'avg_cost' | 'current_price', value: string) => {
    const previous = data.find((item) => item.id === id);
    if (!previous) return;

    const parsedValue = value === '' ? null : parseFloat(value);

    setData((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: parsedValue } : item)));

    const payload: Record<string, number | null> = { [field]: parsedValue };
    const { error } = await supabase.from('investments').update(payload).eq('id', id);
    if (error) {
      setData((prev) => prev.map((item) => (item.id === id ? previous : item)));
      alert('Güncellenemedi: ' + error.message);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      asset_type: assetType,
      symbol: symbol.toUpperCase(),
      quantity: parseFloat(quantity),
      avg_cost: avgCost ? parseFloat(avgCost) : null,
      current_price: currentPrice ? parseFloat(currentPrice) : null,
      currency,
      updated_at: new Date().toISOString(),
    };

    const { error } = editingId
      ? await supabase.from('investments').update(payload).eq('id', editingId)
      : await supabase.from('investments').insert(payload);

    if (!error) {
      setIsModalOpen(false);
      resetForm();
      fetchInvestments();
    } else {
      alert('Kayıt sırasında bir hata oluştu: ' + error.message);
    }
  };

  const handleBulkImport = async (
    rows: { user_id: string; asset_type: typeof ASSET_TYPES[number]['value']; symbol: string; quantity: number; avg_cost: number | null; current_price: number | null; currency: string; updated_at: string }[]
  ) => {
    const { data: inserted, error } = await supabase.from('investments').insert(rows).select();
    if (error) {
      alert('Toplu ekleme sırasında bir hata oluştu: ' + error.message);
      throw error;
    }
    if (inserted) {
      setData((prev) => [...(inserted as Investment[]), ...prev]);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Yatırım Portföyü</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Hisse, döviz, kripto ve diğer yatırımlarınızı buradan yönetin.</p>
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
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Yatırım Ekle
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
            meta={{ onEdit: handleEdit, onDelete: handleDelete, onCellEdit: handleCellEdit }}
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
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                {editingId ? 'Yatırımı Düzenle' : 'Yeni Yatırım Ekle'}
              </h2>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Varlık Türü</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value as typeof assetType)}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100"
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sembol</label>
                <input type="text" required value={symbol} onChange={(e) => setSymbol(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100" placeholder="Örn: THYAO, USD, BTC..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Miktar</label>
                  <input type="number" step="0.00000001" required value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Para Birimi</label>
                  <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100" placeholder="TRY" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ort. Maliyet</label>
                  <input type="number" step="0.0001" value={avgCost} onChange={(e) => setAvgCost(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100" placeholder="Opsiyonel" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Güncel Fiyat</label>
                  <input type="number" step="0.0001" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100" placeholder="Opsiyonel" />
                </div>
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