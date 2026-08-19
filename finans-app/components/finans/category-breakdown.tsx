'use client';

import { useEffect, useState } from 'react';
import { formatTRY } from '@/lib/currency';
import { foldToOther, seriesColor, MAX_SERIES } from '@/lib/viz/palette';

/**
 * Kategori dağılımı — yatay çubuk.
 *
 * FORM SEÇİMİ: soru "hangi kalem daha büyük?" yani BÜYÜKLÜK karşılaştırması.
 * Bunun doğru formu çubuk; pasta değil. Pasta, 3'ten fazla dilimde açı
 * karşılaştırması istediği için insanların en kötü olduğu işi yaptırır ve
 * etiketleri dışarı taşımak zorunda bırakır. Yatay çubuk kategori adını
 * doğrudan yanına yazdırır — lejant bile gerekmez.
 *
 * 8'den fazla kategori "Diğer"e katlanır; palet DÖNGÜYE SOKULMAZ
 * (bkz. lib/viz/palette.ts — renkler doğrulanmış sırayla sabit).
 */

interface CategoryBreakdownProps {
  slices: { label: string; value: number }[];
  limit?: number;
}

export function CategoryBreakdown({ slices, limit = MAX_SERIES }: CategoryBreakdownProps) {
  // Renk modu, seri renklerinin hangi kademesinin kullanılacağını belirler.
  // Koyu tema <html class="dark"> ile sürüldüğü için DOM'dan okunuyor.
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const read = () => setMode(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const folded = foldToOther(slices, limit);
  const total = folded.reduce((s, x) => s + x.value, 0) || 1;
  const max = Math.max(...folded.map((x) => x.value), 1);

  return (
    <ul className="space-y-3">
      {folded.map((s, i) => {
        const color = s.isOther ? seriesColor(-1, mode) : seriesColor(i, mode);
        const pct = (s.value / total) * 100;
        return (
          <li key={s.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                {/* Kimlik, metnin YANINDAKİ renkli işaretten gelir —
                    metnin kendisi asla seri rengini giymez. */}
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate text-foreground">{s.label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatTRY(s.value)}
                <span className="ml-1.5 text-xs">%{pct.toFixed(0)}</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${(s.value / max) * 100}%`, backgroundColor: color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
