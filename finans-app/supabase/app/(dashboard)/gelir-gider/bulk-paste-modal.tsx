'use client';

import { useMemo, useState } from 'react';
import { X, Check, AlertCircle, ClipboardPaste } from 'lucide-react';
import { parseFlexibleAmount, parseFlexibleDate, splitPastedRows } from '@/lib/parsing';
import { toast } from '@/components/ui/toaster';

type Category = { id: string; name: string; color: string; type: string };

type ParsedRow = {
  lineNumber: number;
  rawCells: string[];
  date: string | null;
  description: string;
  amount: number | null;
  type: 'gelir' | 'gider' | null;
  categoryName: string;
  categoryId: string | null;
  errors: string[];
};

type NewTransactionPayload = {
  user_id: string;
  type: 'gelir' | 'gider';
  amount: number;
  description: string;
  date: string;
  category_id: string | null;
};

type Props = {
  categories: Category[];
  userId: string;
  onClose: () => void;
  onImport: (rows: NewTransactionPayload[]) => Promise<void>;
};

const EXAMPLE = `2026-01-15\tMarket alışverişi\t450,00\tgider\tMarket
2026-01-16\tMaaş\t35000\tgelir\tMaaş`;

function buildRows(raw: string, categories: Category[]): ParsedRow[] {
  const lines = splitPastedRows(raw);

  return lines.map(({ cells, delimiterFound }, idx) => {
    const lineNumber = idx + 1;
    const errors: string[] = [];

    if (!delimiterFound || cells.length < 4) {
      return {
        lineNumber,
        rawCells: cells,
        date: null,
        description: '',
        amount: null,
        type: null,
        categoryName: '',
        categoryId: null,
        errors: ['Sütunlar Tab veya ; ile ayrılmalı (en az 4 sütun: Tarih, Açıklama, Tutar, Tip).'],
      };
    }

    const [rawDate, rawDescription, rawAmount, rawType, rawCategory = ''] = cells;

    const date = parseFlexibleDate(rawDate);
    if (!date) errors.push(`Tarih anlaşılamadı: "${rawDate}"`);

    const description = rawDescription.trim();
    if (!description) errors.push('Açıklama boş olamaz.');

    const amount = parseFlexibleAmount(rawAmount);
    if (amount === null || amount <= 0) errors.push(`Tutar geçersiz: "${rawAmount}"`);

    const normalizedType = rawType.trim().toLowerCase();
    const type: 'gelir' | 'gider' | null =
      normalizedType === 'gelir' ? 'gelir' : normalizedType === 'gider' ? 'gider' : null;
    if (!type) errors.push(`Tip "gelir" veya "gider" olmalı: "${rawType}"`);

    const categoryName = rawCategory.trim();
    let categoryId: string | null = null;
    if (categoryName && type) {
      const match = categories.find(
        (c) => c.type === type && c.name.toLowerCase() === categoryName.toLowerCase()
      );
      categoryId = match?.id ?? null;
      // Kategori eşleşmezse hata değil, sadece kategorisiz eklenir (uyarı preview'da gösterilir)
    }

    return { lineNumber, rawCells: cells, date, description, amount, type, categoryName, categoryId, errors };
  });
}

