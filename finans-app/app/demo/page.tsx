'use client';

import { useMemo, useState } from 'react';
import {
  Plus,
  Receipt,
  Camera,
  FilePlus2,
  Home,
  Building2,
  Calculator,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  ArrowRightLeft,
  Target,
  BarChart3,
  Users2,
  Briefcase,
} from 'lucide-react';
import { BalanceHero } from '@/components/finans/balance-hero';
import { QuickActions, type QuickAction } from '@/components/finans/quick-actions';
import { AccountStrip } from '@/components/finans/account-strip';
import { StatTile } from '@/components/finans/stat-tile';
import { TransactionList } from '@/components/finans/transaction-list';
import { MonthlyNetChart } from '@/components/finans/monthly-net-chart';
import { CategoryBreakdown } from '@/components/finans/category-breakdown';
import { BottomNav, type BottomNavItem } from '@/components/finans/bottom-nav';
import { QuickEntrySheet } from '@/components/finans/quick-entry-sheet';
import { MobileList } from '@/components/finans/mobile-list';
import { ThemeToggle } from '@/components/theme-toggle';
import { Logo } from '@/components/logo';
import { buildDemoPersonas, DEMO_CLIENTS } from '@/lib/demo/dataset';
import { formatTRY } from '@/lib/currency';
import type { WorkspaceType } from '@/lib/workspace-types';

/**
 * /demo — girişsiz, veritabanısız ürün turu.
 *
 * Üç personayı canlı gösterir. Supabase'e HİÇ dokunmaz; veri bellekte
 * üretilir (bkz. lib/demo/dataset.ts). Bu bilinçli:
 *   - sunumda internet/DB arızası demoyu bozamaz
 *   - yatırımcı "önce kayıt ol" duvarına çarpmaz
 *   - pazarlama sayfasından "Canlı deneyin" ile buraya bağlanır
 *
 * Ekranlar, uygulamanın gerçek bileşenlerini kullanır — burası ayrı bir
 * maket değil, aynı tasarım sisteminin vitrini.
 */

const TYPE_ICONS: Record<WorkspaceType, typeof Home> = {
  aile: Home,
  sirket: Building2,
  musavir_ofisi: Calculator,
};

