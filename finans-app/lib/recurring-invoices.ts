import { supabase } from '@/lib/supabase/client';

/**
 * Öneri 10 — tekrarlayan satış faturası otomasyonu.
 *
 * `lib/recurring.ts` ile aynı deseni izler: `is_recurring = true` olan bir
 * fatura "şablon" gibi davranır; düzenleme tarihi geçtiğinde bir sonraki
 * dönemin faturası otomatik oluşturulur. Aynı seri `series_id` ile gruplanır.
 *
 * ÖNEMLİ TASARIM KARARI: Üretilen fatura her zaman **TASLAK** olarak açılır,
 * "gönderildi" olarak değil. Müşteriye otomatik fatura göndermek muhasebe
 * açısından riskli — kullanıcı kalemleri gözden geçirip kendisi göndermeli.
 *
 * Sunucu tarafında cron olmadığı için bu da kullanıcı uygulamayı açtığında
 * çalışan bir "yakalama" mekanizması. Üretilen faturanın tarihi her zaman
 * bugüne eşit veya öncesinde olduğundan tekrar çalıştırmada aynı seri yeniden
 * işlenmez (idempotent).
 */

type RecurrencePeriod = 'aylik' | 'yillik';

const MAX_CATCHUP_ITERATIONS = 24;

function addPeriod(dateStr: string, period: RecurrencePeriod): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (period === 'yillik') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

interface RecurringInvoiceRow {
  id: string;
  workspace_id: string;
  customer_id: string | null;
  issue_date: string;
  due_date: string | null;
  currency: string;
  notes: string | null;
  is_recurring: boolean;
  recurrence_period: RecurrencePeriod | null;
  recurrence_end_date: string | null;
  series_id: string | null;
}

interface ItemRow {
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  net_total: number;
  vat_amount: number;
  line_total: number;
  sort_order: number;
}

/** Aynı seriden en ileri tarihli faturayı seçer. */
function latestPerSeries(rows: RecurringInvoiceRow[]): RecurringInvoiceRow[] {
  const bySeries = new Map<string, RecurringInvoiceRow>();
  for (const row of rows) {
    const key = row.series_id ?? row.id;
    const existing = bySeries.get(key);
    if (!existing || row.issue_date > existing.issue_date) bySeries.set(key, row);
  }
  return [...bySeries.values()];
}

export async function runRecurringInvoiceAutomation(workspaceId: string): Promise<number> {
  const today = todayStr();

  const { data, error } = await supabase
    .from('invoices')
    .select(
      'id, workspace_id, customer_id, issue_date, due_date, currency, notes, is_recurring, recurrence_period, recurrence_end_date, series_id'
    )
    .eq('workspace_id', workspaceId)
    .eq('is_recurring', true)
    .neq('status', 'iptal');

  if (error || !data || data.length === 0) return 0;

  let created = 0;

  for (const head of latestPerSeries(data as RecurringInvoiceRow[])) {
    if (!head.recurrence_period) continue;

    // Şablonun kalemlerini bir kez oku — her dönem aynı kalemlerle üretilir.
    const { data: items } = await supabase
      .from('invoice_items')
      .select('invoice_id, description, quantity, unit_price, vat_rate, net_total, vat_amount, line_total, sort_order')
      .eq('invoice_id', head.id)
      .order('sort_order');

    if (!items || items.length === 0) continue;

    const seriesId = head.series_id ?? head.id;
    let cursor = head.issue_date;
    // Vade ile düzenleme tarihi arasındaki farkı koru (örn. 30 gün vade).
    const dueOffsetDays =
      head.due_date
        ? Math.round(
            (new Date(`${head.due_date}T00:00:00`).getTime() -
              new Date(`${head.issue_date}T00:00:00`).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;

    for (let i = 0; i < MAX_CATCHUP_ITERATIONS; i++) {
      const nextDate = addPeriod(cursor, head.recurrence_period);
      if (nextDate > today) break;
      if (head.recurrence_end_date && nextDate > head.recurrence_end_date) break;

      const nextDue =
        dueOffsetDays === null
          ? null
          : new Date(new Date(`${nextDate}T00:00:00`).getTime() + dueOffsetDays * 86400000)
              .toISOString()
              .split('T')[0];

      // Numara gönderilmiyor: veritabanı INSERT anında atıyor. Önce üretip
      // sonra insert etmek, insert başarısız olduğunda numarayı yakıyordu.
      const { data: inserted, error: insErr } = await supabase
        .from('invoices')
        .insert({
          workspace_id: workspaceId,
          customer_id: head.customer_id,
          issue_date: nextDate,
          due_date: nextDue,
          status: 'taslak',
          currency: head.currency,
          notes: head.notes,
          is_recurring: true,
          recurrence_period: head.recurrence_period,
          recurrence_end_date: head.recurrence_end_date,
          series_id: seriesId,
        })
        .select('id')
        .single();

      if (insErr || !inserted) break;

      const newId = (inserted as { id: string }).id;
      const { error: itemErr } = await supabase.from('invoice_items').insert(
        (items as ItemRow[]).map((item) => ({
          workspace_id: workspaceId,
          invoice_id: newId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate,
          net_total: item.net_total,
          vat_amount: item.vat_amount,
          line_total: item.line_total,
          sort_order: item.sort_order,
        }))
      );
      if (itemErr) break;

      // İlk üretimde şablonun kendisine de seri kimliği yazılır.
      if (!head.series_id) {
        await supabase.from('invoices').update({ series_id: seriesId }).eq('id', head.id);
      }

      created += 1;
      cursor = nextDate;
    }
  }

  return created;
}
