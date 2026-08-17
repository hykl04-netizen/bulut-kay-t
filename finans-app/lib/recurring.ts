/**
 * Tekrarlayan fatura/gelir otomasyonu.
 *
 * `bills` (fatura/masraf) ve `transactions` (gelir/gider) tablolarındaki
 * is_recurring=true kayıtlar birer "şablon" gibi davranır: vade/işlem tarihi
 * geçtiğinde bir sonraki dönemin kaydı otomatik olarak oluşturulur (kira,
 * abonelik, maaş geliri vb.). Aynı seriye ait kayıtlar `series_id` ile
 * gruplanır; her satırın kendi `id`'si ilk kayıt için seri kimliği olarak
 * kullanılır.
 *
 * Sunucu tarafı bir cron/edge function olmadığı için bu, kullanıcı
 * uygulamayı her açtığında (dashboard layout mount olduğunda) çalışan bir
 * "yakalama" (catch-up) mekanizmasıdır. Üretilen kayıtların tarihi her zaman
 * bugüne eşit veya öncesinde olduğu için, bir sonraki çalıştırmada aynı seri
 * tekrar işlenmez (idempotent).
 */

import { supabase } from '@/lib/supabase/client';

type RecurrencePeriod = 'aylik' | 'yillik';

const MAX_CATCHUP_ITERATIONS = 36; // aynı seri için tek çalıştırmada üretilecek azami kayıt (güvenlik sınırı)

function addPeriod(dateStr: string, period: RecurrencePeriod): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (period === 'yillik') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().split('T')[0];
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

interface RecurringBillRow {
  id: string;
  workspace_id: string;
  title: string;
  amount: number;
  due_date: string | null;
  is_recurring: boolean;
  recurrence_period: RecurrencePeriod | null;
  recurrence_end_date: string | null;
  series_id: string | null;
  category_id: string | null;
}

interface RecurringTransactionRow {
  id: string;
  workspace_id: string;
  type: 'gelir' | 'gider';
  amount: number;
  date: string;
  description: string | null;
  category_id: string | null;
  is_recurring: boolean;
  recurrence_period: RecurrencePeriod | null;
  recurrence_end_date: string | null;
  series_id: string | null;
  currency: string;
  exchange_rate: number;
}

/** Aynı seriden en güncel (en ileri tarihli) satırı bulup gruplar. */
function pickLatestPerSeries<T extends { id: string; series_id: string | null }>(
  rows: T[],
  getDate: (row: T) => string | null
): T[] {
  const bySeries = new Map<string, T>();
  for (const row of rows) {
    const seriesId = row.series_id ?? row.id;
    const existing = bySeries.get(seriesId);
    const rowDate = getDate(row);
    if (!existing) {
      bySeries.set(seriesId, row);
      continue;
    }
    const existingDate = getDate(existing);
    if (rowDate && (!existingDate || rowDate > existingDate)) {
      bySeries.set(seriesId, row);
    }
  }
  return Array.from(bySeries.values());
}

async function processDueBills(workspaceId: string): Promise<number> {
  const today = todayStr();

  const { data, error } = await supabase
    .from('bills')
    .select('id, workspace_id, title, amount, due_date, is_recurring, recurrence_period, recurrence_end_date, series_id, category_id')
    .eq('workspace_id', workspaceId)
    .eq('is_recurring', true)
    .not('due_date', 'is', null)
    .lte('due_date', today);

  if (error || !data) return 0;

  const heads = pickLatestPerSeries(data as RecurringBillRow[], (r) => r.due_date);
  let created = 0;

  for (const head of heads) {
    if (!head.recurrence_period || !head.due_date) continue;
    const seriesId = head.series_id ?? head.id;
    const newRows: Record<string, unknown>[] = [];
    let nextDue = addPeriod(head.due_date, head.recurrence_period);
    let guard = 0;

    while (nextDue <= today && guard < MAX_CATCHUP_ITERATIONS) {
      if (head.recurrence_end_date && nextDue > head.recurrence_end_date) break;
      newRows.push({
        workspace_id: head.workspace_id,
        title: head.title,
        amount: head.amount,
        due_date: nextDue,
        is_recurring: true,
        recurrence_period: head.recurrence_period,
        recurrence_end_date: head.recurrence_end_date,
        series_id: seriesId,
        status: 'odenmedi',
        category_id: head.category_id,
      });
      nextDue = addPeriod(nextDue, head.recurrence_period);
      guard++;
    }

    if (newRows.length === 0) continue;

    // İlk satır henüz bir seriye bağlı değilse (eski kayıt), önce onu seriye bağlıyoruz.
    if (!head.series_id) {
      await supabase.from('bills').update({ series_id: seriesId }).eq('id', head.id);
    }

    const { error: insertError } = await supabase.from('bills').insert(newRows);
    if (!insertError) created += newRows.length;
  }

  return created;
}

async function processDueTransactions(workspaceId: string): Promise<number> {
  const today = todayStr();

  const { data, error } = await supabase
    .from('transactions')
    .select(
      'id, workspace_id, type, amount, date, description, category_id, is_recurring, recurrence_period, recurrence_end_date, series_id, currency, exchange_rate'
    )
    .eq('workspace_id', workspaceId)
    .eq('is_recurring', true)
    .lte('date', today);

  if (error || !data) return 0;

  const heads = pickLatestPerSeries(data as RecurringTransactionRow[], (r) => r.date);
  let created = 0;

  for (const head of heads) {
    if (!head.recurrence_period) continue;
    const seriesId = head.series_id ?? head.id;
    const newRows: Record<string, unknown>[] = [];
    let nextDate = addPeriod(head.date, head.recurrence_period);
    let guard = 0;

    while (nextDate <= today && guard < MAX_CATCHUP_ITERATIONS) {
      if (head.recurrence_end_date && nextDate > head.recurrence_end_date) break;
      const tryEquivalent = Number(head.amount) * Number(head.exchange_rate || 1);
      newRows.push({
        workspace_id: head.workspace_id,
        type: head.type,
        amount: head.amount,
        date: nextDate,
        description: head.description,
        category_id: head.category_id,
        is_recurring: true,
        recurrence_period: head.recurrence_period,
        recurrence_end_date: head.recurrence_end_date,
        series_id: seriesId,
        currency: head.currency || 'TRY',
        exchange_rate: head.exchange_rate || 1,
        try_equivalent: tryEquivalent,
      });
      nextDate = addPeriod(nextDate, head.recurrence_period);
      guard++;
    }

    if (newRows.length === 0) continue;

    if (!head.series_id) {
      await supabase.from('transactions').update({ series_id: seriesId }).eq('id', head.id);
    }

    const { error: insertError } = await supabase.from('transactions').insert(newRows);
    if (!insertError) created += newRows.length;
  }

  return created;
}

export interface RecurringAutomationResult {
  billsCreated: number;
  transactionsCreated: number;
}

/**
 * Kullanıcı için vadesi geçmiş tüm tekrarlayan fatura/gelir-gider
 * serilerini işler ve eksik dönemleri otomatik oluşturur. Dashboard
 * layout'unda oturum açıldığında bir kez çağrılır.
 */
export async function runRecurringAutomation(workspaceId: string): Promise<RecurringAutomationResult> {
  const [billsCreated, transactionsCreated] = await Promise.all([
    processDueBills(workspaceId),
    processDueTransactions(workspaceId),
  ]);
  return { billsCreated, transactionsCreated };
}
