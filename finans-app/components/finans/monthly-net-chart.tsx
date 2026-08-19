'use client';

import { useState } from 'react';
import { formatTRY } from '@/lib/currency';

/**
 * Aylık net (gelir − gider) sütun grafiği.
 *
 * FORM SEÇİMİ: veri tek bir ölçünün 12 dönemlik seyri VE işareti anlamlı
 * (artı = kâr, eksi = zarar). Bu bir KUTUPLULUK sorusu, o yüzden ıraksayan
 * kodlama: iki kutup + nötr sıfır çizgisi. Tek seri olduğu için lejant yok —
 * başlık neyin çizildiğini zaten söylüyor.
 *
 * İŞARET ÖZELLİKLERİ (sabit):
 *   - sütun ≤24px kalın, yuvarlak veri ucu / sıfır çizgisinde köşeli
 *   - komşu sütunlar arasında yüzey renginde 2px boşluk
 *   - ızgara tek kademe gri, 1px, düz (kesikli değil), geri planda
 *   - her sütuna değil, YALNIZCA uç noktalara etiket
 *   - üzerine gelince ipucu — HTML grafiği etkileşimlidir, bu bir ek değil
 */

interface MonthlyNetChartProps {
  /** 12 aylık gelir. */
  income: number[];
  /** 12 aylık gider. */
  expense: number[];
  /** Son ayın adı — etiketler buradan geriye doğru üretilir. */
  endDate?: Date;
  height?: number;
}

const AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export function MonthlyNetChart({
  income,
  expense,
  endDate = new Date(),
  height = 200,
}: MonthlyNetChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const net = income.map((v, i) => v - expense[i]);
  const labels = net.map((_, i) => {
    const d = new Date(endDate.getFullYear(), endDate.getMonth() - (net.length - 1 - i), 1);
    return { short: AY_KISA[d.getMonth()], full: `${AY_KISA[d.getMonth()]} ${d.getFullYear()}` };
  });

  // Sıfır çizgisi ORANTILI konumlanır. Tüm aylar pozitifken çizgiyi ortaya
  // koymak alanın yarısını boşa harcıyordu; artık sıfır dibe iner ve sütunlar
  // tam yüksekliği kullanır. Karışık işaretli veride çizgi gerçek oranında
  // durur — kâr ve zarar aylarının boyu birbiriyle karşılaştırılabilir kalır.
  const maxPos = Math.max(...net, 0);
  const minNeg = Math.min(...net, 0);
  const span = maxPos - minNeg || 1;
  const labelRoom = 18; // uç etiketleri için üstte/altta pay
  // En uzun sütun tavana yapışmasın: %8 tepe boşluğu bırakılıyor. Sıfır
  // tabanı korunuyor (bar grafiğinde ekseni kırpmak veriyi çarpıtır),
  // yalnızca üstte nefes payı var.
  const plot = (height - labelRoom * 2) * 0.92;
  const zeroY = labelRoom + (maxPos / span) * plot;
  const scale = (v: number) => (v / span) * plot;

  // Uç etiketler: en iyi ve en kötü ay. Aralarında anlamlı fark yoksa
  // (%5'ten az) tek etiket yeter — iki aynı sayı yan yana gürültüdür.
  //
  // ÖNEMLİ: veri dar bir bantta değişince (örn. her ay ~65 bin kâr)
  // sütunlar sıfır tabanlı olduğu için birbirine çok benzer görünür.
  // Bu DOĞRUDUR — "her ay istikrarlı" hikâyesinin ta kendisi — ama
  // okuyucu aralığı göremez. O yüzden bu durumda İKİ uç da etiketlenir.
  const best = net.indexOf(Math.max(...net));
  const worstIdx = net.indexOf(Math.min(...net));
  const spread = net[best] === 0 ? 0 : Math.abs(net[best] - net[worstIdx]) / Math.abs(net[best]);
  const worst = worstIdx !== best && spread > 0.05 ? worstIdx : -1;

  return (
    <div className="relative">
      <div
        className="grid gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${net.length}, minmax(0, 1fr))`, height }}
        onMouseLeave={() => setHover(null)}
      >
        {net.map((v, i) => {
          const h = Math.max(Math.abs(scale(v)), 2);
          const positive = v >= 0;
          const isExtreme = i === best || i === worst;
          return (
            <div
              key={i}
              className="relative cursor-default"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onClick={() => setHover(i)}
              role="presentation"
            >
              {/* sıfır çizgisi — nötr, tek kademe gri, 1px düz */}
              <div
                aria-hidden
                className="absolute inset-x-0 h-px bg-border"
                style={{ top: zeroY }}
              />
              <div
                className="absolute left-1/2 w-full max-w-[24px] -translate-x-1/2 transition-opacity"
                style={{
                  top: positive ? zeroY - h : zeroY,
                  height: h,
                  backgroundColor: positive
                    ? 'var(--color-emerald-600, #059669)'
                    : 'var(--color-rose-600, #e11d48)',
                  // yuvarlak uç dışarıda, sıfır çizgisinde köşeli
                  borderRadius: positive ? '4px 4px 0 0' : '0 0 4px 4px',
                  opacity: hover === null || hover === i ? 1 : 0.45,
                }}
              />
              {/* uç nokta etiketleri — her sütuna değil, yalnızca en iyi/en kötü */}
              {/* Etiket kırpılmaz: ilk ve son sütunda ortalamak yerine
                  kenara yaslanır, böylece grafik kutusunun dışına taşmaz. */}
              {isExtreme && (
                <span
                  className={`pointer-events-none absolute whitespace-nowrap text-[10px] font-medium text-muted-foreground ${
                    i === 0
                      ? 'left-0'
                      : i === net.length - 1
                        ? 'right-0'
                        : 'left-1/2 -translate-x-1/2'
                  }`}
                  style={{
                    // Math.max(0, …): en uzun sütunun etiketi kutunun
                    // dışına çıkıp kırpılıyordu.
                    top: positive ? Math.max(0, zeroY - h - 15) : zeroY + h + 3,
                  }}
                >
                  {formatTRY(v)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div
        className="mt-1.5 grid gap-[2px] text-center text-[10px] text-muted-foreground"
        style={{ gridTemplateColumns: `repeat(${net.length}, minmax(0, 1fr))` }}
      >
        {labels.map((l, i) => (
          <span key={i} className={hover === i ? 'font-semibold text-foreground' : ''}>
            {l.short}
          </span>
        ))}
      </div>

      {/* İpucu için YER AYRILIR. Önce koşullu render ediliyordu; belirdiğinde
          altındaki her şeyi aşağı itiyor, dokunmatikte de parmağın altında
          kalan içeriği örtüyordu. Artık slot her zaman var, yalnızca içeriği
          değişiyor — düzen zıplamıyor. */}
      <div className="mt-3 min-h-[2.25rem]">
        {hover !== null ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-card px-3 py-2 text-xs">
            <span className="font-semibold text-foreground">{labels[hover].full}</span>
            <span className="text-muted-foreground">
              Gelir <strong className="font-medium text-foreground">{formatTRY(income[hover])}</strong>
            </span>
            <span className="text-muted-foreground">
              Gider <strong className="font-medium text-foreground">{formatTRY(expense[hover])}</strong>
            </span>
            <span
              className={
                net[hover] >= 0
                  ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                  : 'font-semibold text-rose-700 dark:text-rose-400'
              }
            >
              Net {formatTRY(net[hover])}
            </span>
          </div>
        ) : (
          <p className="px-1 text-xs text-muted-foreground">
            Bir aya dokunun veya üzerine gelin — o ayın gelir, gider ve net rakamı burada çıkar.
          </p>
        )}
      </div>

      {/* Renk tek başına bilgi taşımasın diye tablo görünümü her zaman erişilebilir. */}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          Sayıları tablo olarak gör
        </summary>
        <table className="mt-2 w-full text-xs">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">Ay</th>
              <th className="py-1 text-right font-medium">Gelir</th>
              <th className="py-1 text-right font-medium">Gider</th>
              <th className="py-1 text-right font-medium">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {net.map((v, i) => (
              <tr key={i}>
                <td className="py-1 text-foreground">{labels[i].full}</td>
                <td className="py-1 text-right tabular-nums text-muted-foreground">{formatTRY(income[i])}</td>
                <td className="py-1 text-right tabular-nums text-muted-foreground">{formatTRY(expense[i])}</td>
                <td className="py-1 text-right font-medium tabular-nums text-foreground">{formatTRY(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
