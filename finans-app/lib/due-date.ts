/**
 * Vade tarihi hesaplama yardımcıları. Fatura/Masraf ve Borç/Alacak
 * sayfalarındaki "vadeye X gün kaldı" rozeti ile Özet Paneli'ndeki
 * "bu hafta/ay ödenecekler" widget'ı tarafından ortak kullanılır.
 */

export type DueTone = 'overdue' | 'today' | 'soon' | 'upcoming' | 'settled';

export interface DueInfo {
  days: number; // negatif: gecikmiş, 0: bugün, pozitif: kalan gün
  tone: DueTone;
  label: string;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 'YYYY-MM-DD' vade tarihini bugüne göre değerlendirir. */
export function getDueInfo(dueDate: string | null, isSettled: boolean): DueInfo | null {
  if (!dueDate) return null;

  const due = new Date(dueDate + 'T00:00:00');
  if (Number.isNaN(due.getTime())) return null;

  const today = startOfToday();
  const diffMs = due.getTime() - today.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (isSettled) {
    return { days, tone: 'settled', label: 'Ödendi' };
  }

  if (days < 0) {
    const overdueDays = Math.abs(days);
    return { days, tone: 'overdue', label: `${overdueDays} gün gecikti` };
  }
  if (days === 0) {
    return { days, tone: 'today', label: 'Bugün vadesi doluyor' };
  }
  if (days <= 3) {
    return { days, tone: 'soon', label: `Vadeye ${days} gün kaldı` };
  }
  return { days, tone: 'upcoming', label: `Vadeye ${days} gün kaldı` };
}

export const DUE_TONE_CLASSES: Record<DueTone, string> = {
  overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  today: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  soon: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
  upcoming: 'bg-accent/15 text-brand-gold',
  settled: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
};
