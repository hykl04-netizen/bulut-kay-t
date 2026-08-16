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
  Target,
  Landmark,
  History,
  MonitorSmartphone,
  Building2,
  Lock,
  Keyboard,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { CalculatorWidget } from '@/components/calculator-widget';
import { BackupModal } from '@/components/backup-modal';
import { KeyboardShortcutsModal } from '@/components/keyboard-shortcuts-modal';
import { runRecurringAutomation } from '@/lib/recurring';
import { toast } from '@/components/ui/toaster';
import { useKeyboardShortcut } from '@/lib/use-keyboard-shortcut';

const NAV_ITEMS = [
  { href: '/', label: 'Özet Paneli', icon: LayoutDashboard },
  { href: '/gelir-gider', label: 'Gelir/Gider', icon: ArrowRightLeft },
  { href: '/borc-alacak', label: 'Borç/Alacak', icon: HandCoins },
  { href: '/fatura-masraf', label: 'Fatura/Masraf', icon: Receipt },
  { href: '/banka-hesaplari', label: 'Banka Hesapları', icon: Landmark },
  { href: '/yatirim', label: 'Yatırımlar', icon: TrendingUp },
  { href: '/varlik', label: 'Varlıklar', icon: PiggyBank },
  { href: '/bordro', label: 'Bordro/Maaş', icon: Wallet },
  { href: '/butce', label: 'Bütçe', icon: Target },
  { href: '/aktivite-gecmisi', label: 'Aktivite Geçmişi', icon: History },
  { href: '/oturumlar', label: 'Oturum Yönetimi', icon: MonitorSmartphone },
  { href: '/belgeler', label: 'Belgeler & Arşiv', icon: FileText },
  { href: '/raporlar', label: 'Raporlar', icon: BarChart3 },
  { href: '/kategoriler', label: 'Kategoriler', icon: Tags },
  { href: '/ayarlar', label: 'Şirket Ayarları', icon: Building2 },
  { href: '/donem-kilitleme', label: 'Dönem Kilitleme', icon: Lock },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Global "?" kısayolu: herhangi bir sayfada klavye kısayolları yardımını aç/kapat.
  useKeyboardShortcut('?', () => setIsShortcutsOpen((o) => !o), []);
  // Esc: açık kısayol yardım modalını kapat.
  useKeyboardShortcut('Escape', () => setIsShortcutsOpen(false), [], { enabled: isShortcutsOpen });

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

  // Tekrarlayan fatura/gelir otomasyonu — kullanıcı oturum açıp panele her
  // geldiğinde (sekme/sayfa yenilemede) vadesi geçmiş tekrarlayan kayıtları
  // kontrol edip eksik dönemleri otomatik oluşturur. İşlem idempotent olduğu
  // için tekrar tekrar çalışması sorun yaratmaz.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const result = await runRecurringAutomation(user.id);
      if (cancelled) return;
      const total = result.billsCreated + result.transactionsCreated;
      if (total > 0) {
        toast.info(
          `Tekrarlayan kayıtlar güncellendi: ${result.billsCreated} fatura, ${result.transactionsCreated} gelir/gider kaydı otomatik oluşturuldu.`
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Sidebar içeriği hem masaüstü hem mobil panelde ortak kullanılıyor
  const navContent = (
    <>
      <div className="p-6 flex items-center gap-3 text-white">
        <Wallet className="w-8 h-8 text-brand-gold-light drop-shadow-[0_0_10px_rgba(201,162,39,0.45)]" />
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
              className={`nav-link flex items-center gap-3 pl-5 pr-4 py-3 rounded-lg ${
                isActive ? 'is-active font-semibold' : 'text-muted-foreground'
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
        <button
          onClick={() => setIsShortcutsOpen(true)}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-muted-foreground hover:bg-secondary hover:text-white transition"
        >
          <Keyboard className="w-5 h-5" />
          Klavye Kısayolları
          <span className="ml-auto text-xs opacity-60">?</span>
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
      <aside className="w-64 bg-primary text-muted-foreground flex-col hidden md:flex print:hidden">
        {navContent}
      </aside>

      {/* Mobil üst çubuk — md altında, sidebar'ın yerini alır */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-primary text-white px-4 h-14 md:hidden print:hidden">
        <div className="flex items-center gap-2">
          <Wallet className="w-6 h-6 text-brand-gold-light" />
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
      <main className="flex-1 px-4 pb-4 pt-20 sm:px-6 sm:pb-6 md:p-8 overflow-y-auto print:p-0 print:pt-0 print:overflow-visible">
        {children}
      </main>

      {/* Yüzen Hesap Makinesi */}
      <div className="print:hidden">
        <CalculatorWidget />
      </div>

      {/* Veri Yedekleme Modalı */}
      <div className="print:hidden">
        <BackupModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
      </div>

      {/* Klavye Kısayolları Yardım Modalı ("?" ile açılır) */}
      <div className="print:hidden">
        <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      </div>
    </div>
  );
}