'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft, Menu } from 'lucide-react';
import { Logo } from '@/components/logo';

/**
 * Mobil üst çubuk — native gezinme deseni.
 *
 * NEDEN İKİ FARKLI HAL:
 * Native uygulamalarda üst çubuk sabit değildir. KÖK ekranlarda (alt
 * menüdeki dört sekme) uygulama kimliği görünür: logo + menü. ALT
 * ekranlarda ise geri oku ve o ekranın adı görünür. Kullanıcı "neredeyim
 * ve nasıl geri dönerim" sorusunu düşünmeden bilir.
 *
 * Web'de geri dönmek için tarayıcı düğmesi var ama tam ekran PWA'da
 * (`display: standalone`) o düğme YOK — bu yüzden uygulamanın kendi geri
 * okunu vermesi zorunlu, süs değil.
 */

interface MobileTopBarProps {
  /** Alt menüdeki kök yollar — burada logo + hamburger gösterilir. */
  rootPaths: string[];
  /** Yol → başlık eşlemesi. Bulunamazsa başlık boş bırakılır. */
  titles: Record<string, string>;
  onMenuClick: () => void;
}

export function MobileTopBar({ rootPaths, titles, onMenuClick }: MobileTopBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isRoot = rootPaths.includes(pathname);

  // En uzun eşleşen ön eki seç: /faturalar/yeni → "/faturalar" başlığını
  // alır ama tam eşleşme varsa o kazanır.
  const title =
    titles[pathname] ??
    Object.entries(titles)
      .filter(([href]) => href !== '/' && pathname.startsWith(`${href}/`))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ??
    '';

  return (
    <div className="fixed inset-x-0 top-0 z-40 border-b border-border bg-card/95 backdrop-blur md:hidden print:hidden">
      <div className="safe-top" />
      <div className="flex h-14 items-center gap-1 px-2">
        {isRoot ? (
          <>
            <div className="pl-1">
              <Logo size="md" showSubtitle={false} />
            </div>
            <button
              onClick={onMenuClick}
              aria-label="Menüyü aç"
              className="press touch-target ml-auto rounded-lg p-2.5 text-muted-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => router.back()}
              aria-label="Geri"
              className="press touch-target -ml-1 flex items-center gap-0.5 rounded-lg py-2 pl-1 pr-2 text-accent"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h1 className="min-w-0 flex-1 truncate text-center text-base font-semibold text-foreground">
              {title}
            </h1>
            <button
              onClick={onMenuClick}
              aria-label="Menüyü aç"
              className="press touch-target rounded-lg p-2.5 text-muted-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
