// app/(dashboard)/yatirim/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, ClipboardPaste, X, TrendingUp, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { DataTable } from '@/components/data-table/data-table';
import { columns, type Investment } from './columns';
import { BulkPasteModal } from './bulk-paste-modal';
import { toast } from '@/components/ui/toaster';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { fetchMarketPrice, isMarketPriceError } from '@/lib/market-price';
import { getCurrentAccountId } from '@/lib/supabase/account';
import { useTeamRole } from '@/lib/use-team-role';
import { canEditData } from '@/lib/team';

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
function formatTRY(value: number) {
  return TRY_FORMATTER.format(value);
}

export default function YatirimPage() {
  const { role, loading: roleLoading } = useTeamRole();
  const canEdit = roleLoading || !role || canEditData(role);
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
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  const fetchInvestments = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const accountId = await getCurrentAccountId(user.id);
      setUserId(accountId);
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', accountId);

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
      throw new Error(error.message);
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
    if (!(await confirmDialog('Bu yatırımı silmek istediğinize emin misiniz?'))) return;
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
      toast.error('Oturumunuz sona ermiş görünüyor. Lütfen sayfayı yenileyip tekrar giriş yapın.');
      return;
    }
    const accountId = await getCurrentAccountId(user.id);

    const payload = {
      user_id: accountId,
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
        toast.error('Hata oluştu: ' + error?.message);
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
        toast.error('Hata oluştu: ' + error?.message);
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

  // "Tümünü Güncelle" — fon dışındaki her satır için piyasa fiyatını çekip
  // `current_price` kolonunu tek tek günceller (sırayla, ücretsiz/anahtarsız
  // servise saygılı olmak için art arda çok hızlı istek atmıyoruz).
  const handleRefreshAllPrices = async () => {
    const refreshable = investments.filter((inv) => inv.asset_type !== 'fon');
    if (refreshable.length === 0) {
      toast.info('Otomatik fiyat çekilebilecek yatırım yok.');
      return;
    }
    setIsRefreshingAll(true);
    let successCount = 0;
    let failCount = 0;
    for (const inv of refreshable) {
      const result = await fetchMarketPrice(inv.asset_type, inv.symbol, inv.currency || 'TRY');
      if (isMarketPriceError(result)) {
        failCount++;
        continue;
      }
      const { error } = await supabase
        .from('investments')
        .update({ current_price: result.price })
        .eq('id', inv.id);
      if (!error) {
        successCount++;
        setInvestments((prev) => prev.map((i) => (i.id === inv.id ? { ...i, current_price: result.price } : i)));
      } else {
        failCount++;
      }
    }
    setIsRefreshingAll(false);
    if (successCount > 0) toast.success(`${successCount} yatırımın fiyatı güncellendi.`);
    if (failCount > 0) toast.error(`${failCount} yatırım için fiyat alınamadı.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Yatırım Portföyü</h1>
          <p className="mt-1 text-muted-foreground dark:text-muted-foreground">
            Hisse senetleri, döviz, kripto varlıklar ve kıymetli madenlerinizi buradan takip edin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={handleRefreshAllPrices}
              disabled={isRefreshingAll || investments.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 dark:border-border dark:text-foreground dark:hover:bg-secondary"
            >
              {isRefreshingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Tüm Fiyatları Güncelle
            </button>
          )}
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
                className="btn-gold-cta inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-secondary dark:bg-secondary dark:text-foreground dark:hover:bg-slate-200"
              >
                <Plus className="h-4 w-4" />
                Yeni Yatırım Ekle
              </button>
            </>
          )}
        </div>
      </div>

      {/* Portföy Özet Kartı */}
      <div className="card-static">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Toplam Portföy Değeri</span>
          <TrendingUp className="h-5 w-5 text-blue-500" />
        </div>
        <div className="mt-2 text-3xl font-bold text-foreground dark:text-foreground">{formatTRY(totalPortfolioValue)}</div>
      </div>

      {/* Liste Tablosu — inline düzenlenebilir hücrelerle (çift tıkla → düzenle) */}
      {loading ? (
        <div className="card-empty-state">
          Yükleniyor...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={investments}
          meta={{
            canEdit,
            onEdit: handleOpenEditModal,
            onDelete: handleDelete,
            onCellEdit: handleCellEdit,
          }}
        />
      )}

      {/* Ekleme / Düzenleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-border pb-4 dark:border-border">
              <h2 className="text-lg font-bold">{editingId ? 'Yatırımı Düzenle' : 'Yeni Yatırım Ekle'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-muted-foreground dark:hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Varlık Türü</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value as 'hisse' | 'doviz' | 'kripto' | 'fon' | 'altin')}
                  className="form-input"
                >
                  <option value="hisse" className="dark:bg-popover dark:text-popover-foreground">Hisse Senedi</option>
                  <option value="doviz" className="dark:bg-popover dark:text-popover-foreground">Döviz</option>
                  <option value="kripto" className="dark:bg-popover dark:text-popover-foreground">Kripto Varlık</option>
                  <option value="fon" className="dark:bg-popover dark:text-popover-foreground">Yatırım Fonu</option>
                  <option value="altin" className="dark:bg-popover dark:text-popover-foreground">Altın / Kıymetli Maden</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Sembol / Kod</label>
                <input
                  type="text"
                  required
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="Örn: THYAO, USD, BTC, GRAM"
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Miktar</label>
                  <input
                    type="number"
                    step="0.00000001"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Ortalama Maliyet</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={avgCost}
                    onChange={(e) => setAvgCost(e.target.value)}
                    placeholder="Opsiyonel"
                    className="form-input"
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-sm font-medium text-foreground dark:text-muted-foreground">Güncel Fiyat</label>
                    <button
                      type="button"
                      disabled={!symbol || isFetchingPrice}
                      onClick={async () => {
                        setIsFetchingPrice(true);
                        const result = await fetchMarketPrice(assetType, symbol, currency || 'TRY');
                        setIsFetchingPrice(false);
                        if (isMarketPriceError(result)) {
                          toast.error(result.error);
                          return;
                        }
                        setCurrentPrice(result.price.toString());
                        toast.success(`Fiyat çekildi: ${result.price} ${result.currency}${result.note ? ' — ' + result.note : ''}`);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-gold hover:text-brand-gold-light disabled:cursor-not-allowed disabled:opacity-50 dark:text-brand-gold-light"
                    >
                      {isFetchingPrice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      Piyasadan Çek
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.0001"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    placeholder="Opsiyonel"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm text-muted-foreground hover:bg-secondary dark:text-muted-foreground dark:hover:bg-secondary"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-gold-cta rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white transition hover:bg-secondary disabled:opacity-50 dark:bg-secondary dark:text-foreground dark:hover:bg-slate-200"
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