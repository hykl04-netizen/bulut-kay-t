// app/(dashboard)/yatirim/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Trash2, Pencil, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface Investment {
  id: string;
  asset_type: 'hisse' | 'doviz' | 'kripto' | 'fon' | 'altin';
  symbol: string;
  quantity: number;
  avg_cost: number | null;
  current_price: number | null;
  currency: string;
}

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
function formatTRY(value: number) {
  return TRY_FORMATTER.format(value);
}

const assetTypeLabels: Record<string, string> = {
  hisse: 'Hisse Senedi',
  doviz: 'Döviz',
  kripto: 'Kripto Varlık',
  fon: 'Yatırım Fonu',
  altin: 'Altın / Kıymetli Maden',
};

export default function YatirimPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [assetType, setAssetType] = useState<'hisse' | 'doviz' | 'kripto' | 'fon' | 'altin'>('hisse');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInvestments();
  }, []);

  const fetchInvestments = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id);

      if (!error && data) setInvestments(data);
    }
    setLoading(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      asset_type: assetType,
      symbol: symbol.toUpperCase(),
      quantity: parseFloat(quantity) || 0,
      avg_cost: avgCost ? parseFloat(avgCost) : null,
      current_price: currentPrice ? parseFloat(currentPrice) : null,
      currency,
    };

    const { error } = editingId
      ? await supabase.from('investments').update(payload).eq('id', editingId)
      : await supabase.from('investments').insert(payload);

    if (!error) {
      setIsModalOpen(false);
      setEditingId(null);
      setSymbol('');
      setQuantity('');
      setAvgCost('');
      setCurrentPrice('');
      await fetchInvestments();
    } else {
      alert('Hata oluştu: ' + error.message);
    }
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
        <button
          onClick={() => {
            setEditingId(null);
            setSymbol('');
            setQuantity('');
            setAvgCost('');
            setCurrentPrice('');
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <Plus className="h-4 w-4" />
          Yeni Yatırım Ekle
        </button>
      </div>

      {/* Portföy Özet Kartı */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Toplam Portföy Değeri</span>
          <TrendingUp className="h-5 w-5 text-blue-500" />
        </div>
        <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{formatTRY(totalPortfolioValue)}</div>
      </div>

      {/* Tablo Alanı */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 font-medium">Varlık Türü</th>
                <th className="px-6 py-4 font-medium">Sembol</th>
                <th className="px-6 py-4 font-medium text-right">Miktar</th>
                <th className="px-6 py-4 font-medium text-right">Ort. Maliyet</th>
                <th className="px-6 py-4 font-medium text-right">Güncel Fiyat</th>
                <th className="px-6 py-4 font-medium text-right">Toplam Değer</th>
                <th className="px-6 py-4 font-medium text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Yükleniyor...</td>
                </tr>
              ) : investments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Kayıtlı yatırım bulunmuyor.</td>
                </tr>
              ) : (
                investments.map((inv) => {
                  const price = inv.current_price ?? inv.avg_cost ?? 0;
                  const total = Number(inv.quantity) * Number(price);
                  return (
                    <tr key={inv.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {assetTypeLabels[inv.asset_type] || inv.asset_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{inv.symbol}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">{inv.quantity}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        {inv.avg_cost !== null ? formatTRY(Number(inv.avg_cost)) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-medium">
                        {inv.current_price !== null ? formatTRY(Number(inv.current_price)) : <span className="text-amber-500 text-xs">Girilemedi</span>}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                        {formatTRY(total)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(inv)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            title="Düzenle / Fiyat Güncelle"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(inv.id)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
                  onChange={(e) => setAssetType(e.target.value as any)}
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
    </div>
  );
}