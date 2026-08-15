// app/(dashboard)/varlik/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, ClipboardPaste, X, PiggyBank } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { DataTable } from '@/components/data-table/data-table';
import { columns, type Asset } from './columns';
import { BulkPasteModal } from './bulk-paste-modal';

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
function formatTRY(value: number) {
  return TRY_FORMATTER.format(value);
}

export default function VarlikPage() {
  const [data, setData] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAssets = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
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

  useEffect(() => {
    queueMicrotask(() => {
      fetchAssets();
    });
  }, []);


  // Faz 7.4 — Excel'den toplu yapıştırma: satırları tek seferde insert edip
  // local state'e optimistic olarak ekle (tam yeniden çekim yok).
  const handleBulkImport = async (
    rows: {
      user_id: string;
      asset_name: string;
      asset_type: string | null;
      current_value: number;
      currency: string;
      notes: string | null;
      updated_at: string;
    }[]
  ) => {
    const { data: inserted, error } = await supabase.from('assets').insert(rows).select('*');

    if (error) {
      throw new Error(error.message);
    }

    if (inserted) {
      setData((prev) =>
        [...(inserted as Asset[]), ...prev].sort((a, b) => Number(b.current_value) - Number(a.current_value))
      );
    }
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

  // Faz 7.2/7.3 — hücre bazlı optimistic düzenleme
  const handleCellEdit = async (
    id: string,
    field: 'asset_name' | 'current_value',
    value: string
  ) => {
    const previous = data.find((a) => a.id === id);
    if (!previous) return;

    const parsedValue = field === 'current_value' ? parseFloat(value) || 0 : value;

    setData((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: parsedValue } : a)));

    const { error } = await supabase.from('assets').update({ [field]: parsedValue }).eq('id', id);
    if (error) {
      setData((prev) => prev.map((a) => (a.id === id ? previous : a)));
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
      asset_name: assetName,
      asset_type: assetType || null,
      current_value: parseFloat(currentValue) || 0,
      currency,
      notes: notes || null,
    };

    if (editingId) {
      // Güncelle — optimistic: tam yeniden çekim yerine local state'i güncelle
      const { data: updated, error } = await supabase
        .from('assets')
        .update(payload)
        .eq('id', editingId)
        .select('*')
        .single();
      if (!error && updated) {
        setData((prev) => prev.map((a) => (a.id === editingId ? (updated as Asset) : a)));
        setIsModalOpen(false);
        resetForm();
      } else {
        alert('Kayıt sırasında hata oluştu: ' + error?.message);
      }
    } else {
      // Yeni Ekle — optimistic: dönen kaydı doğrudan listeye ekle
      const { data: inserted, error } = await supabase
        .from('assets')
        .insert(payload)
        .select('*')
        .single();
      if (!error && inserted) {
        setData((prev) =>
          [inserted as Asset, ...prev].sort((a, b) => Number(b.current_value) - Number(a.current_value))
        );
        setIsModalOpen(false);
        resetForm();
      } else {
        alert('Kayıt sırasında hata oluştu: ' + error?.message);
      }
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ClipboardPaste className="h-4 w-4" />
            Excel&apos;den Yapıştır
          </button>
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <Plus className="h-4 w-4" />
            Yeni Varlık Ekle
          </button>
        </div>
      </div>

      {/* Toplam Varlık Özet Kartı */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Toplam Varlık Değeri</span>
          <PiggyBank className="h-5 w-5 text-purple-500" />
        </div>
        <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{formatTRY(totalValue)}</div>
      </div>

      {/* Liste Tablosu — inline düzenlenebilir hücrelerle (çift tıkla → düzenle) */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          Yükleniyor...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
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