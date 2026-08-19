'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

/**
 * Banka tarzı işlem listesi — 6 sütunlu tablonun yerine.
 *
 * NEDEN TABLO DEĞİL:
 * Tablo, sütunları karşılaştırmak için iyidir. Ama kimse "12 Ağustos"u
 * "14 Ağustos"la karşılaştırmıyor; insanlar hareket listesini TARAYARAK
 * okuyor: ne oldu, ne kadar, ne zaman. Bankaların tablo kullanmamasının
 * sebebi bu. Tablo ayrıca telefonda 6 sütunu sığdıramıyor.
 *
 * Tarih gruplaması ("Bugün", "Dün", "12 Ağustos") tarih sütununu ortadan
 * kaldırıyor — aynı bilgi, satır başına bir alan daha az.
 */

export interface TxRow {
  id: string;
  /** Ana satır metni — açıklama ya da cari adı. */
  title: string;
  /** Alt satır — kategori, hesap, not. */
  subtitle?: string | null;
  /** ISO tarih (YYYY-MM-DD). */
  date: string;
  amount: number;
  currency?: string;
  direction: 'gelir' | 'gider';
  /** Kategori rengi — solda küçük nokta olarak. */
  accentColor?: string | null;
  icon?: LucideIcon;
  href?: string;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "Bugün" / "Dün" / "12 Ağustos" / "12 Ağustos 2025" */
function groupLabel(iso: string, today: Date): string {
  const d = new Date(`${iso}T00:00:00`);
  const diffDays = Math.round((startOfDay(today) - startOfDay(d)) / 86_400_000);
  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Dün';
  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

interface TransactionListProps {
  rows: TxRow[];
  /** Testlerde/demoda sabitlemek için. Verilmezse bugünün tarihi. */
  today?: Date;
  /** Grup başlıklarını kapat (kısa listelerde gürültü yapıyor). */
  grouped?: boolean;
  emptyText?: string;
}

export function TransactionList({
  rows,
  today = new Date(),
  grouped = true,
  emptyText = 'Bu aralıkta hareket yok.',
}: TransactionListProps) {
  if (rows.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }

  // Tarihe göre grupla; gelen sıra korunur (çağıran taraf sıralar).
  const groups: { label: string; items: TxRow[] }[] = [];
  for (const row of rows) {
    const label = grouped ? groupLabel(row.date, today) : '';
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(row);
    else groups.push({ label, items: [row] });
  }

  return (
    <div>
      {groups.map((g) => (
        <Fragment key={g.label || 'tek'}>
          {grouped && (
            <p className="sticky top-0 z-10 bg-card/95 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
              {g.label}
            </p>
          )}
          <ul className="divide-y divide-border">
            {g.items.map((row) => {
              const Icon = row.icon ?? (row.direction === 'gelir' ? ArrowDownLeft : ArrowUpRight);
              const isIncome = row.direction === 'gelir';

              const content = (
                <div className="flex items-center gap-3 px-4 py-3">
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted"
                    style={
                      row.accentColor
                        ? { backgroundColor: `color-mix(in srgb, ${row.accentColor} 16%, transparent)` }
                        : undefined
                    }
                  >
                    <Icon
                      className="h-4 w-4"
                      style={row.accentColor ? { color: row.accentColor } : undefined}
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{row.title}</p>
                    {row.subtitle && (
                      <p className="truncate text-xs text-muted-foreground">{row.subtitle}</p>
                    )}
                  </div>

                  {/* Tutar sütunu: hizalı okunması için tabular-nums —
                      hero/stat tile'da orantılı rakam kullanılıyor, burada
                      alt alta geldikleri için tablo rakamı doğru seçim. */}
                  <span
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      isIncome ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
                    }`}
                  >
                    {isIncome ? '+' : '−'}
                    {formatCurrency(Math.abs(row.amount), row.currency ?? 'TRY')}
                  </span>
                </div>
              );

              return (
                <li key={row.id}>
                  {row.href ? (
                    <Link href={row.href} className="block transition hover:bg-muted/50">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        </Fragment>
      ))}
    </div>
  );
}
