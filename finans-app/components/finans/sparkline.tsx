/**
 * Sparkline — eksensiz, etiketsiz mini trend çizgisi.
 *
 * Görselleştirme kuralları:
 *   - çizgi 2px, yuvarlak uç/birleşim
 *   - alan dolgusu aynı renkte ~%10 opaklık (blok değil, yıkama)
 *   - son nokta işaretçisi ≥8px (r≥4) ve yüzey renginde 2px halka —
 *     çizgiyle kesiştiği yerde okunur kalsın diye
 *   - eksen/ızgara YOK: sparkline bağlam değil, yön gösterir
 *
 * `currentAccent` true iken son segment vurgu renginde çizilir (stat tile
 * sözleşmesindeki "geçmiş sönük, güncel dönem vurgulu" davranışı).
 */

interface SparklineProps {
  /** En az 2 nokta. 12 nokta önerilir (son 12 ay). */
  points: number[];
  color: string;
  /** Yüzey rengi — son nokta halkası bununla çizilir. */
  surface?: string;
  width?: number;
  height?: number;
  /** Alan dolgusunu kapatmak için false. */
  fill?: boolean;
  className?: string;
  /** Ekran okuyucular için tek cümlelik özet. */
  label?: string;
}

export function Sparkline({
  points,
  color,
  surface = 'var(--card)',
  width = 96,
  height = 28,
  fill = true,
  className = '',
  label,
}: SparklineProps) {
  if (points.length < 2) return null;

  const pad = 3; // son nokta işaretçisi kırpılmasın
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;

  const x = (i: number) => pad + (i / (points.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);

  const line = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(2)},${height - pad} L${x(0).toFixed(2)},${height - pad} Z`;

  const lastX = x(points.length - 1);
  const lastY = y(points[points.length - 1]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {fill && <path d={area} fill={color} fillOpacity={0.1} />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={4} fill={color} stroke={surface} strokeWidth={2} />
    </svg>
  );
}
