'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

/**
 * Genel mobil liste satırı — telefonda tablonun yerini alır.
 *
 * `TransactionList` para hareketlerine özel (tarihe göre gruplu, +/−
 * işaretli). Bu ise cari, varlık, yatırım, banka hesabı gibi
 * "nesne listeleri" için: sol ikon, başlık, alt başlık, sağda değer.
 *
 * NEDEN AYRI BİR BİLEŞEN: her sayfaya elle mobil düzen yazmak, altı ay
 * sonra altı farklı mobil düzen demek. Tek bileşen = tek davranış.
 *
 * Satır yüksekliği en az 56px — parmakla rahat dokunulacak hedef
 * (Apple/Google 44px öneriyor, liste satırında 56 daha rahat).
 */

export interface MobileListRow {
  id: string;
  title: string;
  subtitle?: ReactNode;
  /** Sağda gösterilen ana değer (genelde tutar). */
  value?: ReactNode;
  /** Değerin altındaki küçük not. */
  valueNote?: ReactNode;
  icon?: LucideIcon;
  /** İkon dairesinin rengi (kategori rengi gibi). */
  accentColor?: string | null;
  /** Sağ üstte küçük rozet — durum göstergesi. */
  badge?: ReactNode;
  href?: string;
  onClick?: () => void;
}

interface MobileListProps {
  rows: MobileListRow[];
  emptyText?: string;
  /** Satır sonunda ok göster (tıklanabilir olduğunu söyler). */
  chevron?: boolean;
}

export function MobileList({ rows, emptyText = 'Kayıt yok.', chevron = true }: MobileListProps) {
  if (rows.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => {
        const Icon = row.icon;
        const interactive = Boolean(row.href || row.onClick);

        const body = (
          <div className="flex min-h-[3.5rem] items-center gap-3 px-4 py-3">
            {Icon && (
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
                  className="h-4 w-4 text-muted-foreground"
                  style={row.accentColor ? { color: row.accentColor } : undefined}
                />
              </span>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{row.title}</p>
                {row.badge}
              </div>
              {row.subtitle && (
                <div className="truncate text-xs text-muted-foreground">{row.subtitle}</div>
              )}
            </div>

            {(row.value || row.valueNote) && (
              <div className="shrink-0 text-right">
                {row.value && (
                  <div className="text-sm font-semibold tabular-nums text-foreground">
                    {row.value}
                  </div>
                )}
                {row.valueNote && (
                  <div className="text-xs text-muted-foreground">{row.valueNote}</div>
                )}
              </div>
            )}

            {chevron && interactive && (
              <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground/60" />
            )}
          </div>
        );

        return (
          <li key={row.id}>
            {row.href ? (
              <Link href={row.href} className="block transition active:bg-muted/60">
                {body}
              </Link>
            ) : row.onClick ? (
              <button type="button" onClick={row.onClick} className="w-full text-left transition active:bg-muted/60">
                {body}
              </button>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Mobil listeyi çerçeveleyen kart — sayfalarda tekrar yazılmasın diye. */
export function MobileListCard({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
