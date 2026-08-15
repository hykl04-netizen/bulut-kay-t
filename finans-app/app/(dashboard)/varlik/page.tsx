'use client';

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { columns, Asset } from './columns';
import { supabase } from '@/lib/supabase/client';

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
    const payload: Record<string, string | number> =
      field === 'current_value' ? { current_value: parseFloat(value) } : { [field]: value };
    const { error } = await supabase.from('assets').update(payload).eq('id', id);
    if (error) {
      alert('Güncellenemedi: ' + error.message);
      throw error;
    }
    fetchAssets();
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

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Varlık ve Birikimler</h1>
          <p className="text-slate-500 mt-1">Ev, araba, altın gibi maddi varlıklarınızı buradan takip edin.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Varlık Ekle
        </button>
      </div>

      {data.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <p className="text-sm text-slate-500">Toplam Varlık Değeri</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(totalValue)}
          </p>
        </div>
      )}

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
                {editingId ? 'Varlığı Düzenle' : 'Yeni Varlık Ekle'}
              </h2>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Varlık Adı</label>
                <input type="text" required value={assetName} onChange={(e) => setAssetName(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="Örn: Ev, Araba, Altın..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tür (opsiyonel)</label>
                <input type="text" value={assetType} onChange={(e) => setAssetType(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="Örn: Gayrimenkul, Araç, Değerli Maden..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Güncel Değer</label>
                  <input type="number" step="0.01" required value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Para Birimi</label>
                  <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="TRY" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Not (opsiyonel)</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="Ek bilgi..." />
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