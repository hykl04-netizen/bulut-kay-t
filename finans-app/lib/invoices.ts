import { supabase } from './supabase/client';
import { formatCurrency } from './currency';

/**
 * Faz 5 — satış faturası (fatura kesme) modülü.
 *
 * ÖNEMLİ: Bu modül RESMİ e-Fatura DEĞİLDİR. Görsel/PDF fatura üretir.
 * Resmi e-Fatura/e-Arşiv, GİB onaylı bir entegratörle (Logo, Foriba,
 * Uyumsoft vb.) ticari anlaşma gerektirir — yol haritasında Faz 10.
 */

export type InvoiceStatus = 'taslak' | 'gonderildi' | 'odendi' | 'iptal';

/** Arayüzde gösterilen durum — "gecikti" saklanmaz, türetilir (bkz. resolveStatus). */
export type DisplayStatus = InvoiceStatus | 'gecikti';

export interface Customer {
  id: string;
  workspace_id: string;
  name: string;
  tax_number: string | null;
  tax_office: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  net_total: number;
  vat_amount: number;
  line_total: number;
  sort_order: number;
}

export interface Invoice {
  id: string;
  workspace_id: string;
  customer_id: string | null;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  currency: string;
  subtotal: number;
  vat_total: number;
  total: number;
  notes: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
}

export interface InvoiceWithCustomer extends Invoice {
  customers: { name: string } | null;
}

export const STATUS_LABELS: Record<DisplayStatus, string> = {
  taslak: 'Taslak',
  gonderildi: 'Gönderildi',
  odendi: 'Ödendi',
  gecikti: 'Gecikti',
  iptal: 'İptal',
};

export const STATUS_CLASSES: Record<DisplayStatus, string> = {
  taslak: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  gonderildi: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
  odendi: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  gecikti: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
  iptal: 'bg-muted text-muted-foreground line-through',
};

/**
 * Gösterilecek durumu belirler. "Gecikti" veritabanında SAKLANMAZ; gönderilmiş
 * ve vadesi geçmiş faturalar için burada türetilir. Böylece durumu her gün
 * güncelleyecek bir cron'a gerek kalmıyor ve bilgi her zaman güncel oluyor.
 */
export function resolveStatus(invoice: Pick<Invoice, 'status' | 'due_date'>): DisplayStatus {
  if (invoice.status !== 'gonderildi' || !invoice.due_date) return invoice.status;
  const due = new Date(`${invoice.due_date}T23:59:59`);
  return due.getTime() < Date.now() ? 'gecikti' : 'gonderildi';
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Bir kalemin net/KDV/toplam değerlerini hesaplar (birim fiyat KDV HARİÇ girilir). */
export function calcItem(quantity: number, unitPrice: number, vatRate: number) {
  const net = round2(quantity * unitPrice);
  const vat = round2(net * (vatRate / 100));
  return { net_total: net, vat_amount: vat, line_total: round2(net + vat) };
}

export function calcInvoiceTotals(items: Pick<InvoiceItem, 'net_total' | 'vat_amount' | 'line_total'>[]) {
  return {
    subtotal: round2(items.reduce((s, i) => s + i.net_total, 0)),
    vat_total: round2(items.reduce((s, i) => s + i.vat_amount, 0)),
    total: round2(items.reduce((s, i) => s + i.line_total, 0)),
  };
}

/**
 * Fatura ekranlarının alıştığı ad — biçimlendirme mantığı lib/currency.ts'te
 * tek noktada toplandı; bu yalnızca geriye dönük uyumluluk için ince bir sarmalayıcı.
 */
export function formatMoney(value: number, currency = 'TRY'): string {
  return formatCurrency(value, currency);
}

// ---------------------------------------------------------------------------
// Veri erişimi
// ---------------------------------------------------------------------------

export async function fetchCustomers(workspaceId: string): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Customer[];
}

