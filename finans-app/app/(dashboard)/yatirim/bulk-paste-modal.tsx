'use client';

import { useMemo, useState } from 'react';
import { X, Check, AlertCircle, ClipboardPaste } from 'lucide-react';
import { parseFlexibleAmount, splitPastedRows } from '@/lib/parsing';
import { toast } from '@/components/ui/toaster';

const ASSET_TYPES = ['hisse', 'doviz', 'kripto', 'fon', 'altin'] as const;
type AssetType = typeof ASSET_TYPES[number];

const assetTypeLabels: Record<AssetType, string> = {
  hisse: 'Hisse',
  doviz: 'Döviz',
  kripto: 'Kripto',
  fon: 'Fon',
  altin: 'Altın',
};

type ParsedRow = {
  lineNumber: number;
  rawCells: string[];
  assetType: AssetType | null;
  symbol: string;
  quantity: number | null;
  avgCost: number | null;
  currentPrice: number | null;
  currency: string;
  errors: string[];
};

type NewInvestmentPayload = {
  workspace_id: string;
  asset_type: AssetType;
  symbol: string;
  quantity: number;
  avg_cost: number | null;
  current_price: number | null;
  currency: string;
  updated_at: string;
};

type Props = {
  workspaceId: string;
  onClose: () => void;
  onImport: (rows: NewInvestmentPayload[]) => Promise<void>;
};

const EXAMPLE = `hisse\tTHYAO\t100\t245,50\t260,00\tTRY
kripto\tBTC\t0.05\t\t\tUSD
doviz\tUSD\t500\t32,10\t\tTRY`;

function buildRows(raw: string): ParsedRow[] {
  const lines = splitPastedRows(raw);

  return lines.map(({ cells, delimiterFound }, idx) => {
    const lineNumber = idx + 1;
    const errors: string[] = [];

    if (!delimiterFound || cells.length < 3) {
      return {
        lineNumber,
        rawCells: cells,
        assetType: null,
        symbol: '',
        quantity: null,
        avgCost: null,
        currentPrice: null,
        currency: 'TRY',
        errors: ['Sütunlar Tab veya ; ile ayrılmalı (en az 3 sütun: Varlık Türü, Sembol, Miktar).'],
      };
    }

    const [rawType, rawSymbol, rawQuantity, rawAvgCost = '', rawCurrentPrice = '', rawCurrency = ''] = cells;

    const normalizedType = rawType.trim().toLowerCase();
    const assetType = (ASSET_TYPES as readonly string[]).includes(normalizedType)
      ? (normalizedType as AssetType)
      : null;
    if (!assetType) {
      errors.push(`Varlık türü "${ASSET_TYPES.join('/')}" olmalı: "${rawType}"`);
    }

    const symbol = rawSymbol.trim().toUpperCase();
    if (!symbol) errors.push('Sembol boş olamaz.');

    const quantity = parseFlexibleAmount(rawQuantity);
    if (quantity === null || quantity <= 0) errors.push(`Miktar geçersiz: "${rawQuantity}"`);

    let avgCost: number | null = null;
    if (rawAvgCost.trim()) {
      avgCost = parseFlexibleAmount(rawAvgCost);
      if (avgCost === null) errors.push(`Ort. maliyet geçersiz: "${rawAvgCost}"`);
    }

    let currentPrice: number | null = null;
    if (rawCurrentPrice.trim()) {
      currentPrice = parseFlexibleAmount(rawCurrentPrice);
      if (currentPrice === null) errors.push(`Güncel fiyat geçersiz: "${rawCurrentPrice}"`);
    }

    const currency = rawCurrency.trim() ? rawCurrency.trim().toUpperCase() : 'TRY';

    return { lineNumber, rawCells: cells, assetType, symbol, quantity, avgCost, currentPrice, currency, errors };
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
      const payload: NewInvestmentPayload[] = validRows.map((r) => ({
        workspace_id: workspaceId,
        asset_type: r.assetType as AssetType,
        symbol: r.symbol,
        quantity: r.quantity as number,
        avg_cost: r.avgCost,
        current_price: r.currentPrice,
        currency: r.currency,
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
              {result.success} yatırım başarıyla eklendi.
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
              <span className="font-medium text-foreground dark:text-muted-foreground">Varlık Türü ({ASSET_TYPES.join('/')}), Sembol, Miktar, Ort. Maliyet (opsiyonel), Güncel Fiyat (opsiyonel), Para Birimi (opsiyonel, varsayılan TRY)</span>.
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
                        <th className="p-2 font-medium text-muted-foreground dark:text-muted-foreground">Tür</th>
                        <th className="p-2 font-medium text-muted-foreground dark:text-muted-foreground">Sembol</th>
                        <th className="p-2 font-medium text-muted-foreground dark:text-muted-foreground">Miktar</th>
                        <th className="p-2 font-medium text-muted-foreground dark:text-muted-foreground">Ort. Maliyet</th>
                        <th className="p-2 font-medium text-muted-foreground dark:text-muted-foreground">Güncel Fiyat</th>
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
                              <td className="p-2 align-top text-foreground dark:text-muted-foreground">{assetTypeLabels[row.assetType as AssetType]}</td>
                              <td className="p-2 align-top text-foreground dark:text-muted-foreground">{row.symbol}</td>
                              <td className="p-2 align-top text-foreground dark:text-muted-foreground">
                                {(row.quantity as number).toLocaleString('tr-TR', { maximumFractionDigits: 8 })}
                              </td>
                              <td className="p-2 align-top text-foreground dark:text-muted-foreground">
                                {row.avgCost !== null ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: row.currency }).format(row.avgCost) : <span className="text-muted-foreground dark:text-muted-foreground">-</span>}
                              </td>
                              <td className="p-2 align-top text-foreground dark:text-muted-foreground">
                                {row.currentPrice !== null ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: row.currency }).format(row.currentPrice) : <span className="text-muted-foreground dark:text-muted-foreground">-</span>}
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
