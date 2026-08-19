'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Sparkline } from './sparkline';
import { formatTRY } from '@/lib/currency';

/**
 * Stat tile — tek bir sayının kutusu.
 *
 * Sözleşme: etiket (cümle düzeni, iki nokta yok) · değer · değişim
 * (işaretli, adı konmuş bir döneme göre) · trend (12 noktalı sparkline).
 *
 * Eski panelde dört kart yan yanaydı ve DÖRDÜ DE aynı görsel ağırlıktaydı —
 * göz nereye bakacağını bilmiyordu. Artık hero tek başına lider; bu kutular
 * bilinçli olarak ondan küçük ve sessiz.
 */

interface StatTileProps {
  label: string;
  value: number;
  /** Para değilse ham metin bas. */
  display?: string;
  icon?: LucideIcon;
  changeRatio?: number | null;
  changeLabel?: string;
  /** Artış iyi mi? Gider/borç kutularında false. */
  upIsGood?: boolean;
  trend?: number[];
  /** Kutu tıklanabilirse hedef. */
  href?: string;
  hint?: string;
}

export function StatTile({
  label,
  value,
  display,
  icon: Icon,
  changeRatio = null,
  changeLabel = 'geçen ay',
  upIsGood = true,
  trend,
  href,
  hint,
}: StatTileProps) {
  const up = (changeRatio ?? 0) >= 0;
  const good = up === upIsGood;
  const DeltaIcon = up ? ArrowUpRight : ArrowDownRight;
  const deltaTone = good
    ? 'text-emerald-700 dark:text-emerald-400'
    : 'text-rose-700 dark:text-rose-400';

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && <Icon aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </div>

      {/* Metin bir değer ("Kira / Aidat") para tutarıyla aynı puntoda
          taşıyordu; sayısal olmayan gösterimlerde bir kademe küçültülür. */}
      <p
        className={`mt-2 font-semibold tracking-tight text-foreground ${
          display && !/^[₺\d]/.test(display) ? 'text-lg leading-snug' : 'text-2xl'
        }`}
      >
        {display ?? formatTRY(value)}
      </p>

      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {changeRatio !== null ? (
            <p className={`flex items-center gap-1 text-xs font-medium ${deltaTone}`}>
              <DeltaIcon aria-hidden className="h-3 w-3 shrink-0" />
              {up ? '+' : '−'}
              {Math.abs(changeRatio * 100).toFixed(1).replace('.', ',')}%
              <span className="font-normal text-muted-foreground">{changeLabel}</span>
            </p>
          ) : (
            hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>
          )}
        </div>

        {trend && trend.length > 1 && (
          <Sparkline
            points={trend}
            color="var(--muted-foreground)"
            width={72}
            height={24}
            fill={false}
            className="shrink-0 opacity-70"
          />
        )}
      </div>
    </>
  );

  const shell =
    'rounded-xl border border-border bg-card p-4 transition';

  if (href) {
    return (
      <Link href={href} className={`${shell} block hover:border-accent/40 hover:bg-muted/40`}>
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}
