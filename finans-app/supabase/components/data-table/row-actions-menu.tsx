'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

/**
 * Tablo satırlarındaki "..." (üç nokta) menüsü.
 *
 * Neden Portal kullanıyoruz: Tablo konteynerinde yatay kaydırma için
 * `overflow-x-auto` var. CSS kuralı gereği bir eksende overflow ayarlanınca
 * diğer eksen de görünmez hâle geliyor — bu da `absolute` konumlu menünün
 * özellikle son satırlarda ekran dışında/altta kalıp görünmemesine yol açıyordu.
 * Portal ile menüyü doğrudan <body>'ye, butonun ekran konumuna göre sabit
 * (fixed) konumlandırarak render ediyoruz; böylece hiçbir konteyner onu kesemez.
 */
export function RowActionsMenu({ children }: { children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      // Menü genişliği ~176px (w-44); sağ kenardan taşmasın diye sağa hizalıyoruz.
      setCoords({ top: rect.bottom + 4, left: Math.max(8, rect.right - 176) });
    }
    setOpen(true);
  };

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => close();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => (open ? close() : openMenu())}
        className="p-2 hover:bg-secondary dark:hover:bg-secondary rounded-md transition-colors"
      >
        <MoreHorizontal className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
      </button>
      {open &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={close} />
            <div
              style={{ position: 'fixed', top: coords.top, left: coords.left }}
              className="w-44 bg-card dark:bg-primary border border-border dark:border-border rounded-lg shadow-lg z-50"
            >
              {children(close)}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