export function BulkPasteModal({ categories, userId, onClose, onImport }: Props) {
  const [raw, setRaw] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  const parsedRows = useMemo(() => (raw.trim() ? buildRows(raw, categories) : []), [raw, categories]);
  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const invalidCount = parsedRows.length - validRows.length;

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const payload: NewTransactionPayload[] = validRows.map((r) => ({
        user_id: userId,
        type: r.type as 'gelir' | 'gider',
        amount: r.amount as number,
        description: r.description,
        date: r.date as string,
        category_id: r.categoryId,
      }));
      await onImport(payload);
      setResult({ success: payload.length, failed: invalidCount });
    } catch (err) {
      toast.error('Toplu ekleme sırasında hata oluştu: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-primary/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card dark:bg-primary rounded-2xl p-6 w-full max-w-3xl shadow-xl border border-border dark:border-border max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-foreground dark:text-foreground flex items-center gap-2">
            <ClipboardPaste className="w-5 h-5" />
            Excel&apos;den Toplu Ekle
          </h2>
          <button onClick={onClose} className="text-muted-foreground dark:text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-lg font-medium text-foreground dark:text-foreground">
              {result.success} işlem başarıyla eklendi.
            </p>
            {result.failed > 0 && (
              <p className="text-sm text-rose-600">{result.failed} satır hatalı olduğu için atlandı.</p>
            )}
            <button
              onClick={onClose}
              className="mt-4 bg-primary hover:bg-secondary text-white px-4 py-2 rounded-lg transition-colors"
            >
              Kapat
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-2">
              Excel&apos;den kopyaladığınız satırları aşağıya yapıştırın. Sütun sırası:{' '}
              <span className="font-medium text-foreground dark:text-muted-foreground">Tarih, Açıklama, Tutar, Tip (gelir/gider), Kategori (opsiyonel)</span>.
            </p>
            <details className="mb-3 text-xs text-muted-foreground dark:text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground dark:hover:text-foreground select-none">Örnek biçim</summary>
              <pre className="mt-2 bg-muted dark:bg-primary border border-border dark:border-border rounded-lg p-3 whitespace-pre-wrap font-mono">
                {EXAMPLE}
              </pre>
            </details>

            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="Excel'den kopyaladığınız hücreleri buraya yapıştırın..."
              rows={6}
              className="w-full px-3 py-2 border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-secondary dark:text-slate-100 font-mono text-sm resize-y"
            />

            {parsedRows.length > 0 && (
              <div className="mt-4 flex-1 min-h-0 flex flex-col">
                <div className="flex items-center gap-4 mb-2 text-sm">
                  <span className="text-muted-foreground dark:text-muted-foreground">{parsedRows.length} satır bulundu</span>
                  <span className="text-emerald-600 font-medium">{validRows.length} geçerli</span>
                  {invalidCount > 0 && (
                    <span className="text-rose-600 font-medium">{invalidCount} hatalı (atlanacak)</span>
                  )}
                </div>
                <div className="border border-border dark:border-border rounded-lg overflow-auto flex-1 min-h-0">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted dark:bg-primary border-b border-border dark:border-border sticky top-0">
                      <tr>
                        <th className="p-2 font-medium text-muted-foreground dark:text-muted-foreground w-8"></th>
                        <th className="p-2 font-medium text-muted-foreground dark:text-muted-foreground">Tarih</th>
                        <th className="p-2 font-medium text-muted-foreground dark:text-muted-foreground">Açıklama</th>
                        <th className="p-2 font-medium text-muted-foreground dark:text-muted-foreground">Tutar</th>
                        <th className="p-2 font-medium text-muted-foreground dark:text-muted-foreground">Tip</th>
                        <th className="p-2 font-medium text-muted-foreground dark:text-muted-foreground">Kategori</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row) => (
                        <tr key={row.lineNumber} className="border-b border-border dark:border-border last:border-0">
                          <td className="p-2 align-top">
                            {row.errors.length === 0 ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            )}
                          </td>
                          {row.errors.length > 0 ? (
                            <td colSpan={5} className="p-2 align-top text-rose-600">
                              Satır {row.lineNumber}: {row.errors.join(' ')}
                            </td>
                          ) : (
                            <>
                              <td className="p-2 align-top text-foreground dark:text-muted-foreground">
                                {new Date(row.date as string).toLocaleDateString('tr-TR')}
                              </td>
                              <td className="p-2 align-top text-foreground dark:text-muted-foreground">{row.description}</td>
                              <td className="p-2 align-top text-foreground dark:text-muted-foreground">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
                                  row.amount as number
                                )}
                              </td>
                              <td className="p-2 align-top text-foreground dark:text-muted-foreground">{row.type}</td>
                              <td className="p-2 align-top text-foreground dark:text-muted-foreground">
                                {row.categoryName ? (
                                  row.categoryId ? (
                                    row.categoryName
                                  ) : (
                                    <span className="text-amber-600" title="Bu isimde kategori bulunamadı, kategorisiz eklenecek">
                                      {row.categoryName} (eşleşmedi)
                                    </span>
                                  )
                                ) : (
                                  <span className="text-muted-foreground dark:text-muted-foreground">-</span>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border dark:border-border">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-muted-foreground dark:text-muted-foreground hover:bg-secondary dark:hover:bg-slate-700 transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={handleImport}
                disabled={validRows.length === 0 || importing}
                className="bg-primary hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                {importing ? 'Ekleniyor...' : `İçe Aktar (${validRows.length} satır)`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