export async function fetchInvoices(workspaceId: string): Promise<InvoiceWithCustomer[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, customers(name)')
    .eq('workspace_id', workspaceId)
    .order('issue_date', { ascending: false })
    .order('invoice_number', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as InvoiceWithCustomer[];
}

export async function fetchInvoice(id: string): Promise<{ invoice: InvoiceWithCustomer; items: InvoiceItem[] }> {
  const [{ data: inv, error: invErr }, { data: items, error: itemErr }] = await Promise.all([
    supabase.from('invoices').select('*, customers(name)').eq('id', id).single(),
    supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order'),
  ]);
  if (invErr) throw new Error(invErr.message);
  if (itemErr) throw new Error(itemErr.message);
  return { invoice: inv as InvoiceWithCustomer, items: (items ?? []) as InvoiceItem[] };
}

/**
 * Fatura numarası ARTIK İSTEMCİDEN ÜRETİLMİYOR.
 *
 * Numara, veritabanındaki trg_invoices_assign_number tetikleyicisi ile
 * INSERT anında atanıyor; next_invoice_number RPC'si authenticated rolüne
 * kapatıldı. Eskiden burada bir yardımcı vardı ve form açılırken
 * çağrılıyordu — kullanıcı vazgeçtiğinde numara yanıyor, fatura serisinde
 * delik kalıyordu. Bu yorum, o yardımcıyı geri eklemeyi düşünen için.
 */

export interface SaveInvoiceInput {
  workspaceId: string;
  invoiceId?: string;
  invoiceNumber: string;
  customerId: string | null;
  issueDate: string;
  dueDate: string | null;
  status: InvoiceStatus;
  notes: string | null;
  items: InvoiceItem[];
  /** Tekrarlayan fatura ayarları (Öneri 10). */
  isRecurring?: boolean;
  recurrencePeriod?: 'aylik' | 'yillik' | null;
  recurrenceEndDate?: string | null;
}

/**
 * Faturayı ve kalemlerini kaydeder. Kalemler her kayıtta silinip yeniden
 * yazılır — kalem düzenleme arayüzü satırları serbestçe ekleyip çıkarabildiği
 * için tek tek farkı hesaplamaktan çok daha basit ve hatasız. Fatura
 * toplamları DB tetikleyicisi (`recalc_invoice_totals`) tarafından kalemlerden
 * yeniden hesaplanır.
 */
export interface SavedInvoice {
  id: string;
  /** Numarayı veritabanı atar; kaydedilen gerçek numara buradan döner. */
  invoiceNumber: string;
}

export async function saveInvoice(input: SaveInvoiceInput): Promise<SavedInvoice> {
  const totals = calcInvoiceTotals(input.items);
  // FATURA NUMARASI: yeni faturada kolon HİÇ gönderilmez. Numarayı
  // veritabanındaki trg_invoices_assign_number tetikleyicisi INSERT anında
  // atar. Önceden numara form AÇILIRKEN üretiliyordu; kullanıcı vazgeçince
  // o numara yanıyor ve fatura serisinde delik kalıyordu — Türkiye'de
  // numaraların aralıksız olması zorunlu.
  const trimmedNumber = input.invoiceNumber?.trim() ?? '';
  const payload = {
    workspace_id: input.workspaceId,
    customer_id: input.customerId,
    issue_date: input.issueDate,
    due_date: input.dueDate,
    status: input.status,
    notes: input.notes,
    is_recurring: input.isRecurring ?? false,
    recurrence_period: input.recurrencePeriod ?? null,
    recurrence_end_date: input.recurrenceEndDate ?? null,
    ...totals,
    updated_at: new Date().toISOString(),
  };

  let invoiceId = input.invoiceId;
  let savedNumber = input.invoiceNumber;

  if (invoiceId) {
    const { error } = await supabase
      .from('invoices')
      .update({ ...payload, invoice_number: trimmedNumber })
      .eq('id', invoiceId);
    if (error) throw new Error(error.message);
    const { error: delErr } = await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
    if (delErr) throw new Error(delErr.message);
  } else {
    // İki ayrı çağrı: yeni faturada invoice_number kolonu HİÇ gönderilmiyor
    // (tetikleyici atasın diye), düzenlemede mevcut numara korunuyor.
    const { data, error } = trimmedNumber
      ? await supabase
          .from('invoices')
          .insert({ ...payload, invoice_number: trimmedNumber })
          .select('id, invoice_number')
          .single()
      : await supabase.from('invoices').insert(payload).select('id, invoice_number').single();
    if (error) throw new Error(error.message);
    invoiceId = (data as { id: string }).id;
    savedNumber = (data as { invoice_number: string }).invoice_number;
  }

  if (input.items.length > 0) {
    const rows = input.items.map((item, index) => ({
      workspace_id: input.workspaceId,
      invoice_id: invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      vat_rate: item.vat_rate,
      net_total: item.net_total,
      vat_amount: item.vat_amount,
      line_total: item.line_total,
      sort_order: index,
    }));
    const { error } = await supabase.from('invoice_items').insert(rows);
    if (error) throw new Error(error.message);
  }

  return { id: invoiceId, invoiceNumber: savedNumber };
}

/** Fatura geliri için kullanılan kategori adı — yoksa otomatik oluşturulur. */
const INVOICE_INCOME_CATEGORY = 'Fatura Geliri';

async function findOrCreateInvoiceIncomeCategory(workspaceId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('type', 'gelir')
    .eq('name', INVOICE_INCOME_CATEGORY)
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data: created, error } = await supabase
    .from('categories')
    .insert({ workspace_id: workspaceId, type: 'gelir', name: INVOICE_INCOME_CATEGORY, color: '#10b981' })
    .select('id')
    .single();
  // Kategori oluşturulamazsa gelir kaydı kategorisiz açılır — akış durmasın.
  if (error || !created) return null;
  return (created as { id: string }).id;
}

