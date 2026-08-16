/**
 * Raporlar sayfası için tam rapor dışa aktarımı (PDF / Excel).
 * Grafik bazlı PNG indirme (report-share-button.tsx) bunun dışında, ayrı bir akış;
 * burası muhasebeciyle paylaşılabilecek tablo halinde tam rapor üretir.
 */

import type { MonthlyCashFlow, DistributionSlice } from '@/lib/reports';

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });

function formatTRY(value: number): string {
  return TRY_FORMATTER.format(value);
}

export interface ReportExportData {
  monthlyCashFlow: MonthlyCashFlow[];
  expenseByCategory: DistributionSlice[];
  portfolioDistribution: DistributionSlice[];
}

function todayFileSuffix(): string {
  return new Date().toISOString().split('T')[0];
}

export async function exportReportToPDF(data: ReportExportData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF();
  const generatedAt = new Date().toLocaleString('tr-TR');

  doc.setFontSize(16);
  doc.text('FinansApp — Finansal Rapor', 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Oluşturulma tarihi: ${generatedAt}`, 14, 24);
  doc.setTextColor(0);

  let cursorY = 32;

  if (data.monthlyCashFlow.length > 0) {
    doc.setFontSize(12);
    doc.text('Aylık Nakit Akışı', 14, cursorY);
    autoTable(doc, {
      startY: cursorY + 4,
      head: [['Ay', 'Gelir', 'Gider', 'Net']],
      body: data.monthlyCashFlow.map((m) => [m.monthLabel, formatTRY(m.gelir), formatTRY(m.gider), formatTRY(m.net)]),
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 9 },
    });
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  if (data.expenseByCategory.length > 0) {
    doc.setFontSize(12);
    doc.text('Kategori Bazlı Harcamalar', 14, cursorY);
    autoTable(doc, {
      startY: cursorY + 4,
      head: [['Kategori', 'Tutar']],
      body: data.expenseByCategory.map((c) => [c.name, formatTRY(c.value)]),
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 9 },
    });
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  if (data.portfolioDistribution.length > 0) {
    doc.setFontSize(12);
    doc.text('Portföy Dağılımı', 14, cursorY);
    autoTable(doc, {
      startY: cursorY + 4,
      head: [['Varlık Türü', 'Değer']],
      body: data.portfolioDistribution.map((p) => [p.name, formatTRY(p.value)]),
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 9 },
    });
  }

  doc.save(`finansapp-rapor-${todayFileSuffix()}.pdf`);
}

export async function exportReportToExcel(data: ReportExportData): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  if (data.monthlyCashFlow.length > 0) {
    const rows = data.monthlyCashFlow.map((m) => ({
      Ay: m.monthLabel,
      Gelir: m.gelir,
      Gider: m.gider,
      Net: m.net,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Nakit Akışı');
  }

  if (data.expenseByCategory.length > 0) {
    const rows = data.expenseByCategory.map((c) => ({ Kategori: c.name, Tutar: c.value }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Kategori Harcamaları');
  }

  if (data.portfolioDistribution.length > 0) {
    const rows = data.portfolioDistribution.map((p) => ({ 'Varlık Türü': p.name, Değer: p.value }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Portföy Dağılımı');
  }

  if (wb.SheetNames.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Gösterilecek veri yok']]), 'Rapor');
  }

  XLSX.writeFile(wb, `finansapp-rapor-${todayFileSuffix()}.xlsx`);
}
