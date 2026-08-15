'use client';

import { useState, useEffect } from 'react';
import { Plus, X, ClipboardPaste } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { columns, Asset } from './columns';
import { supabase } from '@/lib/supabase/client';
import { BulkPasteModal } from './bulk-paste-modal';

export default function VarlikPage() {
  const [data, setData] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [notes, setNotes] = useState('');

  const fetchAssets = async () => {
    setLoading(true);
    const { data: assets, error } = await supabase
      .from('assets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && assets) {
      setData(assets as Asset[]);
    } else if (error) {
      console.error('Varlık veri çekme hatası:', error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAssets();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setAssetName('');
    setAssetType('');
    setCurrentValue('');
    setCurrency('TRY');
    setNotes('');
  };

  const handleEdit = (asset: Asset) => {
    setEditingId(asset.id);
    setAssetName(asset.asset_name);
    setAssetType(asset.asset_type ?? '');
    setCurrentValue(String(asset.current_value));
    setCurrency(asset.currency);
    setNotes(asset.notes ?? '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu varlığı silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('assets').delete().eq('id', id);
    if (error) {
      alert('Silinemedi: ' + error.message);
    } else {
      fetchAssets();
    }
  };

  const handleCellEdit = async (id: string, field: 'asset_name' | 'current_value', value: string) => {
    const previous = data.find((item) => item.id === id);
    if (!previous) return;

    const parsedValue: string | number = field === 'current_value' ? parseFloat(value) : value;

    setData((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: parsedValue } : item)));

    const payload: Record<string, string | number> =
      field === 'current_value' ? { current_value: parsedValue as number } : { [field]: value };
    const { error } = await supabase.from('assets').update(payload).eq('id', id);
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
      asset_name: assetName,
      asset_type: assetType || null,
      current_value: parseFloat(currentValue),
      currency,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = editingId
      ? await supabase.from('assets').update(payload).eq('id', editingId)
      : await supabase.from('assets').insert(payload);

    if (!error) {
      setIsModalOpen(false);
      resetForm();
      fetchAssets();
    } else {
      alert('Kayıt sırasında bir hata oluştu: ' + error.message);
    }
  };

  const totalValue = data.reduce((sum, a) => sum + (a.current_value || 0), 0);

  const handleBulkImport = async (
    rows: { user_id: string; asset_name: string; asset_type: string | null; current_value: number; currency: string; notes: string | null; updated_at: string }[]
  ) => {
    const { data: inserted, error } = await supabase.from('assets').insert(rows).select();
    if (error) {
      alert('Toplu ekleme sırasında bir hata oluştu: ' + error.message);
      throw error;
    }
    if (inserted) {
      setData((prev) => [...(inserted as Asset[]), ...prev]);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Varlık ve Birikimler</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Ev, araba, altın gibi maddi varlıklarınızı buradan takip edin.</p>
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
            Yeni Varlık Ekle
          </button>
        </div>
      </div>

      {data.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">Toplam Varlık Değeri</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">
            {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(totalValue)}
          </p>
        </div>
      )}

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
                {editingId ? 'Varlığı Düzenle' : 'Yeni Varlık Ekle'}
              </h2>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Varlık Adı</label>
                <input type="text" required value={assetName} onChange={(e) => setAssetName(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100" placeholder="Örn: Ev, Araba, Altın..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tür (opsiyonel)</label>
                <input type="text" value={assetType} onChange={(e) => setAssetType(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100" placeholder="Örn: Gayrimenkul, Araç, Değerli Maden..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Güncel Değer</label>
                  <input type="number" step="0.01" required value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Para Birimi</label>
                  <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100" placeholder="TRY" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Not (opsiyonel)</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100" placeholder="Ek bilgi..." />
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