/**
 * Bütçe planlama (Faz 9) için hesaplama yardımcıları.
 * Aylık kategori bazlı harcama limitlerini, o ayki gerçekleşen harcamayla
 * karşılaştırıp aşım durumunu belirler.
 */

export type BudgetTone = 'ok' | 'near' | 'over';

export interface BudgetRow {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  limit: number;
  spent: number;
  remaining: number;
  percent: number; // 0-100+ (100'ü aşabilir)
  tone: BudgetTone;
}

export interface BudgetCategory {
  id: string;
  name: string;
  color: string;
}

export interface BudgetLimit {
  category_id: string;
  monthly_limit: number;
}

export interface BudgetTransaction {
  type: 'gelir' | 'gider';
  amount: number;
  date: string; // 'YYYY-MM-DD'
  category_id: string | null;
}

/** Bugünün 'YYYY-MM' anahtarı. */
export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function toneFor(percent: number): BudgetTone {
  if (percent >= 100) return 'over';
  if (percent >= 80) return 'near';
  return 'ok';
}

export const BUDGET_TONE_CLASSES: Record<BudgetTone, { bar: string; text: string; badge: string }> = {
  ok: {
    bar: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
  near: {
    bar: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  },
  over: {
    bar: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  },
};

/**
 * Verilen ay (varsayılan: içinde bulunulan ay) için kategori bazlı bütçe
 * satırlarını üretir. Sadece limiti tanımlanmış kategoriler listelenir.
 */
export function buildBudgetRows(
  categories: BudgetCategory[],
  limits: BudgetLimit[],
  transactions: BudgetTransaction[],
  monthKey: string = currentMonthKey()
): BudgetRow[] {
  const spentByCategory = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== 'gider' || !t.category_id) continue;
    if (!t.date.startsWith(monthKey)) continue;
    spentByCategory.set(t.category_id, (spentByCategory.get(t.category_id) ?? 0) + t.amount);
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return limits
    .map((l) => {
      const category = categoryById.get(l.category_id);
      if (!category) return null;
      const spent = spentByCategory.get(l.category_id) ?? 0;
      const percent = l.monthly_limit > 0 ? Math.round((spent / l.monthly_limit) * 100) : 0;
      return {
        categoryId: category.id,
        categoryName: category.name,
        categoryColor: category.color,
        limit: l.monthly_limit,
        spent,
        remaining: l.monthly_limit - spent,
        percent,
        tone: toneFor(percent),
      } as BudgetRow;
    })
    .filter((row): row is BudgetRow => row !== null)
    .sort((a, b) => b.percent - a.percent);
}
