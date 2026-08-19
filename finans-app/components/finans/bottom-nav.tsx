'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Plus } from 'lucide-react';

/**
 * Mobil alt menü.
 *
 * NEDEN HAMBURGER DEĞİL:
 * PWA'nın "web sitesi gibi duruyor" hissinin tek en büyük sebebi üstteki
 * hamburger menüsüydü. Telefonda başparmak ekranın altına yetişir, üstüne
 * yetişmez; bu yüzden her mobil bankacılık uygulaması alt sekme kullanır.
 * Ayrıca bir dokunuşluk gezinme, iki dokunuşluk menü açmaya göre uygulamayı
 * ölçülebilir biçimde daha çok kullandırır.
 *
 * DÖRT SEKME + ORTADA EYLEM: dörtten fazlası dokunma hedefini 44px'in
 * altına düşürüyor. Beşinci bir sekme gerekirse biri "Daha fazla"ya girer.
 *
 * `env(safe-area-inset-bottom)` iPhone'un alt çubuğunun altında kalmayı önler.
 */

export interface BottomNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Alt yolları da aktif say (örn. /faturalar/yeni). */
  matchPrefix?: boolean;
}

interface BottomNavProps {
  items: BottomNavItem[];
  /** Ortadaki büyük eylem düğmesi. */
  onPrimaryAction?: () => void;
  primaryLabel?: string;
}

export function BottomNav({
  items,
  onPrimaryAction,
  primaryLabel = 'Hızlı kayıt',
}: BottomNavProps) {
  const pathname = usePathname();
  const four = items.slice(0, 4);
  const left = four.slice(0, 2);
  const right = four.slice(2, 4);

  const renderItem = (item: BottomNavItem) => {
    const Icon = item.icon;
    const active = item.matchPrefix
      ? pathname === item.href || pathname.startsWith(`${item.href}/`)
      : pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 transition ${ active ? 'text-accent' : 'text-muted-foreground' }`}
      >
        <Icon aria-hidden className="h-5 w-5 shrink-0" strokeWidth={active ? 2.4 : 1.8} />
        <span className="truncate text-[10px] font-medium leading-tight">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* İçerik alt menünün altında kalmasın diye ayırıcı boşluk. */}
      <div aria-hidden className="h-[4.75rem] lg:hidden" />

      <nav
        aria-label="Ana gezinme"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="relative flex items-stretch px-1 py-1">
          {left.map(renderItem)}

          {/* Ortadaki eylem — sekmelerin üstüne taşar, en büyük dokunma hedefi. */}
          <div className="flex w-16 shrink-0 justify-center">
            <button
              type="button"
              onClick={onPrimaryAction}
              aria-label={primaryLabel}
              className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-95"
            >
              <Plus aria-hidden className="h-6 w-6" strokeWidth={2.5} />
            </button>
          </div>

          {right.map(renderItem)}
        </div>
      </nav>
    </>
  );
}
