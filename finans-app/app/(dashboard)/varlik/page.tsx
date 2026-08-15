// app/(dashboard)/varlik/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Trash2, Pencil, PiggyBank } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface Asset {
  id: string;
  asset_name: string;
  asset_type: string | null;
  current_value: number;
  currency: string;
  notes: string | null;
}

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
function formatTRY(value: number) {
  return TRY_FORMATTER.format(value);
}

export default function VarlikPage() {
  const [data, setData] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: assets, error } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id)
        .order('current_value', { ascending: false });

      if (!error && assets) {
        setData(assets);
      }
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setAssetName('');
    setAssetType('');
    setCurrentValue('');
    setCurrency('TRY');
    setNotes('');
  };

  const handleOpenEditModal = (asset: Asset) => {
    setEditingId(asset.id);
    setAssetName(asset.asset_name);
    setAssetType(asset.asset_type ?? '');
    setCurrentValue(String(asset.current_value));
    setCurrency(asset.currency || 'TRY');
    setNotes(asset.notes ?? '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu varlığı silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('assets').delete().eq('id', id);
    if (!error) {
      setData((prev) => prev.filter((a) => a.id !== id));
    } else {
      alert('Silinemedi: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      asset_name: assetName,
      asset_type: assetType || null,
      current_value: parseFloat(currentValue) || 0,
      currency,
      notes: notes || null,
    };

    const { error } = editingId
      ? await supabase.from('assets').update(payload).eq('id', editingId)
      : await supabase.from('assets').insert(payload);

    if (!error) {
      setIsModalOpen(false);
      resetForm();
      await fetchAssets();
    } else {
      alert('Kayıt sırasında hata oluştu: ' + error.message);
    }
    setIsSubmitting(false);
  };

  const totalValue = data.reduce((sum, a) => sum + Number(a.current_value || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Varlık ve Birikimler</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Ev, araba, gayrimenkul ve diğer maddi varlıklarınızı buradan takip edin.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <Plus className="h-4 w-4" />
          Yeni Varlık Ekle
        </button>
      </div>

      {/* Toplam Varlık Özet Kartı */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Toplam Varlık Değeri</span>
          <PiggyBank className="h-5 w-5 text-purple-500" />
        </div>
        <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{formatTRY(totalValue)}</div>
      </div>

      {/* Tablo Alanı (Taşma sorunu giderilmiş temiz yapı) */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 font-medium">Varlık Adı</th>
                <th className="px-6 py-4 font-medium">Tür</th>
                <th className="px-6 py-4 font-medium text-right">Güncel Değer</th>
                <th className="px-6 py-4 font-medium">Not</th>
                <th className="px-6 py-4 font-medium text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">Yükleniyor...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">Kayıtlı varlık bulunmuyor.</td>
                </tr>
              ) : (
                data.map((asset) => (
                  <tr key={asset.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{asset.asset_name}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {asset.asset_type || '-'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                      {formatTRY(Number(asset.current_value))}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{asset.notes || '-'}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(asset)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(asset.id)}
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
              <h2 className="text-lg font-bold">{editingId ? 'Varlığı Düzenle' : 'Yeni Varlık Ekle'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Varlık Adı</label>
                <input
                  type="text"
                  required
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="Örn: Konut, Şirket Aracı, Altın"
                  className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Tür (Opsiyonel)</label>
                <input
                  type="text"
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  placeholder="Örn: Gayrimenkul, Taşıt, Değerli Maden"
                  className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Güncel Değer (TL)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    placeholder="0.00"
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

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Not (Opsiyonel)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ek açıklamalar..."
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