export default function DemoPage() {
  // Sabit tarih: ekran görüntüsü ve sunum tekrarlanabilir olsun diye
  // gerçek "bugün" kullanılıyor ama veri tohumlu üretiliyor.
  const today = useMemo(() => new Date(), []);
  const personas = useMemo(() => buildDemoPersonas(today), [today]);
  const [activeKey, setActiveKey] = useState('sirket');
  const [entryOpen, setEntryOpen] = useState(false);
  const persona = personas.find((p) => p.key === activeKey) ?? personas[1];

  const isAile = persona.workspaceType === 'aile';
  const isMusavir = persona.workspaceType === 'musavir_ofisi';

  const totalBalance = persona.accounts.reduce((s, a) => s + a.balance, 0);
  const netThisMonth =
    persona.monthlyIncome[persona.monthlyIncome.length - 1] -
    persona.monthlyExpense[persona.monthlyExpense.length - 1];
  const netPrevMonth =
    persona.monthlyIncome[persona.monthlyIncome.length - 2] -
    persona.monthlyExpense[persona.monthlyExpense.length - 2];

  const heroValue = isMusavir ? totalBalance : isAile ? netThisMonth : 186_400 + 74_200;
  const heroChange = isAile ? netThisMonth / netPrevMonth - 1 : 0.082;

  const quickActions: QuickAction[] = isAile
    ? [
        { label: 'Harcama ekle', icon: Plus, primary: true },
        { label: 'Gelir ekle', icon: Receipt },
        { label: 'Fiş çek', icon: Camera },
        { label: 'Bütçe', icon: CalendarClock },
      ]
    : isMusavir
      ? [
          { label: 'Mükellef ekle', icon: Plus, primary: true },
          { label: 'Eksik belge', icon: AlertTriangle },
          { label: 'Dönem özeti', icon: Receipt },
          { label: 'Takvim', icon: CalendarClock },
        ]
      : [
          { label: 'Fatura kes', icon: FilePlus2, primary: true },
          { label: 'Gider ekle', icon: Plus },
          { label: 'Fiş çek', icon: Camera },
          { label: 'Tahsilat', icon: Receipt },
        ];

  const navItems: BottomNavItem[] = isAile
    ? [
        { href: '/demo', label: 'Özet', icon: LayoutDashboard },
        { href: '/demo#hareketler', label: 'Hareketler', icon: ArrowRightLeft },
        { href: '/demo#butce', label: 'Bütçe', icon: Target },
        { href: '/demo#rapor', label: 'Rapor', icon: BarChart3 },
      ]
    : isMusavir
      ? [
          { href: '/demo', label: 'Özet', icon: LayoutDashboard },
          { href: '/demo#musteriler', label: 'Mükellef', icon: Briefcase },
          { href: '/demo#hareketler', label: 'Hareket', icon: ArrowRightLeft },
          { href: '/demo#rapor', label: 'Rapor', icon: BarChart3 },
        ]
      : [
          { href: '/demo', label: 'Özet', icon: LayoutDashboard },
          { href: '/demo#hareketler', label: 'Hareketler', icon: ArrowRightLeft },
          { href: '/demo#faturalar', label: 'Faturalar', icon: FilePlus2 },
          { href: '/demo#cariler', label: 'Cariler', icon: Users2 },
        ];

  // Hızlı kayıt panelinin kategorileri — personanın kendi kategorilerinden.
  const entryCategories = [
    ...persona.categories.slice(0, 6).map((c, i) => ({
      name: c.label,
      color: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7'][i % 6],
      type: 'gider' as const,
    })),
    { name: isAile ? 'Maaş' : 'Satış Geliri', color: '#008300', type: 'gelir' as const },
    { name: 'Diğer Gelir', color: '#1baf7a', type: 'gelir' as const },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Demo şeridi — bunun bir tur olduğunu açıkça söyler. */}
      <div className="border-b border-border bg-accent/10 px-4 py-2 text-center text-xs text-foreground">
        <strong className="font-semibold">Demo modu</strong> — örnek verilerle çalışıyor, kayıt
        gerekmez. Hiçbir veri kaydedilmez.
      </div>

      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {/* Persona seçici — sunumun omurgası: tek tıkla üç ürünü göster. */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Aynı ürün, üç farklı kullanıcı
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {personas.map((p) => {
              const Icon = TYPE_ICONS[p.workspaceType];
              const active = p.key === activeKey;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setActiveKey(p.key)}
                  aria-pressed={active}
                  className={`rounded-xl border p-3 text-left transition ${ active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card hover:bg-muted/50' }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon aria-hidden className="h-4 w-4 text-accent" />
                    <span className="text-sm font-semibold text-foreground">{p.ownerName}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{p.workspaceName}</p>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{persona.pitch}</p>
        </div>

        {/* Hero — sayfada tek büyük sayı */}
        <BalanceHero
          label={persona.heroLabel}
          value={heroValue}
          changeRatio={heroChange}
          changeLabel="geçen aya göre"
          trend={persona.netTrend}
          upIsGood={!isAile ? true : true}
          caption={
            isAile
              ? 'Toplam varlığınız ' + formatTRY(totalBalance)
              : isMusavir
                ? '5 mükellef FinansApp’te aktif, 3’ünde eksik belge var'
                : '2 fatura vadesi geçmiş — hatırlatma tek tıkla gönderilir'
          }
          actions={<QuickActions actions={quickActions} />}
        />

        {/* Hesaplar */}
        {!isMusavir && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-foreground">Hesaplar</h2>
            <AccountStrip accounts={persona.accounts} />
          </section>
        )}

        {/* Metrikler */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {persona.metrics.map((m) => (
            <StatTile
              key={m.label}
              label={m.label}
              value={m.value}
              display={m.display}
              changeRatio={m.changeRatio ?? null}
              upIsGood={m.upIsGood ?? true}
              trend={m.trend}
              hint={m.hint}
            />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Sol: hareketler */}
          <section className="lg:col-span-3">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Son hareketler</h2>
                <span className="text-xs text-muted-foreground">bu ay</span>
              </div>
              <TransactionList rows={persona.transactions.slice(0, 9)} today={today} />
              <div className="border-t border-border px-4 py-2.5 text-center">
                <span className="text-xs font-medium text-primary">Tüm hareketleri gör →</span>
              </div>
            </div>
          </section>

          {/* Sağ: yaklaşanlar + kategori */}
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <CalendarClock aria-hidden className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-semibold text-foreground">
                  {isMusavir ? 'Takip gerektirenler' : 'Yaklaşan ödemeler'}
                </h2>
              </div>
              <ul className="divide-y divide-border">
                {persona.upcoming.map((u) => (
                  <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                    <span
                      aria-hidden
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ u.overdue ? 'bg-rose-100 dark:bg-rose-950/50' : 'bg-muted' }`}
                    >
                      {u.overdue ? (
                        <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{u.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.subtitle}</p>
                    </div>
                    {u.amount > 0 && (
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                        {formatTRY(u.amount)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Bu ayki giderler — nereye gitti?
              </h2>
              <CategoryBreakdown slices={persona.categories} />
            </section>
          </div>
        </div>

        {/* Aylık net */}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">Aylık net — son 12 ay</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Gelir eksi gider. Yeşil sütun o ay kâr, kırmızı zarar demek.
            </p>
          </div>
          <MonthlyNetChart
            income={persona.monthlyIncome}
            expense={persona.monthlyExpense}
            endDate={today}
          />
        </section>

        {/* Müşavir portföyü */}
        {isMusavir && (
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Mükelleflerim</h2>
              <span className="text-xs text-muted-foreground">
                {DEMO_CLIENTS.length} işletme FinansApp’te
              </span>
            </div>
            <MobileList
              chevron
              rows={DEMO_CLIENTS.map((c) => ({
                id: c.id,
                title: c.name,
                subtitle:
                  c.missingDocs === 0
                    ? `Tüm belgeler tamam · son hareket ${c.lastActivity}`
                    : `${c.missingDocs} belge eksik · son hareket ${c.lastActivity}`,
                icon: c.missingDocs === 0 ? CheckCircle2 : AlertTriangle,
                accentColor: c.missingDocs === 0 ? '#059669' : '#b45309',
                value: formatTRY(c.monthlyRevenue),
                valueNote: 'bu ay',
                onClick: () => {},
              }))}
            />
          </section>
        )}

        <footer className="border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Bu bir demo. Gerçek hesabınızı açmak için{' '}
            <a href="/kayit-ol" className="font-medium text-primary hover:underline">
              ücretsiz kayıt olun
            </a>
            .
          </p>
        </footer>
      </main>

      {/* Mobil alt menü — masaüstünde gizli. PWA'yı telefonda uygulama
          gibi hissettiren asıl bileşen. */}
      <BottomNav items={navItems} onPrimaryAction={() => setEntryOpen(true)} />

      <QuickEntrySheet
        open={entryOpen}
        onClose={() => setEntryOpen(false)}
        categories={entryCategories}
        demoMode
      />
    </div>
  );
}
