import { TrendingUp } from 'lucide-react';

interface LogoProps {
  /** Dış sarmalayıcıya eklenecek ek class'lar (konumlandırma vb.) */
  className?: string;
  /** İkon karesinin boyutu. Sidebar'da 'md', auth ekranları gibi daha
   *  vurgulu yerlerde 'lg' kullanılabilir. */
  size?: 'md' | 'lg';
  /** "KURUMSAL FİNANS" alt başlığını gizlemek için (çok dar alanlarda). */
  showSubtitle?: boolean;
}

const ICON_SIZE = {
  md: 'h-10 w-10 rounded-xl',
  lg: 'h-12 w-12 rounded-2xl',
};

const GLYPH_SIZE = {
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const WORDMARK_SIZE = {
  md: 'text-lg',
  lg: 'text-2xl',
};

/**
 * Marka logo lockup'ı: gradyanlı mavi kare içinde yükselen-çizgi ikonu +
 * iki farklı ağırlıkta "finans/app" wordmark'ı + altında "KURUMSAL FİNANS"
 * alt başlığı. Sidebar (Faz 3) ve auth ekranlarında (Faz 7) ortak kullanılır.
 */
export function Logo({ className = '', size = 'md', showSubtitle = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-accent to-brand-navy shadow-sm ${ICON_SIZE[size]}`}
      >
        <TrendingUp className={`${GLYPH_SIZE[size]} text-white`} strokeWidth={2.5} />
      </div>
      <div className="min-w-0 leading-tight">
        <p className={`font-heading truncate text-foreground ${WORDMARK_SIZE[size]}`}>
          <span className="font-medium">finans</span>
          <span className="font-extrabold">app</span>
        </p>
        {showSubtitle && (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Kurumsal Finans
          </p>
        )}
      </div>
    </div>
  );
}
