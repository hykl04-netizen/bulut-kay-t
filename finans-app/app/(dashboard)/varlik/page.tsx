// app/(dashboard)/varlik/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, ClipboardPaste, X, PiggyBank } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { DataTable } from '@/components/data-table/data-table';
import { columns, type Asset } from './columns';
import { BulkPasteModal } from './bulk-paste-modal';
import { toast } from '@/components/ui/toaster';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { getCurrentWorkspaceId } from '@/lib/supabase/workspace';
import { useTeamRole } from '@/lib/use-team-role';
import { canEditData } from '@/lib/team';
import { formatTRY } from '@/lib/currency';

import { TableSkeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { MobileList, MobileListCard } from '@/components/finans/mobile-list';

import { formatCurrency } from '@/lib/currency';
export default function VarlikPage() {
  const { role, loading: roleLoading } = useTeamRole();
  const canEdit = roleLoading || !role || canEditData(role);
  const [data, setData] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
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
      const workspaceId = await getCurrentWorkspaceId(user.id);
      setWorkspaceId(workspaceId);
      const { data: assets, error } = await supabase
        .from('assets')
        .select('*')
        .eq('workspace_id', workspaceId)
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
      workspace_id: string;
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
    if (!(await confirmDialog('Bu varlığı silmek istediğinize emin misiniz?'))) return;
    const { error } = await supabase.from('assets').delete().eq('id', id);
    if (!error) {
      setData((prev) => prev.filter((a) => a.id !== id));
    } else {
      toast.error('Silinemedi: ' + error.message);
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
      toast.error('Oturumunuz sona ermiş görünüyor. Lütfen sayfayı yenileyip tekrar giriş yapın.');
      return;
    }
    const workspaceId = await getCurrentWorkspaceId(user.id);

    const payload = {
      workspace_id: workspaceId,
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
        toast.error('Kayıt sırasında hata oluştu: ' + error?.message);
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
        toast.error('Kayıt sırasında hata oluştu: ' + error?.message);
      }
    }
    setIsSubmitting(false);
  };

  const totalValue = data.reduce((sum, a) => sum + Number(a.current_value || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={PiggyBank}
        title="Varlık ve Birikimler"
        description="Ev, araba, gayrimenkul ve diğer maddi varlıklarınızı buradan takip edin."
        actions={
          <>
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <button
                  onClick={() => setIsBulkModalOpen(true)}
                  className="btn-outline"
                >
                  <ClipboardPaste className="h-4 w-4" />
                  Excel&apos;den Yapıştır
                </button>
                <button
                  onClick={() => { resetForm(); setIsModalOpen(true); }}
                  className="btn-gold-cta inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  Yeni Varlık Ekle
                </button>
              </>
            )}
          </div>
          </>
        }
      />


      {/* Toplam Varlık Özet Kartı */}
      <div className="card-static">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Toplam Varlık Değeri</span>
          <PiggyBank className="h-5 w-5 text-purple-500" />
        </div>
        <div className="mt-2 text-3xl font-bold text-foreground">{formatTRY(totalValue)}</div>
      </div>

      {/* Liste Tablosu — inline düzenlenebilir hücrelerle (çift tıkla → düzenle) */}
      {loading ? (
        <TableSkeleton columns={5} />
      ) : (
        <>
          {/* Telefonda liste, masaüstünde tablo — aynı veri, iki sunum.
              6 sütunlu tablo 390px'e sığmıyor; yatay kaydırma da tarama
              alışkanlığını bozuyor. */}
          <div className="md:hidden">
            <MobileListCard>
              <MobileList
                emptyText="Kayıtlı varlık yok."
                rows={data.map((a) => ({
                  id: a.id,
                  title: a.asset_name,
                  subtitle: a.asset_type ?? 'Varlık',
                  icon: PiggyBank,
                  value: formatCurrency(a.current_value, a.currency),
                }))}
              />
            </MobileListCard>
          </div>

          <div className="hidden md:block">
  <DataTable
            columns={columns}
            data={data}
            meta={{
              canEdit,
              onEdit: handleOpenEditModal,
              onDelete: handleDelete,
              onCellEdit: handleCellEdit,
            }}
          />
          </div>
        </>
      )}

      {/* Ekleme / Düzenleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="animate-sheet-up sm:animate-fade-in max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-card p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl dark:text-slate-100 sm:max-w-lg sm:rounded-2xl sm:p-6 sm:pb-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-lg font-bold">{editingId ? 'Varlığı Düzenle' : 'Yeni Varlık Ekle'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-muted-foreground dark:hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Varlık Adı</label>
                <input
                  type="text"
                  required
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="Örn: Konut, Şirket Aracı, Altın"
                  className="form-input"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Tür (Opsiyonel)</label>
                <input
                  type="text"
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  placeholder="Örn: Gayrimenkul, Taşıt, Değerli Maden"
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Güncel Değer (TL)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    placeholder="0.00"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Para Birimi</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Not (Opsiyonel)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ek açıklamalar..."
                  className="form-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-gold-cta rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel'den Toplu Ekleme Modalı */}
      {isBulkModalOpen && workspaceId && (
        <BulkPasteModal
          workspaceId={workspaceId}
          onClose={() => setIsBulkModalOpen(false)}
          onImport={handleBulkImport}
        />
      )}
    </div>
  );
}