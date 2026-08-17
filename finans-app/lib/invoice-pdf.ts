import type { Customer, Invoice, InvoiceItem } from './invoices';
import { formatMoney } from './invoices';

/**
 * Faz 5 — fatura PDF çıktısı.
 *
 * Rapor PDF'iyle aynı altyapıyı (jsPDF + autoTable) ve aynı marka bilgisini
 * (`company_settings`'teki şirket adı + base64 logo) kullanır — bkz.
 * lib/report-export.ts.
 *
 * NOT: Bu çıktı resmi bir e-Fatura/e-Arşiv belgesi değildir; ticari bir
 * proforma/bilgi faturasıdır. Alt bilgide bu açıkça belirtiliyor.
 */

export interface InvoiceBranding {
  companyName?: string | null;
  logoDataUrl?: string | null;
  taxNumber?: string | null;
  address?: string | null;
}

function logoFormatFromDataUrl(dataUrl: string): 'PNG' | 'JPEG' | null {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
  return null;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString('tr-TR');
}

export async function exportInvoiceToPDF(
  invoice: Invoice,
  items: InvoiceItem[],
  customer: Customer | null,
  branding?: InvoiceBranding
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Üst bilgi: logo + satıcı bilgileri ---
  let titleX = 14;
  if (branding?.logoDataUrl) {
    const format = logoFormatFromDataUrl(branding.logoDataUrl);
    if (format) {
      try {
        doc.addImage(branding.logoDataUrl, format, 14, 12, 18, 18);
        titleX = 36;
      } catch (err) {
        // Bozuk bir data URL faturayı tamamen engellemesin.
        console.error('Fatura logosu eklenemedi:', err);
      }
    }
  }

  doc.setFontSize(15);
  doc.text(branding?.companyName?.trim() || 'FinansApp', titleX, 20);

  doc.setFontSize(9);
  doc.setTextColor(110);
  let sellerY = 26;
  if (branding?.taxNumber) {
    doc.text(`Vergi No: ${branding.taxNumber}`, titleX, sellerY);
    sellerY += 4;
  }
  if (branding?.address) {
    doc.text(doc.splitTextToSize(branding.address, 90), titleX, sellerY);
  }

  // --- Sağ üst: FATURA başlığı ve künye ---
  doc.setTextColor(0);
  doc.setFontSize(18);
  doc.text('FATURA', pageWidth - 14, 20, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`No: ${invoice.invoice_number}`, pageWidth - 14, 27, { align: 'right' });
  doc.text(`Tarih: ${formatDate(invoice.issue_date)}`, pageWidth - 14, 32, { align: 'right' });
  if (invoice.due_date) {
    doc.text(`Vade: ${formatDate(invoice.due_date)}`, pageWidth - 14, 37, { align: 'right' });
  }

  // --- Alıcı ---
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text('SAYIN', 14, 52);
  doc.setFontSize(11);
  doc.text(customer?.name ?? 'Belirtilmemiş', 14, 58);

  doc.setFontSize(9);
  doc.setTextColor(110);
  let buyerY = 63;
  if (customer?.tax_number) {
    doc.text(`Vergi No: ${customer.tax_number}${customer.tax_office ? ` / ${customer.tax_office}` : ''}`, 14, buyerY);
    buyerY += 4;
  }
  if (customer?.address) {
    const lines = doc.splitTextToSize(customer.address, 110) as string[];
    doc.text(lines, 14, buyerY);
    buyerY += lines.length * 4;
  }
  if (customer?.email) {
    doc.text(customer.email, 14, buyerY);
    buyerY += 4;
  }

  // --- Kalemler ---
  autoTable(doc, {
    startY: Math.max(buyerY + 6, 78),
    head: [['Açıklama', 'Miktar', 'Birim Fiyat', 'KDV %', 'KDV Tutarı', 'Toplam']],
    body: items.map((item) => [
      item.description,
      item.quantity.toLocaleString('tr-TR'),
      formatMoney(item.unit_price, invoice.currency),
      `%${item.vat_rate}`,
      formatMoney(item.vat_amount, invoice.currency),
      formatMoney(item.line_total, invoice.currency),
    ]),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [27, 37, 89], textColor: 255 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
  });

  // --- Toplamlar ---
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const labelX = pageWidth - 60;
  const valueX = pageWidth - 14;

  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text('Ara Toplam', labelX, finalY);
  doc.text('KDV', labelX, finalY + 6);
  doc.setTextColor(0);
  doc.text(formatMoney(invoice.subtotal, invoice.currency), valueX, finalY, { align: 'right' });
  doc.text(formatMoney(invoice.vat_total, invoice.currency), valueX, finalY + 6, { align: 'right' });

  doc.setFontSize(12);
  doc.text('GENEL TOPLAM', labelX, finalY + 15);
  doc.text(formatMoney(invoice.total, invoice.currency), valueX, finalY + 15, { align: 'right' });

  // --- Notlar ---
  if (invoice.notes) {
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text('Notlar:', 14, finalY + 26);
    doc.text(doc.splitTextToSize(invoice.notes, pageWidth - 80) as string[], 14, finalY + 31);
  }

  // --- Alt bilgi / yasal uyarı ---
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    'Bu belge resmi bir e-Fatura/e-Arşiv belgesi değildir; bilgilendirme amaçlı ticari faturadır.',
    14,
    pageHeight - 14
  );
  doc.text('FinansApp ile oluşturuldu', pageWidth - 14, pageHeight - 14, { align: 'right' });

  doc.save(`fatura-${invoice.invoice_number}.pdf`);
}