/**
 * Faturanın gelir kaydını durumla eşitler.
 *
 * "Ödendi" olan her faturanın karşılığında tam olarak BİR gelir kaydı olur;
 * fatura ödenmemişe döndürülür ya da iptal edilirse o kayıt silinir. Böylece
 * kesilen fatura nakit akışına ve raporlara doğru şekilde yansır ve kullanıcı
 * aynı tutarı ikinci kez elle girmek zorunda kalmaz.
 *
 * Bilinçli olarak DB tetikleyicisi değil: yedekten geri yükleme sırasında hem
 * faturalar hem işlemler yazıldığı için tetikleyici çift kayıt üretirdi.
 */
export async function syncInvoiceIncome(params: {
  workspaceId: string;
  invoiceId: string;
  status: InvoiceStatus;
  issueDate: string;
  paidTotal: number;
  currency: string;
  invoiceNumber: string;
  customerName?: string | null;
}): Promise<void> {
  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('invoice_id', params.invoiceId)
    .maybeSingle();

  if (params.status !== 'odendi') {
    if (existing) {
      await supabase.from('transactions').delete().eq('id', (existing as { id: string }).id);
    }
    return;
  }

  const description = params.customerName
    ? `${params.invoiceNumber} nolu fatura — ${params.customerName}`
    : `${params.invoiceNumber} nolu fatura`;

  const payload = {
    workspace_id: params.workspaceId,
    invoice_id: params.invoiceId,
    date: params.issueDate,
    type: 'gelir' as const,
    amount: params.paidTotal,
    currency: params.currency,
    exchange_rate: 1,
    try_equivalent: params.currency === 'TRY' ? params.paidTotal : null,
    description,
  };

  if (existing) {
    await supabase.from('transactions').update(payload).eq('id', (existing as { id: string }).id);
    return;
  }

  const categoryId = await findOrCreateInvoiceIncomeCategory(params.workspaceId);
  const { error } = await supabase
    .from('transactions')
    .insert({ ...payload, category_id: categoryId });
  if (error) throw new Error(`Gelir kaydı oluşturulamadı: ${error.message}`);
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
  cancelReason?: string
): Promise<void> {
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === 'odendi') patch.paid_at = new Date().toISOString();
  if (status === 'iptal') {
    patch.cancelled_at = new Date().toISOString();
    patch.cancel_reason = cancelReason ?? null;
  }
  const { error } = await supabase.from('invoices').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}
