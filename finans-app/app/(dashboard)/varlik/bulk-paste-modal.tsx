'use client';

import { useMemo, useState } from 'react';
import { X, Check, AlertCircle, ClipboardPaste } from 'lucide-react';
import { parseFlexibleAmount, splitPastedRows } from '@/lib/parsing';
import { toast } from '@/components/ui/toaster';
import { formatCurrency } from '@/lib/currency';

type ParsedRow = {
  lineNumber: number;
  rawCells: string[];
  assetName: string;
  assetType: string;
  currentValue: number | null;
  currency: string;
  notes: string;
  errors: string[];
};

type NewAssetPayload = {
  workspace_id: string;
  asset_name: string;
  asset_type: string | null;
  current_value: number;
  currency: string;
  notes: string | null;
  updated_at: string;
};

type Props = {
  workspaceId: string;
  onClose: () => void;
  onImport: (rows: NewAssetPayload[]) => Promise<void>;
};

const EXAMPLE = `Ev\tGayrimenkul\t3500000\tTRY\tİstanbul, Kadıköy
Araba\tAraç\t850000\tTRY\t
Altın (Cumhuriyet)\tDeğerli Maden\t12500,50\tTRY\t10 adet`;

function buildRows(raw: string): ParsedRow[] {
  const lines = splitPastedRows(raw);

  return lines.map(({ cells, delimiterFound }, idx) => {
    const lineNumber = idx + 1;
    const errors: string[] = [];

    if (!delimiterFound || cells.length < 2) {
      return {
        lineNumber,
        rawCells: cells,
        assetName: '',
        assetType: '',
        currentValue: null,
        currency: 'TRY',
        notes: '',
        errors: ['Sütunlar Tab veya ; ile ayrılmalı (en az 2 sütun: Varlık Adı, Güncel Değer).'],
      };
    }

    const [rawName, rawTypeOrValue, rawValueMaybe = '', rawCurrency = '', rawNotes = ''] = cells;

    const assetName = rawName.trim();
    if (!assetName) errors.push('Varlık adı boş olamaz.');

    // Sütun sırası: Ad, Tür(opsiyonel), Değer, Para Birimi(opsiyonel), Not(opsiyonel)
    // Tür sayısal değilse 2. sütun tür olarak, değer 3. sütundan alınır.
    let assetType = '';
    let rawValue = rawTypeOrValue;
    if (cells.length >= 3 && parseFlexibleAmount(rawTypeOrValue) === null) {
      assetType = rawTypeOrValue.trim();
      rawValue = rawValueMaybe;
    }

    const currentValue = parseFlexibleAmount(rawValue);
    if (currentValue === null || currentValue < 0) errors.push(`Güncel değer geçersiz: "${rawValue}"`);

    const currency = rawCurrency.trim() ? rawCurrency.trim().toUpperCase() : 'TRY';

    return {
      lineNumber,
      rawCells: cells,
      assetName,
      assetType,
      currentValue,
      currency,
      notes: rawNotes.trim(),
      errors,
    };
  });
}

export function BulkPasteModal({ workspaceId, onClose, onImport }: Props) {
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
      const payload: NewAssetPayload[] = validRows.map((r) => ({
        workspace_id: workspaceId,
        asset_name: r.assetName,
        asset_type: r.assetType || null,
        current_value: r.currentValue as number,
        currency: r.currency,
        notes: r.notes || null,
        updated_at: new Date().toISOString(),
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
      <div className="bg-card rounded-2xl p-6 w-full max-w-3xl shadow-xl border border-border max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ClipboardPaste className="w-5 h-5" />
            Excel&apos;den Toplu Ekle
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-lg font-medium text-foreground">
              {result.success} varlık başarıyla eklendi.
            </p>
            {result.failed > 0 && (
              <p className="text-sm text-rose-600">{result.failed} satır hatalı olduğu için atlandı.</p>
            )}
            <button
              onClick={onClose}
              className="mt-4 bg-primary hover:opacity-90 text-primary-foreground px-4 py-2 rounded-lg transition-colors"
            >
              Kapat
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-2">
              Excel&apos;den kopyaladığınız satırları aşağıya yapıştırın. Sütun sırası:{' '}
              <span className="font-medium text-foreground dark:text-muted-foreground">Varlık Adı, Tür (opsiyonel), Güncel Değer, Para Birimi (opsiyonel, varsayılan TRY), Not (opsiyonel)</span>.
            </p>
            <details className="mb-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground select-none">Örnek biçim</summary>
              <pre className="mt-2 bg-muted border border-border rounded-lg p-3 whitespace-pre-wrap font-mono">
                {EXAMPLE}
              </pre>
            </details>

            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="Excel'den kopyaladığınız hücreleri buraya yapıştırın..."
              rows={6}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-secondary dark:text-slate-100 font-mono text-sm resize-y"
            />

            {parsedRows.length > 0 && (
              <div className="mt-4 flex-1 min-h-0 flex flex-col">
                <div className="flex items-center gap-4 mb-2 text-sm">
                  <span className="text-muted-foreground">{parsedRows.length} satır bulundu</span>
                  <span className="text-emerald-600 font-medium">{validRows.length} geçerli</span>
                  {invalidCount > 0 && (
                    <span className="text-rose-600 font-medium">{invalidCount} hatalı (atlanacak)</span>
                  )}
                </div>
                <div className="border border-border rounded-lg overflow-auto flex-1 min-h-0">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted border-b border-border sticky top-0">
                      <tr>
                        <th className="p-2 font-medium text-muted-foreground w-8"></th>
                        <th className="p-2 font-medium text-muted-foreground">Varlık Adı</th>
                        <th className="p-2 font-medium text-muted-foreground">Tür</th>
                        <th className="p-2 font-medium text-muted-foreground">Güncel Değer</th>
                        <th className="p-2 font-medium text-muted-foreground">Not</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row) => (
                        <tr key={row.lineNumber} className="border-b border-border last:border-0">
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
                              <td className="p-2 align-top text-foreground dark:text-muted-foreground">{row.assetName}</td>
                              <td className="p-2 align-top text-foreground dark:text-muted-foreground">
                                {row.assetType || <span className="text-muted-foreground">-</span>}
                              </td>
                              <td className="p-2 align-top text-foreground dark:text-muted-foreground">
                                {formatCurrency(row.currentValue as number, row.currency)}
                              </td>
                              <td className="p-2 align-top text-foreground dark:text-muted-foreground">
                                {row.notes || <span className="text-muted-foreground">-</span>}
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

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-muted-foreground hover:bg-secondary dark:hover:bg-slate-700 transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={handleImport}
                disabled={validRows.length === 0 || importing}
                className="bg-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground px-4 py-2 rounded-lg transition-colors"
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
