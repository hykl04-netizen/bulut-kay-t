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
  X,
  DownloadCloud,
  Target,
  Landmark,
  History,
  MonitorSmartphone,
  Building2,
  Lock,
  Keyboard,
  Users,
  CreditCard,
  AlertTriangle,
  Users2,
  FilePlus2,
  Calculator,
  Briefcase,
  LifeBuoy,
  ReceiptText,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { CalculatorWidget } from '@/components/calculator-widget';
import { BackupModal } from '@/components/backup-modal';
import { KeyboardShortcutsModal } from '@/components/keyboard-shortcuts-modal';
import { Logo } from '@/components/logo';
import { WorkspaceSwitcher } from '@/components/workspace-switcher';
import { SupportWidget } from '@/components/support-widget';
import { runRecurringAutomation } from '@/lib/recurring';
import { runRecurringInvoiceAutomation } from '@/lib/recurring-invoices';
import { toast } from '@/components/ui/toaster';
import { useKeyboardShortcut } from '@/lib/use-keyboard-shortcut';
import { useTeamRole } from '@/lib/use-team-role';
import { ROLE_LABELS } from '@/lib/team';
import { getCurrentWorkspaceId, getWorkspaceType } from '@/lib/supabase/workspace';
import { isOnboardingPending } from '@/lib/onboarding';
import { useSubscription } from '@/lib/use-subscription';
import { accessState, hasFeature, trialDaysLeft } from '@/lib/plans';
import { roleLabelFor, type WorkspaceType } from '@/lib/workspace-types';
import { BottomNav, type BottomNavItem } from '@/components/finans/bottom-nav';
import { GeriBildirim } from '@/components/geri-bildirim';
import { MobileTopBar } from '@/components/finans/mobile-top-bar';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  managerOnly?: boolean;
  hideForViewer?: boolean;
  // Kod tabanında duruyor ama tek kullanıcılı hesaplar için kapatıldı.
  // İleride birden fazla kullanıcı gerekirse buradan (ve /ekip sayfası ile
  // /api/ekip route'larındaki aynı bayraktan) tekrar açılabilir.
  disabled?: boolean;
  // Plan bazlı kilit (Faz 3). Bu özellik mevcut planda yoksa menü öğesi
  // kilit rozetiyle görünür ve tıklanınca /abonelik sayfasına götürür.
  // Asıl kısıtlama DB'de (RLS) — bu sadece arayüz göstergesi.
  requiresFeature?: 'bordro';
  /**
   * Faz 11 — bu öğenin görüneceği hesap tipleri. Belirtilmezse her tipte
   * görünür. Aile hesabında "Cari", "Bordro", "Fatura Künyesi" gibi
   * muhasebe terimlerinin GÖRÜNMEMESİ kritik: kullanıcı bunlardan birini
   * görürse uygulamanın kendisi için olmadığına karar veriyor.
   */
  types?: WorkspaceType[];
  /** Aynı ekranın tipe göre farklı adlandırılması (örn. Ekip → Aile Üyeleri). */
  labelByType?: Partial<Record<WorkspaceType, string>>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
  /**
   * Katlanabilir grup. Varsayılan olarak kapalı gelir; kullanıcı o gruptaki bir
   * sayfadayken kendiliğinden açılır. Menüde 25 bağlantı vardı ve tek bir
   * "Kurumsal" başlığı altında 13'ü birden duruyordu — günde bir kez girilen
   * ayar sayfaları, her gün kullanılan Gelir/Gider ile aynı görsel ağırlıktaydı.
   */
  collapsible?: boolean;
  /** Grubun tamamının görüneceği hesap tipleri. */
  types?: WorkspaceType[];
  titleByType?: Partial<Record<WorkspaceType, string>>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Genel',
    items: [
      { href: '/', label: 'Özet Paneli', icon: LayoutDashboard },
      { href: '/gelir-gider', label: 'Gelir/Gider', icon: ArrowRightLeft },
      { href: '/borc-alacak', label: 'Borç/Alacak', icon: HandCoins },
      { href: '/fatura-masraf', label: 'Fatura/Masraf', icon: Receipt },
      { href: '/butce', label: 'Bütçe', icon: Target },
    ],
  },
  {
    // Fatura kesme / cari / alacak takibi yalnızca ticari defterde anlamlı.
    title: 'Satış ve Cari',
    types: ['sirket', 'musavir_ofisi'],
    items: [
      { href: '/faturalar', label: 'Kesilen Faturalar', icon: FilePlus2 },
      { href: '/cariler', label: 'Cariler', icon: Users2 },
      { href: '/alacaklar', label: 'Alacak Yaşlandırma', icon: HandCoins },
    ],
  },
  {
    title: 'Varlıklar',
    items: [
      { href: '/banka-hesaplari', label: 'Banka Hesapları', icon: Landmark },
      { href: '/yatirim', label: 'Yatırımlar', icon: TrendingUp },
      { href: '/varlik', label: 'Varlıklar', icon: PiggyBank },
      {
        href: '/bordro',
        label: 'Bordro/Maaş',
        icon: Wallet,
        hideForViewer: true,
        requiresFeature: 'bordro',
        types: ['sirket', 'musavir_ofisi'],
      },
    ],
  },
  {
    title: 'Raporlar ve Arşiv',
    items: [
      { href: '/raporlar', label: 'Raporlar', icon: BarChart3 },
      { href: '/belgeler', label: 'Belgeler & Arşiv', icon: FileText },
      { href: '/aktivite-gecmisi', label: 'Aktivite Geçmişi', icon: History, types: ['sirket', 'musavir_ofisi'] },
    ],
  },
  {
    title: 'İşletme',
    titleByType: { aile: 'Hesabım' },
    items: [
      { href: '/musterilerim', label: 'Müşterilerim', icon: Briefcase, types: ['sirket', 'musavir_ofisi'] },
      {
        href: '/ekip',
        label: 'Ekip Yönetimi',
        icon: Users,
        managerOnly: true,
        labelByType: { aile: 'Aile Üyeleri' },
      },
      {
        href: '/muhasebeci',
        label: 'Muhasebeci Erişimi',
        icon: Calculator,
        managerOnly: true,
        // KVKK: aile bütçesine mali müşavir erişimi DB tetikleyicisiyle de
        // engelli (bkz. 20260826_workspace_types.sql).
        types: ['sirket', 'musavir_ofisi'],
      },
      { href: '/abonelik', label: 'Abonelik', icon: CreditCard, managerOnly: true },
    ],
  },
  {
    title: 'Ayarlar',
    collapsible: true,
    items: [
      {
        href: '/ayarlar',
        label: 'Şirket Ayarları',
        icon: Building2,
        managerOnly: true,
        labelByType: { aile: 'Hesap Ayarları' },
      },
      {
        href: '/fatura-kunyesi',
        label: 'Fatura Künyesi',
        icon: ReceiptText,
        managerOnly: true,
        types: ['sirket', 'musavir_ofisi'],
      },
      { href: '/kategoriler', label: 'Kategoriler', icon: Tags },
      {
        href: '/donem-kilitleme',
        label: 'Dönem Kilitleme',
        icon: Lock,
        managerOnly: true,
        types: ['sirket', 'musavir_ofisi'],
      },
      { href: '/oturumlar', label: 'Oturum Yönetimi', icon: MonitorSmartphone },
      { href: '/hesabim', label: 'Hesabım ve Verilerim', icon: ShieldCheck },
    ],
  },
];

