'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * Alttan açılan panel (bottom sheet).
 *
 * NEDEN MODAL DEĞİL:
 * Ekranın ortasında beliren bir kutu masaüstü deseni. Telefonda parmak
 * ekranın ALTINDA duruyor; içeriğin oradan gelmesi hem erişilebilir hem de
 * "uygulama" hissi veren şey. Geniş ekranda ortalanmış bir panele dönüşür,
 * yani tek bileşen iki bağlamı da karşılıyor.
 *
 * Erişilebilirlik: Esc kapatır, açıkken arka plan kaydırması durur,
 * role="dialog" + aria-modal.
 */

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Geniş ekranda da alttan gelsin (varsayılan: ortalanır). */
  alwaysBottom?: boolean;
}

export function Sheet({ open, onClose, title, children, alwaysBottom = false }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const panelPos = alwaysBottom
    ? 'inset-x-0 bottom-0 rounded-t-2xl'
    : 'inset-x-0 bottom-0 rounded-t-2xl sm:inset-0 sm:m-auto sm:h-fit sm:max-w-lg sm:rounded-2xl';

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={title}>
      <button
        aria-label="Kapat"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 w-full cursor-default bg-black/40 backdrop-blur-[2px]"
      />
      {/* Panel aşağıdan kayarak gelir — native sheet davranışı. Animasyon
          CSS'te; prefers-reduced-motion açıksa kendiliğinden kapanır. */}
      <div
        className={`animate-sheet-up absolute max-h-[85vh] overflow-y-auto border border-border bg-card shadow-2xl ${panelPos}`}
      >
        {/* Sürükleme çubuğu — telefonda "bu aşağı çekilebilir" sinyali. */}
        <div aria-hidden className="flex justify-center pt-2.5 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>

        {title && (
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">{children}</div>
      </div>
    </div>
  );
}
