import { supabase } from './supabase/client';
import type { Customer, Invoice, InvoiceItem } from './invoices';

/**
 * Faz 10 hazırlığı — resmi e-Fatura / e-Arşiv entegrasyonu için ortak arayüz.
 *
 * ⚠️ BU DOSYA BİR ENTEGRASYON DEĞİLDİR. Resmi e-Fatura göndermek için GİB
 * onaylı bir özel entegratörle (Logo/e-Logo, Foriba, Uyumsoft, Nes Bilgi vb.)
 * ticari sözleşme yapılması, test ortamı (GİB test) onayı alınması ve mali mühür
 * / e-imza temin edilmesi gerekir. Bunlar teknik değil ticari/hukuki adımlardır.
 *
 * Buradaki amaç, o adımlar tamamlandığında YAZILIM TARAFINDA yapılacak işi
 * tek bir dosyaya indirmek:
 *
 *   1. `EInvoiceAdapter` arayüzünü uygulayan bir sınıf/nesne yazılır
 *      (entegratörün REST API'sine göre).
 *   2. `buildEInvoicePayload()` çıktısı entegratörün beklediği biçime
 *      (genelde UBL-TR 1.2 XML) eşlenir.
 *   3. Sunucu tarafında bir route (`/api/e-fatura/gonder`) adapteri çağırır ve
 *      dönen ETTN/durumu `invoices.einvoice_*` alanlarına yazar.
 *
 * Veritabanı tarafı HAZIR (bkz. 20260822_einvoice_readiness.sql):
 * `invoices.einvoice_status/uuid/provider/ref/error/sent_at`,
 * `customers.is_einvoice_user/einvoice_alias`,
 * `workspaces.tax_number/tax_office/address`.
 */

export type EInvoiceStatus = 'yok' | 'kuyrukta' | 'gonderildi' | 'kabul' | 'red' | 'hata';

/** e-Fatura (alıcı mükellef) mi, e-Arşiv (mükellef değil) mi? */
export type EInvoiceScenario = 'e-fatura' | 'e-arsiv';

export interface SellerInfo {
  name: string;
  taxNumber: string;
  taxOffice: string | null;
  address: string;
}

export interface EInvoicePayload {
  scenario: EInvoiceScenario;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  seller: SellerInfo;
  buyer: {
    name: string;
    taxNumber: string;
    taxOffice: string | null;
    address: string;
    email: string | null;
    /** Alıcı e-Fatura mükellefiyse entegratörden gelen posta kutusu etiketi. */
    alias: string | null;
  };
  lines: {
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    netTotal: number;
    vatAmount: number;
    lineTotal: number;
  }[];
  totals: {
    subtotal: number;
    vatTotal: number;
    total: number;
  };
  notes: string | null;
}

export interface EInvoiceSendResult {
  ok: boolean;
  /** ETTN — entegratörün ürettiği tekil belge kimliği. */
  uuid?: string;
  /** Entegratörün kendi belge referansı. */
  ref?: string;
  status: EInvoiceStatus;
  error?: string;
}

/**
 * Entegratörden bağımsız adaptör arayüzü. Sağlayıcı seçildiğinde bu arayüzü
 * uygulayan tek bir dosya yazmak yeterli olacak.
 */
export interface EInvoiceAdapter {
  readonly provider: string;
  /** Alıcının e-Fatura mükellefi olup olmadığını sorgular (senaryoyu belirler). */
  checkTaxpayer(taxNumber: string): Promise<{ isEInvoiceUser: boolean; alias: string | null }>;
  send(payload: EInvoicePayload): Promise<EInvoiceSendResult>;
  /** Gönderilmiş bir belgenin GİB/alıcı yanıtını sorgular. */
  getStatus(ref: string): Promise<{ status: EInvoiceStatus; error?: string }>;
}

/**
 * Uygulama verisinden entegratöre verilecek normalize edilmiş yükü üretir.
 * Bu yapı UBL-TR'nin TAMAMI DEĞİLDİR; entegratörlerin çoğu bu alanlardan
 * XML'i kendisi üretir. Eksik kalırsa entegratörün istediği ek alanlar
 * (birim kodu, ödeme şekli, teslim şartı vb.) buraya eklenir.
 */
export function buildEInvoicePayload(params: {
  invoice: Invoice;
  items: InvoiceItem[];
  customer: Customer;
  seller: SellerInfo;
  scenario: EInvoiceScenario;
  buyerAlias?: string | null;
}): EInvoicePayload {
  const { invoice, items, customer, seller, scenario } = params;

  return {
    scenario,
    invoiceNumber: invoice.invoice_number,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    currency: invoice.currency,
    seller,
    buyer: {
      name: customer.name,
      taxNumber: customer.tax_number ?? '',
      taxOffice: customer.tax_office,
      address: customer.address ?? '',
      email: customer.email,
      alias: params.buyerAlias ?? null,
    },
    lines: items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      vatRate: item.vat_rate,
      netTotal: item.net_total,
      vatAmount: item.vat_amount,
      lineTotal: item.line_total,
    })),
    totals: {
      subtotal: invoice.subtotal,
      vatTotal: invoice.vat_total,
      total: invoice.total,
    },
    notes: invoice.notes,
  };
}

/**
 * Bir faturanın e-Fatura için eksik alanlarını döner (boş dizi = hazır).
 * Kontrol veritabanında yapılır ki hem arayüz hem ileride sunucu route'u
 * aynı kuralı kullansın.
 */
export async function getMissingEInvoiceFields(invoiceId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('einvoice_missing_fields', { p_invoice_id: invoiceId });
  if (error || !data) return [];
  return data as string[];
}
