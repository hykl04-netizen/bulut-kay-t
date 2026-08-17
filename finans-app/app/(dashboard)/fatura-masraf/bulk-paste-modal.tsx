'use client';

import { useMemo, useState } from 'react';
import { X, Check, AlertCircle, ClipboardPaste } from 'lucide-react';
import { parseFlexibleAmount, parseFlexibleDate, splitPastedRows } from '@/lib/parsing';
import { toast } from '@/components/ui/toaster';

type ParsedRow = {
  lineNumber: number;
  rawCells: string[];
  title: string;
  amount: number | null;
  dueDate: string | null;
  isRecurring: boolean;
  recurrencePeriod: 'aylik' | 'yillik' | null;
  errors: string[];
};

type NewBillPayload = {
  user_id: string;
  title: string;
  amount: number;
  due_date: string | null;
  is_recurring: boolean;
  recurrence_period: 'aylik' | 'yillik' | null;
  status: 'odenmedi';
};

type Props = {
  userId: string;
  onClose: () => void;
  onImport: (rows: NewBillPayload[]) => Promise<void>;
};

const EXAMPLE = `Elektrik Faturası\t450,00\t2026-02-05\tevet\taylik
Netflix\t199,90\t01.02.2026\tevet\taylik
Araç Muayenesi\t1200\t15.03.2026\thayir\t`;

function buildRows(raw: string): ParsedRow[] {
  const lines = splitPastedRows(raw);

  return lines.map(({ cells, delimiterFound }, idx) => {
    const lineNumber = idx + 1;
    const errors: string[] = [];

    if (!delimiterFound || cells.length < 2) {
      return {
        lineNumber,
        rawCells: cells,
        title: '',
        amount: null,
        dueDate: null,
        isRecurring: false,
        recurrencePeriod: null,
        errors: ['Sütunlar Tab veya ; ile ayrılmalı (en az 2 sütun: Başlık, Tutar).'],
      };
    }

    const [rawTitle, rawAmount, rawDueDate = '', rawRecurring = '', rawPeriod = ''] = cells;

    const title = rawTitle.trim();
    if (!title) errors.push('Başlık boş olamaz.');

    const amount = parseFlexibleAmount(rawAmount);
    if (amount === null || amount <= 0) errors.push(`Tutar geçersiz: "${rawAmount}"`);

    let dueDate: string | null = null;
    if (rawDueDate.trim()) {
      dueDate = parseFlexibleDate(rawDueDate);
      if (!dueDate) errors.push(`Vade tarihi anlaşılamadı: "${rawDueDate}"`);
    }

    const normalizedRecurring = rawRecurring.trim().toLowerCase();
    const isRecurring = ['evet', 'e', 'yes', '1', 'true'].includes(normalizedRecurring);

    let recurrencePeriod: 'aylik' | 'yillik' | null = null;
    if (isRecurring) {
      const normalizedPeriod = rawPeriod.trim().toLowerCase();
      recurrencePeriod = normalizedPeriod === 'yillik' ? 'yillik' : 'aylik';
    }

    return { lineNumber, rawCells: cells, title, amount, dueDate, isRecurring, recurrencePeriod, errors };
  });
}

export function BulkPasteModal({ userId, onClose, onImport }: Props) {
  const [raw, setRaw] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  const parsedRows = useMemo(() => (raw.trim() ? buildRows(raw) : []), [raw]);
  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const invalidCount = parsedRows.length - validRows.length;

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const payload: NewBillPayload[] = validRows.map((r) => ({
        user_id: userId,
        title: r.title,
        amount: r.amount as number,
        due_date: r.dueDate,
        is_recurring: r.isRecurring,
        recurrence_period: r.recurrencePeriod,
        status: 'odenmedi',
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
      <div className="bg-card dark:bg-card rounded-2xl p-6 w-full max-w-3xl shadow-xl border border-border dark:border-border max-h-[90vh] flex flex-col">
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
              {result.success} kayıt başarıyla eklendi.
            </p>
            {result.failed > 0 && (
              <p className="text-sm text-rose-600">{result.failed} satır hatalı olduğu için atlandı.</p>
            )}
            <button
              onClick={onClose}
              className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl transition-colors"
            >
              Kapat
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-2">
              Excel&apos;den kopyaladığınız satırları aşağıya yapıştırın. Sütun sırası:{' '}
              <span className="font-medium text-foreground dark:text-muted-foreground">Başlık, Tutar, Vade Tarihi (opsiyonel), Tekrarlayan mı (evet/hayır, opsiyonel), Tekrar Sıklığı (aylik/yillik, opsiyonel)</span>.
            </p>
            <details className="mb-3 text-xs text-muted-foreground dark:text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground dark:hover:text-foreground select-none">Örnek biçim</summary>
              <pre className="mt-2 bg-muted dark:bg-secondary border border-border dark:border-border rounded-lg p-3 whitespace-pre-wrap font-mono">
                {EXAMPLE}
              </pre>
            </details>

            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="Excel'den kopyaladığınız hücreleri buraya yapıştırın..."
              rows={6}
              className="w-full px-3 py-2 border border-border dark:border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent dark:bg-secondary dark:text-foreground font-mono text-sm resize-y"
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
                    <thead className="bg-muted dark:bg-secondary border-b border-border dark:border-border sticky top-0">
                      <tr>
                        <th className="p-2 font-medium text-muted-foreground dark:text-muted-foreground w-8"></th>
                        <th className="p-2 font-medium text-muted-foreground dark:text-muted-foreground">Başlık</th>
                        <th className="p-2 font-medium text-muted-foreground dark:text-muted-foreground">Tutar</th>
                        <th className="p-2 font-medium text-muted-foreground dark:text-muted-foreground">Vade Tarihi</th>
                        <th className="p-2 font-medium text-muted-foreground dark:text-muted-foreground">Tekrar</th>
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
                            <td colSpan={4} className="p-2 align-top text-rose-600">
                              Satır {row.lineNumber}: {row.errors.join(' ')}
                            </td>
                          ) : (
                            <>
                              <td className="p-2 align-top text-foreground dark:text-muted-foreground">{row.title}</td>
                              <td className="p-2 align-top text-foreground dark:text-muted-foreground">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
                                  row.amount as number
                                )}
                              </td>
                              <td className="p-2 align-top text-foreground dark:text-muted-foreground">
                                {row.dueDate ? new Date(row.dueDate).toLocaleDateString('tr-TR') : (
                                  <span className="text-muted-foreground dark:text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="p-2 align-top text-foreground dark:text-muted-foreground">
                                {row.isRecurring
                                  ? row.recurrencePeriod === 'yillik' ? 'Yıllık' : 'Aylık'
                                  : <span className="text-muted-foreground dark:text-muted-foreground">Tek seferlik</span>}
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
                className="px-4 py-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={handleImport}
                disabled={validRows.length === 0 || importing}
                className="bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground px-4 py-2 rounded-xl transition-colors"
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
