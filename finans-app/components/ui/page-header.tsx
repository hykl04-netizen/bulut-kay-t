import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Sayfa başlıkları için ortak yerleşim.
 *
 * Başlık boyutu sayfadan sayfaya değişiyordu (text-3xl / text-2xl), ikon kimi
 * yerde vardı kimi yerde yoktu, eylem düğmesi bazen başlığın altına kayıyordu.
 * Tek bileşende toplanınca hepsi aynı hizaya geldi.
 */
interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Sağda duran birincil eylem(ler). Dar ekranda alta iner. */
  actions?: ReactNode;
}

export function PageHeader({ icon: Icon, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon aria-hidden className="h-6 w-6 shrink-0 text-accent" />}
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        </div>
        {description && (
          <div className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</div>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
