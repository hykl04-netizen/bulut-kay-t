// app/(dashboard)/butce/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Wallet, AlertTriangle, Trash2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/components/ui/toaster';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { buildBudgetRows, currentMonthKey, BUDGET_TONE_CLASSES, BudgetRow } from '@/lib/budget';
import { getCurrentAccountId } from '@/lib/supabase/account';
import { useTeamRole } from '@/lib/use-team-role';
import { canEditData } from '@/lib/team';

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
function formatTRY(value: number) {
  return TRY_FORMATTER.format(value);
}

const MONTH_LABELS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function currentMonthDisplay(): string {
  const now = new Date();
  return `${MONTH_LABELS_TR[now.getMonth()]} ${now.getFullYear()}`;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Budget {
  id: string;
  category_id: string;
  monthly_limit: number;
}

export default function ButcePage() {
  const { role, loading: roleLoading } = useTeamRole();
  const canEdit = roleLoading || !role || canEditData(role);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<{ type: 'gelir' | 'gider'; amount: number; date: string; category_id: string | null; try_equivalent?: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const accountId = await getCurrentAccountId(user.id);
    const monthKey = currentMonthKey();
    const [catRes, budgetRes, txRes] = await Promise.all([
      supabase.from('categories').select('id, name, color').eq('user_id', accountId).eq('type', 'gider').order('name'),
      supabase.from('budgets').select('id, category_id, monthly_limit').eq('user_id', accountId),
      supabase
        .from('transactions')
        .select('type, amount, date, category_id, try_equivalent')
        .eq('user_id', accountId)
        .eq('type', 'gider')
        .gte('date', `${monthKey}-01`),
    ]);

    if (catRes.error) console.error('Kategori çekme hatası:', catRes.error.message);
    if (budgetRes.error) {
      // Tablo henüz oluşturulmamışsa (migration çalıştırılmamışsa) kullanıcıyı bilgilendir.
      console.error('Bütçe çekme hatası:', budgetRes.error.message);
      if (budgetRes.error.message.toLowerCase().includes('relation') || budgetRes.error.code === '42P01') {
        toast.error('Bütçe tablosu bulunamadı. Lütfen supabase/migrations klasöründeki SQL dosyasını Supabase\'de çalıştırın.');
      }
    }
    if (txRes.error) console.error('İşlem çekme hatası:', txRes.error.message);

    setCategories((catRes.data as Category[]) ?? []);
    setBudgets((budgetRes.data as Budget[]) ?? []);
    setTransactions(txRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchAll();
    });
  }, []);

  const rows = buildBudgetRows(
    categories.map((c) => ({ id: c.id, name: c.name, color: c.color })),
    budgets.map((b) => ({ category_id: b.category_id, monthly_limit: b.monthly_limit })),
    transactions.map((t) => ({ type: t.type, amount: Number(t.amount), date: t.date, category_id: t.category_id }))
  );

  const budgetedCategoryIds = new Set(budgets.map((b) => b.category_id));
  const unbudgetedCategories = categories.filter((c) => !budgetedCategoryIds.has(c.id));
  const overCount = rows.filter((r) => r.tone === 'over').length;

  const handleSaveLimit = async (categoryId: string) => {
    const draft = drafts[categoryId];
    const limit = parseFloat(draft ?? '');
    if (!draft || Number.isNaN(limit) || limit < 0) {
      toast.error('Geçerli bir tutar girin.');
      return;
    }

    setSavingId(categoryId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSavingId(null);
      return;
    }

    const accountId = await getCurrentAccountId(user.id);
    const { error } = await supabase
      .from('budgets')
      .upsert({ user_id: accountId, category_id: categoryId, monthly_limit: limit }, { onConflict: 'user_id,category_id' });

    if (error) {
      console.error('Bütçe kaydetme hatası:', error.message);
      toast.error('Bütçe kaydedilemedi: ' + error.message);
    } else {
      toast.success('Bütçe limiti kaydedildi.');
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      });
      fetchAll();
    }
    setSavingId(null);
  };

  const handleDeleteLimit = async (budgetId: string, categoryName: string) => {
    if (!(await confirmDialog(`"${categoryName}" kategorisinin bütçe limitini kaldırmak istediğinize emin misiniz?`))) return;

    const { error } = await supabase.from('budgets').delete().eq('id', budgetId);
    if (error) {
      toast.error('Silinemedi: ' + error.message);
    } else {
      fetchAll();
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Bütçe Planlama</h1>
          <p className="text-muted-foreground dark:text-muted-foreground mt-1">
            {currentMonthDisplay()} için kategori bazlı harcama limitleri ve aşım durumu.
          </p>
        </div>
        {overCount > 0 && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4" />
            {overCount} kategoride bütçe aşımı var
          </div>
        )}
      </div>

      {/* Limiti tanımlı kategoriler */}
      <div className="bg-card rounded-xl shadow-sm border border-border dark:border-border p-6">
        <h2 className="text-lg font-semibold text-foreground dark:text-foreground mb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-muted-foreground" />
          Bütçe Durumu
        </h2>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz bütçe limiti tanımlanmamış. Aşağıdan bir kategori seçip limit belirleyin.</p>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <BudgetRowItem
                key={row.categoryId}
                row={row}
                canEdit={canEdit}
                onDelete={() => {
                  const budget = budgets.find((b) => b.category_id === row.categoryId);
                  if (budget) handleDeleteLimit(budget.id, row.categoryName);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Limit tanımlanmamış kategoriler için hızlı ekleme */}
      {canEdit && unbudgetedCategories.length > 0 && (
        <div className="bg-card rounded-xl shadow-sm border border-border dark:border-border p-6">
          <h2 className="text-lg font-semibold text-foreground dark:text-foreground mb-4">Yeni Bütçe Limiti Belirle</h2>
          <div className="space-y-3">
            {unbudgetedCategories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="flex-1 text-sm text-foreground dark:text-muted-foreground">{cat.name}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Aylık limit (TL)"
                  value={drafts[cat.id] ?? ''}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                  className="w-40 rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm focus:border-accent focus:outline-none dark:border-border dark:text-foreground"
                />
                <button
                  onClick={() => handleSaveLimit(cat.id)}
                  disabled={savingId === cat.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-secondary disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  Kaydet
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {categories.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Bütçe limiti belirleyebilmek için önce Kategoriler sayfasından gider kategorisi eklemelisiniz.
        </p>
      )}
    </div>
  );
}

function BudgetRowItem({ row, onDelete, canEdit }: { row: BudgetRow; onDelete: () => void; canEdit: boolean }) {
  const tone = BUDGET_TONE_CLASSES[row.tone];
  const barWidth = Math.min(100, row.percent);

  return (
    <div className="rounded-xl border border-border dark:border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: row.categoryColor }} />
          <span className="font-medium text-foreground dark:text-slate-100 truncate">{row.categoryName}</span>
          {row.tone === 'over' && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${tone.badge}`}>
              Aşıldı
            </span>
          )}
          {row.tone === 'near' && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${tone.badge}`}>
              Limite yaklaşıyor
            </span>
          )}
        </div>
        {canEdit && (
          <button
            onClick={onDelete}
            className="text-muted-foreground hover:text-rose-600 transition-colors p-1 shrink-0"
            aria-label="Limiti kaldır"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="h-2.5 w-full rounded-full bg-muted dark:bg-secondary overflow-hidden">
        <div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${barWidth}%` }} />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
        <span className={`font-semibold ${tone.text}`}>
          {formatTRY(row.spent)} / {formatTRY(row.limit)} ({row.percent}%)
        </span>
        <span className="text-muted-foreground">
          {row.remaining >= 0 ? `Kalan: ${formatTRY(row.remaining)}` : `Aşım: ${formatTRY(Math.abs(row.remaining))}`}
        </span>
      </div>
    </div>
  );
}