/**
 * Faz 12 — mobil alt menü sekmeleri.
 *
 * Sol menüdeki 25 bağlantının hepsi telefonda gerekmiyor; günlük kullanılan
 * dört ekran alta iner, gerisi hamburger menüsünde kalır. Dörtten fazla
 * sekme dokunma hedefini 44px'in altına düşürür.
 */
const BOTTOM_NAV: Record<WorkspaceType, BottomNavItem[]> = {
  aile: [
    { href: '/', label: 'Özet', icon: LayoutDashboard },
    { href: '/gelir-gider', label: 'Hareketler', icon: ArrowRightLeft },
    { href: '/butce', label: 'Bütçe', icon: Target },
    { href: '/raporlar', label: 'Rapor', icon: BarChart3 },
  ],
  sirket: [
    { href: '/', label: 'Özet', icon: LayoutDashboard },
    { href: '/gelir-gider', label: 'Hareketler', icon: ArrowRightLeft },
    { href: '/faturalar', label: 'Faturalar', icon: FilePlus2, matchPrefix: true },
    { href: '/cariler', label: 'Cariler', icon: Users2 },
  ],
  musavir_ofisi: [
    { href: '/', label: 'Özet', icon: LayoutDashboard },
    { href: '/musterilerim', label: 'Mükellef', icon: Briefcase },
    { href: '/gelir-gider', label: 'Hareketler', icon: ArrowRightLeft },
    { href: '/raporlar', label: 'Rapor', icon: BarChart3 },
  ],
};

