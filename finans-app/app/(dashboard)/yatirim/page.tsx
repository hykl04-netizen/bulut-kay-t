// app/(dashboard)/yatirim/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, ClipboardPaste, X, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { DataTable } from '@/components/data-table/data-table';
import { columns, type Investment } from './columns';
import { BulkPasteModal } from './bulk-paste-modal';

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
function formatTRY(value: number) {
  return TRY_FORMATTER.format(value);
}

export default function YatirimPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [assetType, setAssetType] = useState<'hisse' | 'doviz' | 'kripto' | 'fon' | 'altin'>('hisse');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInvestments = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id);

      if (!error && data) setInvestments(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchInvestments();
    });
  }, []);


  // Faz 7.4 — Excel'den toplu yapıştırma: satırları tek seferde insert edip
  // local state'e optimistic olarak ekle (tam yeniden çekim yok).
  const handleBulkImport = async (
    rows: {
      user_id: string;
      asset_type: 'hisse' | 'doviz' | 'kripto' | 'fon' | 'altin';
      symbol: string;
      quantity: number;
      avg_cost: number | null;
      current_price: number | null;
      currency: string;
      updated_at: string;
    }[]
  ) => {
    const { data, error } = await supabase.from('investments').insert(rows).select('*');

    if (error) {
      alert('Toplu ekleme sırasında hata oluştu: ' + error.message);
      return;
    }

    if (data) {
      setInvestments((prev) => [...(data as Investment[]), ...prev]);
    }
  };

  const handleOpenEditModal = (inv: Investment) => {
    setEditingId(inv.id);
    setAssetType(inv.asset_type);
    setSymbol(inv.symbol);
    setQuantity(String(inv.quantity));
    setAvgCost(inv.avg_cost !== null ? String(inv.avg_cost) : '');
    setCurrentPrice(inv.current_price !== null ? String(inv.current_price) : '');
    setCurrency(inv.currency || 'TRY');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu yatırımı silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('investments').delete().eq('id', id);
    if (!error) {
      setInvestments((prev) => prev.filter((i) => i.id !== id));
    }
  };

  // Faz 7.2/7.3 — hücre bazlı optimistic düzenleme
  const handleCellEdit = async (
    id: string,
    field: 'quantity' | 'avg_cost' | 'current_price',
    value: string
  ) => {
    const previous = investments.find((i) => i.id === id);
    if (!previous) return;

    const parsedValue =
      value === '' ? (field === 'quantity' ? 0 : null) : parseFloat(value);
    if (parsedValue !== null && Number.isNaN(parsedValue)) return;

    setInvestments((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: parsedValue } : i)));

    const { error } = await supabase.from('investments').update({ [field]: parsedValue }).eq('id', id);
    if (error) {
      setInvestments((prev) => prev.map((i) => (i.id === id ? previous : i)));
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
      asset_type: assetType,
      symbol: symbol.toUpperCase(),
      quantity: parseFloat(quantity) || 0,
      avg_cost: avgCost ? parseFloat(avgCost) : null,
      current_price: currentPrice ? parseFloat(currentPrice) : null,
      currency,
    };

    if (editingId) {
      // Güncelle — optimistic: tam yeniden çekim yerine local state'i güncelle
      const { data, error } = await supabase
        .from('investments')
        .update(payload)
        .eq('id', editingId)
        .select('*')
        .single();
      if (!error && data) {
        setInvestments((prev) => prev.map((i) => (i.id === editingId ? (data as Investment) : i)));
        setIsModalOpen(false);
      } else {
        alert('Hata oluştu: ' + error?.message);
      }
    } else {
      // Yeni Ekle — optimistic: dönen kaydı doğrudan listeye ekle
      const { data, error } = await supabase
        .from('investments')
        .insert(payload)
        .select('*')
        .single();
      if (!error && data) {
        setInvestments((prev) => [data as Investment, ...prev]);
        setIsModalOpen(false);
      } else {
        alert('Hata oluştu: ' + error?.message);
      }
    }
    setEditingId(null);
    setSymbol('');
    setQuantity('');
    setAvgCost('');
    setCurrentPrice('');
    setIsSubmitting(false);
  };

  const totalPortfolioValue = investments.reduce((sum, inv) => {
    const price = inv.current_price ?? inv.avg_cost ?? 0;
    return sum + Number(inv.quantity) * Number(price);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Yatırım Portföyü</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Hisse senetleri, döviz, kripto varlıklar ve kıymetli madenlerinizi buradan takip edin.
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
            onClick={() => {
              setEditingId(null);
              setAssetType('hisse');
              setSymbol('');
              setQuantity('');
              setAvgCost('');
              setCurrentPrice('');
              setCurrency('TRY');
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <Plus className="h-4 w-4" />
            Yeni Yatırım Ekle
          </button>
        </div>
      </div>

      {/* Portföy Özet Kartı */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Toplam Portföy Değeri</span>
          <TrendingUp className="h-5 w-5 text-blue-500" />
        </div>
        <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{formatTRY(totalPortfolioValue)}</div>
      </div>

      {/* Liste Tablosu — inline düzenlenebilir hücrelerle (çift tıkla → düzenle) */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          Yükleniyor...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={investments}
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
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="text-lg font-bold">{editingId ? 'Yatırımı Düzenle' : 'Yeni Yatırım Ekle'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Varlık Türü</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value as 'hisse' | 'doviz' | 'kripto' | 'fon' | 'altin')}
                  className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:text-white"
                >
                  <option value="hisse" className="dark:bg-slate-900">Hisse Senedi</option>
                  <option value="doviz" className="dark:bg-slate-900">Döviz</option>
                  <option value="kripto" className="dark:bg-slate-900">Kripto Varlık</option>
                  <option value="fon" className="dark:bg-slate-900">Yatırım Fonu</option>
                  <option value="altin" className="dark:bg-slate-900">Altın / Kıymetli Maden</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Sembol / Kod</label>
                <input
                  type="text"
                  required
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="Örn: THYAO, USD, BTC, GRAM"
                  className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Miktar</label>
                  <input
                    type="number"
                    step="0.00000001"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Para Birimi</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Ortalama Maliyet</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={avgCost}
                    onChange={(e) => setAvgCost(e.target.value)}
                    placeholder="Opsiyonel"
                    className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Güncel Fiyat</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    placeholder="Opsiyonel"
                    className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:text-white"
                  />
                </div>
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
          userId={userId}
          onClose={() => setIsBulkModalOpen(false)}
          onImport={handleBulkImport}
        />
      )}
    </div>
  );
}