/**
 * Banka ekstresi (CSV) içe aktarma yardımcıları.
 *
 * Gerçek "Open Banking" (bankaya canlı API ile bağlanıp işlemleri otomatik
 * çekme) BDDK lisanslı bir aracı/ödeme kuruluşu (TPP) üzerinden yapılabilir
 * ve bunun için o kuruluşla ayrı bir sözleşme + API anahtarı gerekir — genel
 * bir uygulamaya "otomatik" olarak eklenemez. Bunun yerine, bankanızın internet
 * şubesinden indirdiğiniz ekstre CSV dosyasını içe aktarma akışını
 * uyguluyoruz; `bank_accounts` tablosu ileride gerçek bir sağlayıcı (ör.
 * GoCardless Bank Account Data, Salt Edge) bağlanacaksa da aynı şekilde
 * kullanılabilir.
 */

export interface ParsedBankRow {
  date: string; // 'YYYY-MM-DD'
  description: string;
  amount: number; // pozitif: gelir, negatif: gider
  externalRef: string;
}

function splitCsvLine(line: string): string[] {
  const delimiter = line.includes(';') ? ';' : ',';
  return line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ''));
}

function parseAmount(raw: string): number | null {
  if (!raw) return null;
  // Türkiye banka ekstrelerinde "1.234,56" veya "-1234.56" gibi formatlar olabilir.
  let cleaned = raw.replace(/[^0-9,.-]/g, '');
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Binlik ayracı '.', ondalık ayracı ',' varsayımı (tr-TR)
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  // DD.MM.YYYY veya DD/MM/YYYY
  const match = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

/**
 * Genel amaçlı CSV ayrıştırıcı. "Tarih/Date", "Açıklama/Description",
 * "Tutar/Amount" başlıklarını (Türkçe/İngilizce, büyük/küçük harf duyarsız)
 * arar. Sütun sırası bankaya göre değişebileceği için başlık adına göre
 * eşleştirme yapılır.
 */
export function parseBankStatementCsv(csvText: string): { rows: ParsedBankRow[]; skipped: number } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { rows: [], skipped: 0 };

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const dateIdx = header.findIndex((h) => h.includes('tarih') || h.includes('date'));
  const descIdx = header.findIndex((h) => h.includes('açıklama') || h.includes('aciklama') || h.includes('description') || h.includes('işlem'));
  const amountIdx = header.findIndex((h) => h.includes('tutar') || h.includes('amount'));

  if (dateIdx === -1 || amountIdx === -1) {
    return { rows: [], skipped: lines.length - 1 };
  }

  const rows: ParsedBankRow[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const date = parseDate(cells[dateIdx] ?? '');
    const amount = parseAmount(cells[amountIdx] ?? '');
    const description = descIdx !== -1 ? cells[descIdx] ?? '' : '';

    if (!date || amount === null) {
      skipped++;
      continue;
    }

    rows.push({
      date,
      description: description || 'Banka hareketi',
      amount,
      // Aynı satırın tekrar aktarılmasını engellemek için tarih+açıklama+tutardan
      // basit bir referans üretiyoruz (gerçek bankalarda genelde bir "işlem no"
      // sütunu da olur; varsa onu kullanmak daha sağlam olur).
      externalRef: `${date}|${description}|${amount}|${i}`,
    });
  }

  return { rows, skipped };
}
