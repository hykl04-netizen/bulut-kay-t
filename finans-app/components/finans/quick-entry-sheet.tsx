'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { formatTRY } from '@/lib/currency';

/**
 * Hızlı kayıt — alt menünün ortasındaki "+" düğmesinin açtığı panel.
 *
 * TASARIM KARARI: tutar alanı en üstte ve BÜYÜK. Bir harcamayı kaydederken
 * kullanıcının kafasındaki tek şey rakamdır; kategori ve tarih ikincildir.
 * Uzun form yerine üç alan: tutar, tür, kategori. Tarih varsayılan olarak
 * bugün — kullanıcıların %90'ında doğru olan değer sorulmaz.
 *
 * Bu panel gerçek kaydetme işini `onSave` ile dışarı devreder; demo modunda
 * hiçbir şey kaydedilmez.
 */

export interface QuickEntryCategory {
  name: string;
  color: string;
  type: 'gelir' | 'gider';
}

interface QuickEntrySheetProps {
  open: boolean;
  onClose: () => void;
  categories: QuickEntryCategory[];
  onSave?: (input: { amount: number; type: 'gelir' | 'gider'; category: string }) => Promise<void>;
  /** Demo modunda kaydetme yerine bilgilendirme gösterir. */
  demoMode?: boolean;
}

export function QuickEntrySheet({
  open,
  onClose,
  categories,
  onSave,
  demoMode = false,
}: QuickEntrySheetProps) {
  const [type, setType] = useState<'gelir' | 'gider'>('gider');
  const [raw, setRaw] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const amount = Number(raw.replace(/[^\d]/g, '')) || 0;
  const visibleCats = categories.filter((c) => c.type === type);

  const reset = () => {
    setRaw('');
    setCategory(null);
    setDone(false);
  };

  const handleSave = async () => {
    if (amount <= 0 || !category) return;
    setSaving(true);
    try {
      if (demoMode) {
        await new Promise((r) => setTimeout(r, 450));
        setDone(true);
        setTimeout(() => {
          reset();
          onClose();
        }, 1100);
      } else {
        await onSave?.({ amount, type, category });
        reset();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Hızlı kayıt">
      {done ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Demo modunda kayıt yapılmaz — gerçek hesapta {formatTRY(amount)} tutarındaki bu kayıt
          anında listeye düşerdi.
        </p>
      ) : (
        <div className="space-y-5">
          {/* Tür — segment denetimi, pill filtre değil */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(['gider', 'gelir'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  setCategory(null);
                }}
                aria-pressed={type === t}
                className={`rounded-lg py-2 text-sm font-medium transition ${ type === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground' }`}
              >
                {t === 'gider' ? 'Harcama' : 'Gelir'}
              </button>
            ))}
          </div>

          {/* Tutar — ekranın en büyük öğesi */}
          <div className="text-center">
            <label htmlFor="hizli-tutar" className="text-xs text-muted-foreground">
              Tutar
            </label>
            <div className="mt-1 flex items-baseline justify-center gap-1">
              <span className="text-2xl font-medium text-muted-foreground">₺</span>
              <input
                id="hizli-tutar"
                inputMode="numeric"
                autoComplete="off"
                value={raw}
                onChange={(e) => setRaw(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="0"
                className="w-40 bg-transparent text-center text-4xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/40"
              />
            </div>
          </div>

          {/* Kategori */}
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Kategori</p>
            <div className="flex flex-wrap gap-1.5">
              {visibleCats.map((c) => {
                const active = category === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setCategory(c.name)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${ active ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:bg-muted' }`}
                  >
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={amount <= 0 || !category || saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {amount > 0 ? `${formatTRY(amount)} kaydet` : 'Kaydet'}
          </button>

          <p className="text-center text-xs text-muted-foreground">Tarih: bugün — sonradan düzenlenebilir</p>
        </div>
      )}
    </Sheet>
  );
}
