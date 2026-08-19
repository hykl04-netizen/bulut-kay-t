'use client';

import { useState } from 'react';
import { Calculator, X } from 'lucide-react';
import { KDV_RATES, calcGrossFromNet, calcNetFromGross } from '@/lib/vat';
import { formatTRY } from '@/lib/currency';

interface KdvCalculatorProps {
  /** Hesaplanan toplamı forma aktarmak için. */
  onApply: (grossAmount: number) => void;
}

export function KdvCalculator({ onApply }: KdvCalculatorProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'net-to-gross' | 'gross-to-net'>('net-to-gross');
  const [inputValue, setInputValue] = useState('');
  const [rate, setRate] = useState<number>(20);

  const parsed = parseFloat(inputValue) || 0;
  const result = mode === 'net-to-gross' ? calcGrossFromNet(parsed, rate) : calcNetFromGross(parsed, rate);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
      >
        <Calculator className="h-3.5 w-3.5" />
        KDV Hesapla
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-border bg-card p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">KDV Hesaplayıcı</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Kapat"
              className="text-muted-foreground hover:text-foreground dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-1 p-1 bg-secondary rounded-lg mb-3 text-xs">
            <button
              type="button"
              onClick={() => setMode('net-to-gross')}
              className={`flex-1 py-1.5 rounded-md transition-colors ${mode === 'net-to-gross' ? 'bg-card shadow-sm font-medium text-foreground' : 'text-muted-foreground'}`}
            >
              KDV Hariç → Dahil
            </button>
            <button
              type="button"
              onClick={() => setMode('gross-to-net')}
              className={`flex-1 py-1.5 rounded-md transition-colors ${mode === 'gross-to-net' ? 'bg-card shadow-sm font-medium text-foreground' : 'text-muted-foreground'}`}
            >
              KDV Dahil → Hariç
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {mode === 'net-to-gross' ? 'KDV Hariç Tutar' : 'KDV Dahil Tutar'}
              </label>
              <input
                type="number"
                step="0.01"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">KDV Oranı</label>
              <div className="flex gap-1.5">
                {KDV_RATES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRate(r)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${ rate === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:opacity-90 ' }`}
                  >
                    %{r}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-muted dark:bg-secondary/40 p-3 text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>KDV Hariç</span>
                <span className="font-medium text-foreground">{formatTRY(result.net)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>KDV Tutarı (%{rate})</span>
                <span className="font-medium text-foreground">{formatTRY(result.kdvAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="font-semibold text-foreground dark:text-white">KDV Dahil Toplam</span>
                <span className="font-bold text-foreground dark:text-white">{formatTRY(result.gross)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onApply(result.gross);
                setOpen(false);
              }}
              disabled={parsed <= 0}
              className="w-full rounded-lg bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground text-xs font-medium py-2 transition-colors"
            >
              Toplamı Tutar Alanına Aktar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
