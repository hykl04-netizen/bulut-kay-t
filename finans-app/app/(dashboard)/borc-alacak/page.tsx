// app/(dashboard)/borc-alacak/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, ClipboardPaste, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { DataTable } from '@/components/data-table/data-table';
import { columns, type Debt } from './columns';
import { BulkPasteModal } from './bulk-paste-modal';
import { toast } from '@/components/ui/toaster';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { getCurrentWorkspaceId } from '@/lib/supabase/workspace';
import { useTeamRole } from '@/lib/use-team-role';
import { canEditData } from '@/lib/team';

import { TableSkeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { MobileList, MobileListCard } from '@/components/finans/mobile-list';

import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
export default function BorcAlacakPage() {
  const { role, loading: roleLoading } = useTeamRole();
  const canEdit = roleLoading || !role || canEditData(role);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const [direction, setDirection] = useState<'borc' | 'alacak'>('alacak');
  const [counterparty, setCounterparty] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDebts = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const workspaceId = await getCurrentWorkspaceId(user.id);
      setWorkspaceId(workspaceId);
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('due_date', { ascending: true });

      if (!error && data) setDebts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchDebts();
    });
  }, []);

  // Faz 7.4 — Excel'den toplu yapıştırma: satırları tek seferde insert edip
  // local state'e optimistic olarak ekle (tam yeniden çekim yok).
  const handleBulkImport = async (
    rows: {
      workspace_id: string;
      direction: 'borc' | 'alacak';
      counterparty: string;
      amount: number;
      due_date: string | null;
      notes: string | null;
      status: 'acik';
    }[]
  ) => {
    const { data, error } = await supabase.from('debts').insert(rows).select('*');

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      setDebts((prev) =>
        [...(data as Debt[]), ...prev].sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date < b.due_date ? -1 : 1;
        })
      );
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'acik' ? 'kapandi' : 'acik';
    const { error } = await supabase.from('debts').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, status: newStatus as 'acik' | 'kapandi' } : d)));
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog('Bu kaydı silmek istediğinize emin misiniz?'))) return;
    const { error } = await supabase.from('debts').delete().eq('id', id);
    if (!error) {
      setDebts((prev) => prev.filter((d) => d.id !== id));
    } else {
      toast.error(`Silinirken hata oluştu: ${error.message}`);
    }
  };

  // Faz 7.2/7.3 — hücre bazlı optimistic düzenleme
  const handleCellEdit = async (
    id: string,
    field: 'counterparty' | 'amount' | 'due_date' | 'notes',
    value: string
  ) => {
    const previous = debts.find((d) => d.id === id);
    if (!previous) return;

    // 'due_date' boş string olarak gelirse (kullanıcı tarihi silerse) Postgres'in
    // `date` kolonuna boş string yazılamaz — null gönderilmeli.
    const parsedValue =
      field === 'amount' ? parseFloat(value) || 0 : field === 'due_date' && value === '' ? null : value;

    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: parsedValue } : d)));

    const { error } = await supabase.from('debts').update({ [field]: parsedValue }).eq('id', id);
    if (error) {
      setDebts((prev) => prev.map((d) => (d.id === id ? previous : d)));
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
      direction,
      counterparty,
      amount: parseFloat(amount) || 0,
      due_date: dueDate || null,
      notes: notes || null,
      status: 'acik',
    };

    const { data, error } = await supabase
      .from('debts')
      .insert(payload)
      .select('*')
      .single();

    if (!error && data) {
      setDebts((prev) =>
        [data as Debt, ...prev].sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date < b.due_date ? -1 : 1;
        })
      );
      setIsModalOpen(false);
      setDirection('alacak');
      setCounterparty('');
      setAmount('');
      setDueDate('');
      setNotes('');
    } else {
      toast.error('Hata oluştu: ' + error?.message);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Borç ve Alacaklar"
        description="Kişi ve kurumlara olan borçlarınızı ve alacaklarınızı buradan yönetin."
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
                  onClick={() => setIsModalOpen(true)}
                  className="btn-gold-cta inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  Yeni Kayıt Ekle
                </button>
              </>
            )}
          </div>
          </>
        }
      />


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
                emptyText="Kayıtlı borç veya alacak yok."
                rows={debts.map((d) => ({
                  id: d.id,
                  title: d.counterparty,
                  subtitle: d.due_date ? `Vade ${new Date(d.due_date + 'T00:00:00').toLocaleDateString('tr-TR')}` : 'Vade yok',
                  icon: d.direction === 'alacak' ? ArrowDownLeft : ArrowUpRight,
                  accentColor: d.direction === 'alacak' ? '#059669' : '#e11d48',
                  value: formatCurrency(d.amount, d.currency),
                  valueNote: d.direction === 'alacak' ? 'Alacak' : 'Borç',
                  badge: d.status === 'kapandi' ? (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Kapandı</span>
                  ) : undefined,
                }))}
              />
            </MobileListCard>
          </div>

          <div className="hidden md:block">
  <DataTable
            columns={columns}
            data={debts}
            meta={{
              canEdit,
              onDelete: handleDelete,
              onToggleStatus: handleToggleStatus,
              onCellEdit: handleCellEdit,
            }}
          />
          </div>
        </>
      )}

      {/* Ekleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-lg font-bold">Yeni Borç / Alacak Ekle</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-muted-foreground dark:hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">İşlem Yönü</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection('alacak')}
                    className={`rounded-xl py-2 text-sm font-medium transition ${
                      direction === 'alacak' ? 'bg-emerald-600 text-white shadow' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    Alacak (Bana Ödenecek)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('borc')}
                    className={`rounded-xl py-2 text-sm font-medium transition ${
                      direction === 'borc' ? 'bg-rose-600 text-white shadow' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    Borç (Ben Ödeyeceğim)
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Kişi / Kurum Adı</label>
                <input
                  type="text"
                  required
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz / ABC Şirketi"
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Tutar (TL)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Vade Tarihi</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Notlar (Opsiyonel)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Açıklama..."
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
                  {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
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