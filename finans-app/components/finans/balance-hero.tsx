'use client';

import type { ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Sparkline } from './sparkline';
import { formatTRY } from '@/lib/currency';

/**
 * Hero figürü — panelin lider sayısı.
 *
 * Kurallar:
 *   - ≥48px, gövde yazı tipiyle aynı sans (mono/serif DEĞİL — mono rakamlar
 *     büyük puntoda "terminal" gibi okunuyor ve marka dışı duruyor)
 *   - orantılı rakamlar (tabular-nums yalnızca tablo sütunlarında)
 *   - sayfada TEK bir hero olur; diğer her şey ondan küçük
 *
 * "Gizle" düğmesi bilinçli: bankacılık uygulamalarında standart, ve
 * yatırımcı/ekran paylaşımı sırasında gerçek rakamları saklamayı sağlıyor.
 */

interface BalanceHeroProps {
  label: string;
  value: number;
  /** Önceki döneme göre değişim oranı (0.12 = %12 artış). */
  changeRatio?: number | null;
  /** Karşılaştırılan dönemin adı — "geçen aya göre" gibi. */
  changeLabel?: string;
  /** Son 12 dönemin seyri. */
  trend?: number[];
  /** Artış iyi mi? Gider kartlarında false. */
  upIsGood?: boolean;
  caption?: ReactNode;
  actions?: ReactNode;
}

export function BalanceHero({
  label,
  value,
  changeRatio = null,
  changeLabel = 'geçen aya göre',
  trend,
  upIsGood = true,
  caption,
  actions,
}: BalanceHeroProps) {
  const [hidden, setHidden] = useState(false);

  const up = (changeRatio ?? 0) >= 0;
  const good = up === upIsGood;
  const DeltaIcon = up ? ArrowUpRight : ArrowDownRight;

  // Durum rengi ikon + işaretli metinle birlikte gelir; renk tek başına
  // bilgi taşımaz.
  const deltaTone = good
    ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50'
    : 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/50';

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
      {/* Çok hafif bir marka yıkaması — dolgu değil, derinlik. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{label}</p>
            <button
              type="button"
              onClick={() => setHidden((h) => !h)}
              aria-label={hidden ? 'Tutarları göster' : 'Tutarları gizle'}
              className="rounded p-0.5 text-muted-foreground transition hover:text-foreground"
            >
              {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>

          <p className="mt-1.5 text-[2.75rem] font-semibold leading-none tracking-tight text-foreground sm:text-5xl">
            {hidden ? '••••••' : formatTRY(value)}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {changeRatio !== null && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${deltaTone}`}
              >
                <DeltaIcon aria-hidden className="h-3.5 w-3.5" />
                {up ? '+' : '−'}
                {Math.abs(changeRatio * 100).toFixed(1).replace('.', ',')}%
              </span>
            )}
            {changeRatio !== null && (
              <span className="text-xs text-muted-foreground">{changeLabel}</span>
            )}
          </div>

          {caption && <div className="mt-3 text-sm text-muted-foreground">{caption}</div>}
        </div>

        {trend && trend.length > 1 && (
          <Sparkline
            points={trend}
            color="var(--accent)"
            width={140}
            height={48}
            label={`Son ${trend.length} ayın seyri`}
            className="shrink-0"
          />
        )}
      </div>

      {actions && <div className="relative mt-6">{actions}</div>}
    </section>
  );
}
