'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  Wallet,
  LayoutDashboard,
  ArrowRightLeft,
  TrendingUp,
  HandCoins,
  Receipt,
  PiggyBank,
  Tags,
  BarChart3,
  FileText,
  LogOut,
  Menu,
  X,
  DownloadCloud,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { CalculatorWidget } from '@/components/calculator-widget';
import { BackupModal } from '@/components/backup-modal';

const NAV_ITEMS = [
  { href: '/', label: 'Özet Paneli', icon: LayoutDashboard },
  { href: '/gelir-gider', label: 'Gelir/Gider', icon: ArrowRightLeft },
  { href: '/borc-alacak', label: 'Borç/Alacak', icon: HandCoins },
  { href: '/fatura-masraf', label: 'Fatura/Masraf', icon: Receipt },
  { href: '/yatirim', label: 'Yatırımlar', icon: TrendingUp },
  { href: '/varlik', label: 'Varlıklar', icon: PiggyBank },
  { href: '/bordro', label: 'Bordro/Maaş', icon: Wallet },
  { href: '/belgeler', label: 'Belgeler & Arşiv', icon: FileText },
  { href: '/raporlar', label: 'Raporlar', icon: BarChart3 },
  { href: '/kategoriler', label: 'Kategoriler', icon: Tags },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  // Sayfa değişince mobil menüyü otomatik kapat.
  // Render sırasında önceki pathname ile karşılaştırıp state'i ayarlıyoruz
  // (useEffect içinde senkron setState yerine React'ın önerdiği "adjusting
  // state when a prop changes" deseni — ekstra render'ı önler).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileNavOpen(false);
  }

  // Asıl oturum koruması artık proxy.ts'te (sunucu tarafı, her istekte
  // çalışır) — bu yüzden burada "yükleniyor" bariyerine gerek yok. Bu
  // listener sadece bir güvenlik ağı: sayfa açıkken token yenileme
  // başarısız olursa ya da başka bir sekmede çıkış yapılırsa kullanıcıyı
  // login'e yönlendirir.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Sidebar içeriği hem masaüstü hem mobil panelde ortak kullanılıyor
  const navContent = (
    <>
      <div className="p-6 flex items-center gap-3 text-white">
        <Wallet className="w-8 h-8" />
        <h2 className="text-xl font-bold">FinansApp</h2>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-secondary text-white'
                  : 'hover:bg-secondary hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-1">
        <ThemeToggle />
        <button
          onClick={() => setIsBackupOpen(true)}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-muted-foreground hover:bg-secondary hover:text-white transition"
        >
          <DownloadCloud className="w-5 h-5" />
          Yedek Al
        </button>
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 hover:bg-secondary transition">
          <LogOut className="w-5 h-5" />
          Çıkış Yap
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-muted dark:bg-primary">
      {/* Sol Menü (Sidebar) — masaüstü, md ve üzeri */}
      <aside className="w-64 bg-primary text-muted-foreground flex-col hidden md:flex">
        {navContent}
      </aside>

      {/* Mobil üst çubuk — md altında, sidebar'ın yerini alır */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-primary text-white px-4 h-14 md:hidden">
        <div className="flex items-center gap-2">
          <Wallet className="w-6 h-6" />
          <span className="font-bold">FinansApp</span>
        </div>
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label="Menüyü aç"
          className="p-2 -mr-2 text-muted-foreground hover:text-white"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobil kayan menü paneli + karartma */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-primary/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative w-64 bg-primary text-muted-foreground flex flex-col h-full shadow-xl">
            <button
              onClick={() => setMobileNavOpen(false)}
              aria-label="Menüyü kapat"
              className="absolute top-4 right-4 text-muted-foreground dark:text-muted-foreground hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            {navContent}
          </aside>
        </div>
      )}

      {/* Ana İçerik Alanı */}
      <main className="flex-1 px-4 pb-4 pt-20 sm:px-6 sm:pb-6 md:p-8 overflow-y-auto">
        {children}
      </main>

      {/* Yüzen Hesap Makinesi */}
      <CalculatorWidget />

      {/* Veri Yedekleme Modalı */}
      <BackupModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
    </div>
  );
}