import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Ortak "henüz kayıt yok" görünümü.
 *
 * Önceden yalnızca 11 sayfada vardı ve her biri farklı yazılmıştı (kimi kesikli
 * çerçeve, kimi dolu kart, kimi tek satır metin). Aynı boşluk her yerde aynı
 * görünsün diye tek bileşende toplandı.
 */
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  /** Kullanıcıya bir sonraki adımı söyleyin — boş kutu tek başına yardımcı olmaz. */
  description?: ReactNode;
  /** Genelde bir "Ekle" düğmesi ya da bağlantı. */
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-10 text-center">
      {Icon && (
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted">
          <Icon aria-hidden className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <div className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</div>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