/**
 * Mobil üst çubuğun başlıkları. NAV_GROUPS tek doğruluk kaynağı olduğu
 * için elle ikinci bir liste tutulmuyor — menüde adı değişen ekranın
 * başlığı da kendiliğinden değişir.
 */
function buildTitleMap(type: WorkspaceType): Record<string, string> {
  const map: Record<string, string> = {};
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      map[item.href] = item.labelByType?.[type] ?? item.label;
    }
  }
  // Menüde yeri olmayan alt ekranlar
  map['/faturalar/yeni'] = 'Yeni Fatura';
  map['/kurulum'] = 'Kurulum';
  return map;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Katlanabilir menü gruplarının elle değiştirilmiş durumu (bkz. NAV_GROUPS).
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const { role, loading: roleLoading } = useTeamRole();
  // Faz 11 — aktif hesabın tipi. Yüklenene kadar 'sirket' varsayılır ki
  // menü hiçbir zaman eksik başlayıp sonradan büyümesin (zıplama olmaz);
  // aile hesabında birkaç öğe kaybolur, tersi olsa yeni öğeler belirirdi.
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>('sirket');
  const canManageTeamNav = roleLoading || role === 'sahip' || role === 'yonetici';
  const canViewPayrollNav = roleLoading || !role || role !== 'salt_gorunum';

  // Abonelik durumu (Faz 3) — kilitli modülleri ve uyarı şeridini belirler.
  const { subscription, loading: subLoading } = useSubscription();
  const subState = accessState(subscription);
  const trialLeft = trialDaysLeft(subscription);

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

  // Kurulum sihirbazı (Faz 2) — seçili işletmenin `onboarded_at` alanı boşsa
  // kullanıcı henüz kurulumu bitirmemiş demektir, panele girmeden /kurulum'a
  // yönlendirilir. Bu hem yeni kayıt olan kullanıcılar hem de sol menüden
  // "Yeni İşletme Ekle" ile açılan ikinci/üçüncü işletmeler için çalışır.
  // Migration çalıştırılmamışsa isOnboardingPending false döner — yönlendirme
  // olmaz, eski davranış korunur.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const workspaceId = await getCurrentWorkspaceId(user.id);
      if (cancelled) return;
      const pending = await isOnboardingPending(workspaceId);
      if (!cancelled && pending) {
        router.replace('/kurulum');
        return;
      }
      // Faz 11 — menü filtresi için hesap tipi. Aynı effect içinde okunuyor
      // ki ekstra bir getCurrentWorkspaceId turu daha atılmasın.
      const type = await getWorkspaceType(workspaceId);
      if (!cancelled) setWorkspaceType(type);
    })();
    return () => {
      cancelled = true;
    };
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
      const workspaceId = await getCurrentWorkspaceId(user.id);
      if (cancelled) return;
      // Salt görünüm rolü veri ekleyemez (RLS reddeder) — otomasyonu hiç
      // tetiklemeye gerek yok, yönetici/muhasebeci/sahip giriş yaptığında
      // zaten çalışacak.
      if (roleLoading || role === 'salt_gorunum') return;
      const [result, recurringInvoices] = await Promise.all([
        runRecurringAutomation(workspaceId),
        // Tekrarlayan SATIŞ faturaları (Öneri 10) — taslak olarak üretilir.
        runRecurringInvoiceAutomation(workspaceId),
      ]);
      if (cancelled) return;
      if (recurringInvoices > 0) {
        toast.info(`${recurringInvoices} tekrarlayan fatura taslak olarak oluşturuldu.`);
      }
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
  }, [role, roleLoading]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Sidebar içeriği hem masaüstü hem mobil panelde ortak kullanılıyor
  const navContent = (
    <>
      <div className="p-5 flex flex-col gap-1.5">
        <Logo />
        {!roleLoading && role && role !== 'sahip' && (
          <span className="ml-[3.25rem] w-fit rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            {roleLabelFor(workspaceType, role, ROLE_LABELS[role])}
          </span>
        )}
      </div>

      <div className="pb-3">
        <WorkspaceSwitcher />
      </div>

      <nav className="flex-1 px-3 pb-2 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          // Grup bütünüyle başka bir hesap tipine aitse hiç çizilmez.
          if (group.types && !group.types.includes(workspaceType)) return null;

          const visibleItems = group.items.filter(
            (item) =>
              (!item.managerOnly || canManageTeamNav) &&
              (!item.hideForViewer || canViewPayrollNav) &&
              (!item.types || item.types.includes(workspaceType))
          );
          if (visibleItems.length === 0) return null;

          const groupTitle = group.titleByType?.[workspaceType] ?? group.title;

          // Katlanabilir gruplar: kullanıcı elle açıp kapatmadıysa, o gruptaki
          // bir sayfadaysa açık gelir.
          const hasActiveChild = visibleItems.some((item) => item.href === pathname);
          const isOpen = !group.collapsible || (openGroups[group.title] ?? hasActiveChild);

          return (
            <div key={group.title}>
              {group.collapsible ? (
                <button
                  type="button"
                  onClick={() =>
                    setOpenGroups((prev) => ({ ...prev, [group.title]: !isOpen }))
                  }
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-1 rounded px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 transition hover:text-foreground"
                >
                  {groupTitle}
                  <ChevronDown
                    aria-hidden
                    className={`h-3.5 w-3.5 transition-transform ${isOpen ? '' : '-rotate-90'}`}
                  />
                </button>
              ) : (
                <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {groupTitle}
                </p>
              )}
              <div className={`space-y-0.5 ${isOpen ? '' : 'hidden'}`}>
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  const label = item.labelByType?.[workspaceType] ?? item.label;

                  if (item.disabled) {
                    return (
                      <div
                        key={item.href}
                        title="Tek kullanıcılı hesaplarda kapalı. İleride ihtiyaç olursa tekrar açılabilir."
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground/40 cursor-not-allowed select-none"
                      >
                        <Icon className="w-[18px] h-[18px]" />
                        {label}
                        <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted-foreground/10">
                          Kapalı
                        </span>
                      </div>
                    );
                  }

                  // Plan bazlı kilit — abonelik bilgisi yüklenene kadar
                  // kilitli göstermiyoruz ki menü gözle görülür şekilde zıplamasın.
                  if (item.requiresFeature && !subLoading && !hasFeature(subscription, item.requiresFeature)) {
                    return (
                      <Link
                        key={item.href}
                        href="/abonelik"
                        title="Bu modül Pro ve Kurumsal planlarda kullanılabilir."
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground transition"
                      >
                        <Icon className="w-[18px] h-[18px]" />
                        {label}
                        <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/15 text-accent">
                          Pro
                        </span>
                      </Link>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nav-link px-3 py-2.5 text-sm ${
                        isActive ? 'is-active font-semibold' : 'text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-0.5">
        <ThemeToggle />
        <button
          onClick={() => setIsBackupOpen(true)}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition"
        >
          <DownloadCloud className="w-[18px] h-[18px]" />
          Yedek Al
        </button>
        <Link
          href="/yardim"
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition"
        >
          <LifeBuoy className="w-[18px] h-[18px]" />
          Yardım Merkezi
        </Link>
        {/* Kapalı beta: test kullanıcısının tek iletişim kanalı. Yardımın
            hemen altında duruyor çünkü insan takıldığında önce oraya bakıyor,
            bulamayınca da bir şey söylemek istiyor. */}
        <GeriBildirim />
        <button
          onClick={() => setIsShortcutsOpen(true)}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition"
        >
          <Keyboard className="w-[18px] h-[18px]" />
          Klavye Kısayolları
          <span className="ml-auto text-xs opacity-60">?</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Çıkış Yap
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sol Menü (Sidebar) — masaüstü, md ve üzeri: sayfadan içeride, beyaz/yüzen kart */}
      <aside className="w-72 shrink-0 my-4 ml-4 rounded-2xl border border-border/70 bg-card flex-col hidden md:flex print:hidden shadow-[0_4px_24px_-8px_rgba(27,37,89,0.10)]">
        {navContent}
      </aside>

      {/* Mobil üst çubuk — kök ekranda logo+menü, alt ekranda geri oku +
          başlık. Tam ekran PWA'da tarayıcının geri düğmesi olmadığı için
          uygulamanın kendi geri oku zorunlu. */}
      <MobileTopBar
        rootPaths={BOTTOM_NAV[workspaceType].map((i) => i.href)}
        titles={buildTitleMap(workspaceType)}
        onMenuClick={() => setMobileNavOpen(true)}
      />

      {/* Mobil kayan menü paneli + karartma */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-primary/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative w-72 bg-card text-muted-foreground flex flex-col h-full shadow-xl">
            <button
              onClick={() => setMobileNavOpen(false)}
              aria-label="Menüyü kapat"
              className="absolute top-5 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            {navContent}
          </aside>
        </div>
      )}

      {/* Mobil alt menü — md altında. Hamburger menüsü tam listeyi taşımaya
          devam ediyor; buradaki dört sekme günlük kullanım için. */}
      <div className="md:hidden print:hidden">
        <BottomNav
          items={BOTTOM_NAV[workspaceType]}
          primaryLabel="Hızlı kayıt"
          onPrimaryAction={() => {
            // İKİ YOL BİRDEN gerekiyor:
            //  - Başka bir ekrandaysak router.push ile /gelir-gider'a gidilir
            //    ve orada mount anında ?hizli=1 okunup form açılır.
            //  - ZATEN /gelir-gider'daysak React bileşeni yeniden bağlamaz,
            //    mount effect'i çalışmaz; sadece adres çubuğu değişir ve
            //    düğme hiçbir şey yapmamış gibi görünür. Bu yüzden ayrıca
            //    bir olay yayınlanıyor, sayfa onu dinliyor.
            router.push('/gelir-gider?hizli=1');
            window.dispatchEvent(new CustomEvent('finansapp:hizli-kayit'));
          }}
        />
      </div>

      {/* Ana İçerik Alanı */}
      {/* key={pathname}: React alt ağacı yeniden bağlar, böylece
          .app-page animasyonu her gezinmede baştan oynar. */}
      <main
        key={pathname}
        className="app-page flex-1 overflow-y-auto px-4 pb-24 pt-[4.25rem] sm:px-6 md:p-8 md:pb-8 print:overflow-visible print:p-0 print:pt-0"
      >
        {/* Abonelik uyarı şeridi (Faz 3). Yazma kısıtı asıl olarak RLS'te
            uygulanıyor; bu şerit kullanıcının NEDEN kayıt ekleyemediğini
            görmesini sağlıyor. */}
        {!subLoading && subState !== 'aktif' && (
          <div className="print:hidden mb-4">
            {subState === 'kisitli' && (
              <Link
                href="/abonelik"
                className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 hover:bg-rose-100 transition dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Aboneliğiniz sona erdi.</strong> Verileriniz duruyor ve okunabilir, ancak
                  yeni kayıt ekleyip düzenleyemezsiniz. Devam etmek için bir plan seçin.
                </span>
              </Link>
            )}
            {subState === 'tolerans' && (
              <Link
                href="/abonelik"
                className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100 transition dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Son ödemeniz alınamadı.</strong> Erişiminiz kısa bir süre daha açık —
                  kesinti yaşamamak için ödeme bilginizi güncelleyin.
                </span>
              </Link>
            )}
            {subState === 'deneme' && trialLeft <= 5 && (
              <Link
                href="/abonelik"
                className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 hover:bg-sky-100 transition dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300"
              >
                <CreditCard className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Ücretsiz denemenizin bitmesine <strong>{trialLeft} gün</strong> kaldı. Planları
                  incelemek için tıklayın.
                </span>
              </Link>
            )}
          </div>
        )}
        {children}
      </main>

      {/* Canlı destek widget'ı — yalnızca NEXT_PUBLIC_DESTEK_WIDGET_SRC tanımlıysa yüklenir */}
      <SupportWidget />

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