/**
 * Yükleme göstergeleri.
 *
 * Önceki durumda 20+ sayfa düz "Yükleniyor..." metni gösteriyordu ve üç farklı
 * biçim kullanılıyordu (çıplak <p>, spinner + metin, `card-empty-state` kutusu —
 * sonuncusu "veri yok" görünümüyle "veri geliyor" durumunu karıştırıyordu).
 * Bu dosya o üç durumu tek yerde toplar.
 */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-foreground/12 ${className}`} />;
}

interface TableSkeletonProps {
  /** Gösterilecek sahte satır sayısı. */
  rows?: number;
  /** Gösterilecek sahte sütun sayısı. */
  columns?: number;
}

/** DataTable ile aynı çerçeveyi kullanır; içerik gelince zıplama olmaz. */
export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Tablo yükleniyor"
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex gap-4 border-b border-border bg-muted px-4 py-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-border px-4 py-4 last:border-b-0">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              className="h-3.5 flex-1"
              /* İlk sütun genelde ad/başlık; biraz daha uzun görünsün. */
            />
          ))}
        </div>
      ))}
      <span className="sr-only">Yükleniyor…</span>
    </div>
  );
}

/** Kart ızgaraları (özet kutuları, plan kartları) için. */
export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-busy="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-6 w-32" />
          <Skeleton className="mt-4 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-4/5" />
        </div>
      ))}
      <span className="sr-only">Yükleniyor…</span>
    </div>
  );
}

/**
 * Sayfanın tamamı henüz çizilemiyorsa (rol/abonelik bilgisi bekleniyor gibi)
 * kullanılan sade satır. Liste beklenen yerlerde TableSkeleton tercih edin.
 */
export function PageLoading({ label = 'Yükleniyor…' }: { label?: string }) {
  return (
    <div role="status" aria-busy="true" className="flex items-center gap-2 text-muted-foreground">
      <span
        aria-hidden
        className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      {label}
    </div>
  );
}
