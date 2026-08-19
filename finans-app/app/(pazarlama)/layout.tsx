import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { SupportWidget } from '@/components/support-widget';

/**
 * Faz 7 — pazarlama sitesi düzeni.
 *
 * Yol haritası bu sayfaları ayrı bir Next.js projesi olarak öneriyordu; aynı
 * uygulamada tutmayı seçtik çünkü plan bilgileri (lib/plans.ts) ve marka
 * bileşenleri zaten burada — iki yerde ayrı ayrı güncellenmesi gereken fiyat
 * tablosu oluşmasın.
 *
 * Bu grubun altındaki yolların tamamı `lib/supabase/proxy.ts` içindeki
 * PUBLIC_PREFIXES listesine eklendi; oturum gerektirmez.
 */

const NAV = [
  { href: '/urun', label: 'Ürün' },
  { href: '/fiyatlandirma', label: 'Fiyatlandırma' },
  { href: '/sss', label: 'SSS' },
  { href: '/yardim', label: 'Yardım' },
  { href: '/iletisim', label: 'İletişim' },
];

export default function PazarlamaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/urun" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="text-lg font-bold text-foreground">FinansApp</span>
          </Link>

          <nav className="order-3 flex flex-wrap gap-4 text-sm sm:order-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="order-2 flex items-center gap-2 sm:order-3">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Giriş Yap
            </Link>
            <Link
              href="/kayit-ol"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              Ücretsiz Dene
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <SupportWidget />

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} FinansApp</p>
            <nav className="flex flex-wrap gap-4">
              <Link href="/gizlilik" className="hover:text-foreground">
                Gizlilik ve KVKK
              </Link>
              <Link href="/kullanim-sartlari" className="hover:text-foreground">
                Kullanım Şartları
              </Link>
              <Link href="/iletisim" className="hover:text-foreground">
                İletişim
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
