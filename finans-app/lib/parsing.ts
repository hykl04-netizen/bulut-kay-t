/**
 * Excel'den kopyala-yapıştır ile gelen ham metni satır/sütunlara ayırma ve
 * esnek tarih/tutar biçimlerini normalize etme yardımcıları.
 * Toplu satır ekleme (7.4) özelliği için oluşturuldu; ihtiyaç halinde
 * diğer modüllerde de (borç-alacak, fatura-masraf, vb.) kullanılabilir.
 */

function toIsoIfValid(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** "2026-01-15", "15.01.2026", "15/01/2026" gibi biçimleri "YYYY-MM-DD"'ye çevirir. Geçersizse null. */
export function parseFlexibleDate(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let m = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return toIsoIfValid(Number(y), Number(mo), Number(d));
  }

  m = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return toIsoIfValid(Number(y), Number(mo), Number(d));
  }

  return null;
}

/** "1.234,56", "1234,56", "1234.56", "1234" gibi biçimleri sayıya çevirir. Geçersizse null. */
export function parseFlexibleAmount(input: string): number | null {
  let s = input.trim().replace(/\s/g, '');
  if (!s) return null;
  if (!/^-?[\d.,]+$/.test(s)) return null;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    // TR biçimi: nokta binlik ayraç, virgül ondalık ayraç (1.234,56)
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    // Virgül ondalık ayraç (1234,56)
    s = s.replace(',', '.');
  } else if (hasDot) {
    const parts = s.split('.');
    if (parts.length > 2 || parts[parts.length - 1].length === 3) {
      // Birden fazla nokta ya da 3 haneli son parça -> binlik ayraç kabul et
      s = parts.join('');
    }
    // aksi halde ondalık nokta olarak bırak
  }

  const value = parseFloat(s);
  return Number.isFinite(value) ? value : null;
}

/** Excel'den yapıştırılan ham metni satırlara, satırları da hücrelere ayırır (Tab veya ; ayraçlı). */
export function splitPastedRows(raw: string): { cells: string[]; delimiterFound: boolean }[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines.map((line) => {
    const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : null;
    if (!delimiter) {
      return { cells: [line], delimiterFound: false };
    }
    return { cells: line.split(delimiter).map((c) => c.trim()), delimiterFound: true };
  });
}
