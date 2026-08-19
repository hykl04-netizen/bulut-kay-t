// app/(dashboard)/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import {
  Wallet,
  PiggyBank,
  HandCoins,
  CalendarClock,
  AlertTriangle,
  Plus,
  Camera,
  FilePlus2,
  Receipt,
  Target,
  Clock,
  FileText,
} from 'lucide-react';
import { getDueInfo } from '@/lib/due-date';
import { buildBudgetRows, BudgetRow } from '@/lib/budget';
import { getCurrentWorkspaceId, getWorkspaceType } from '@/lib/supabase/workspace';
import { formatTRY } from '@/lib/currency';
import type { WorkspaceType } from '@/lib/workspace-types';
import { BalanceHero } from '@/components/finans/balance-hero';
import { QuickActions, type QuickAction } from '@/components/finans/quick-actions';
import { AccountStrip, type AccountCard } from '@/components/finans/account-strip';
import { StatTile } from '@/components/finans/stat-tile';
import { TransactionList, type TxRow } from '@/components/finans/transaction-list';
import { MonthlyNetChart } from '@/components/finans/monthly-net-chart';
import { CategoryBreakdown } from '@/components/finans/category-breakdown';
import { TableSkeleton, CardGridSkeleton, Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * Özet Paneli — Faz 12'de bankacılık uygulaması düzenine geçirildi.
 *
 * ÖNCEKİ SORUN: dört KPI kartı yan yanaydı ve DÖRDÜ DE aynı görsel
 * ağırlıktaydı; göz nereye bakacağını bilmiyordu. Sayfa "yönetici paneli"
 * gibi okunuyordu, ürün gibi değil.
 *
 * ŞİMDİ: tek bir hero sayı lider (sayfada yalnızca bir tane), altında dört
 * yuvarlak hızlı işlem, sonra hesap şeridi, sonra sessizleştirilmiş metrik
 * kutuları. Hareketler tablo değil, tarihe göre gruplanmış liste.
 *
 * Hesap türü panelin içeriğini de değiştiriyor: aile hesabında hero
 * "bu ay elde kalan", işletmede "tahmini net değer".
 */

interface RecentTransaction {
  id: string;
  type: 'gelir' | 'gider';
  description: string | null;
  date: string;
  amount: number;
  try_equivalent?: number | null;
  category_id?: string | null;
  categories?: { name: string; color?: string } | null;
}

interface UpcomingPayment {
  id: string;
  kind: 'fatura' | 'borc';
  title: string;
  amount: number;
  dueDate: string;
  href: string;
}

interface SummaryData {
  totalTransactionsIncome: number;
  totalTransactionsExpense: number;
  totalInvestments: number;
  totalAssets: number;
  totalOpenDebts: number;
  /** Kesilmiş ama tahsil edilmemiş fatura toplamı (taslak/iptal/ödendi hariç). */
  openInvoicesTotal: number;
  /** Bunlardan vadesi geçmiş olanların sayısı. */
  overdueInvoiceCount: number;
  recentTransactions: RecentTransaction[];
  upcomingPayments: UpcomingPayment[];
  overBudgetRows: BudgetRow[];
  accounts: AccountCard[];
  monthlyIncome: number[];
  monthlyExpense: number[];
  netTrend: number[];
  categorySlices: { label: string; value: number }[];
}

const EMPTY: SummaryData = {
  totalTransactionsIncome: 0,
  totalTransactionsExpense: 0,
  totalInvestments: 0,
  totalAssets: 0,
  totalOpenDebts: 0,
  openInvoicesTotal: 0,
  overdueInvoiceCount: 0,
  recentTransactions: [],
  upcomingPayments: [],
  overBudgetRows: [],
  accounts: [],
  monthlyIncome: [],
  monthlyExpense: [],
  netTrend: [],
  categorySlices: [],
};

/** Son 12 ayın gelir/gider serisi + kümülatif net seyir. */
function buildSeries(txs: RecentTransaction[], today: Date) {
  const income = new Array(12).fill(0);
  const expense = new Array(12).fill(0);
  const firstMonth = new Date(today.getFullYear(), today.getMonth() - 11, 1);

  for (const t of txs) {
    const d = new Date(`${t.date}T00:00:00`);
    if (d < firstMonth) continue;
    const idx = (d.getFullYear() - firstMonth.getFullYear()) * 12 + (d.getMonth() - firstMonth.getMonth());
    if (idx < 0 || idx > 11) continue;
    const amount = Number(t.try_equivalent ?? t.amount);
    if (t.type === 'gelir') income[idx] += amount;
    else expense[idx] += amount;
  }

  const netTrend: number[] = [];
  let cumulative = 0;
  for (let i = 0; i < 12; i++) {
    cumulative += income[i] - expense[i];
    netTrend.push(cumulative);
  }
  return { income, expense, netTrend };
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>('sirket');
  const [summary, setSummary] = useState<SummaryData>(EMPTY);

  const fetchDashboardData = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const workspaceId = await getCurrentWorkspaceId(user.id);
    const wsType = await getWorkspaceType(workspaceId);
    setWorkspaceType(wsType);

    // 1. Gelir-Giderler
    const { data: txData } = await supabase
      .from('transactions')
      .select('*, categories(name, color)')
      .eq('workspace_id', workspaceId)
      .order('date', { ascending: false });

    let income = 0;
    let expense = 0;
    if (txData) {
      txData.forEach((tx) => {
        // Döviz cinsinden işlemler için TL karşılığını (try_equivalent) kullan;
        // TRY işlemlerde bu zaten amount'a eşittir.
        const tryAmount = Number(tx.try_equivalent ?? tx.amount);
        if (tx.type === 'gelir') income += tryAmount;
        else expense += tryAmount;
      });
    }

    // 2. Yatırımlar
    const { data: invData } = await supabase
      .from('investments')
      .select('*')
      .eq('workspace_id', workspaceId);

    let investmentsTotal = 0;
    (invData ?? []).forEach((inv) => {
      investmentsTotal += Number(inv.quantity) * Number(inv.current_price || inv.avg_cost || 0);
    });

    // 3. Varlıklar
    const { data: assetData } = await supabase
      .from('assets')
      .select('*')
      .eq('workspace_id', workspaceId);

    let assetsTotal = 0;
    (assetData ?? []).forEach((ast) => {
      assetsTotal += Number(ast.current_value || 0);
    });

    // 4. Borçlar
    const { data: debtData } = await supabase
      .from('debts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'acik');

    let debtsTotal = 0;
    (debtData ?? []).forEach((d) => {
      if (d.direction === 'alacak') debtsTotal += Number(d.amount);
      else debtsTotal -= Number(d.amount);
    });

    // 4b. Tahsil edilmemiş faturalar.
    //
    // Bu rakam paneldeydi EKSİKTİ: bir işletme için "kestim ama tahsil
    // etmedim" tutarı, yatırım portföyünden çok daha kritik. Yatırımcı
    // demosunda gösteriliyordu ama gerçek panel bunu hiç sorgulamıyordu.
    // Taslak henüz alacak değil, iptal ve ödenmiş olanlar da sayılmaz.
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    const { data: openInvData } = await supabase
      .from('invoices')
      .select('total, due_date')
      .eq('workspace_id', workspaceId)
      .eq('status', 'gonderildi');

    let openInvoicesTotal = 0;
    let overdueInvoiceCount = 0;
    (openInvData ?? []).forEach((inv) => {
      openInvoicesTotal += Number(inv.total ?? 0);
      const due = (inv as { due_date: string | null }).due_date;
      if (due && new Date(`${due}T23:59:59`) < bugun) overdueInvoiceCount += 1;
    });

    // 4a. Banka/kasa hesapları — hesap şeridi için.
    const { data: accountData } = await supabase
      .from('bank_accounts')
      .select('id, name, bank_name, current_balance, currency')
      .eq('workspace_id', workspaceId);

    const accounts: AccountCard[] = (accountData ?? []).map((a) => ({
      id: a.id as string,
      name: a.name as string,
      bankName: (a.bank_name as string | null) ?? null,
      balance: Number(a.current_balance ?? 0),
      currency: (a.currency as string) ?? 'TRY',
      kind: a.bank_name ? 'banka' : 'kasa',
    }));

    // 4b. Bildirim tercihleri — Yaklaşan Ödemeler / Bütçe Aşımları widget'larının
    // açık/kapalı olması ve yaklaşan ödemeler ufku (gün) burada belirlenir.
    const { data: notifPrefs } = await supabase
      .from('notification_preferences')
      .select('show_upcoming_payments, upcoming_days_threshold, show_budget_alerts')
      .eq('user_id', user.id)
      .maybeSingle();

    const showUpcomingPayments = notifPrefs?.show_upcoming_payments ?? true;
    const upcomingDaysThreshold = notifPrefs?.upcoming_days_threshold ?? 30;
    const showBudgetAlerts = notifPrefs?.show_budget_alerts ?? true;

    // 5. Yaklaşan Ödemeler — ödenmemiş faturalar + açık borçlar (alacaklar hariç).
    const { data: billData } = showUpcomingPayments
      ? await supabase
          .from('bills')
          .select('id, title, amount, due_date')
          .eq('workspace_id', workspaceId)
          .eq('status', 'odenmedi')
          .not('due_date', 'is', null)
      : { data: [] as { id: string; title: string; amount: number; due_date: string }[] };

    const horizon = new Date();
    horizon.setHours(0, 0, 0, 0);
    horizon.setDate(horizon.getDate() + upcomingDaysThreshold);

    const upcomingFromBills: UpcomingPayment[] = (billData ?? [])
      .filter((b) => b.due_date && new Date(b.due_date + 'T00:00:00') <= horizon)
      .map((b) => ({
        id: `fatura-${b.id}`,
        kind: 'fatura' as const,
        title: b.title,
        amount: Number(b.amount),
        dueDate: b.due_date as string,
        href: '/fatura-masraf',
      }));

    const upcomingFromDebts: UpcomingPayment[] = !showUpcomingPayments
      ? []
      : (debtData ?? [])
          .filter(
            (d) => d.direction === 'borc' && d.due_date && new Date(d.due_date + 'T00:00:00') <= horizon
          )
          .map((d) => ({
            id: `borc-${d.id}`,
            kind: 'borc' as const,
            title: d.counterparty,
            amount: Number(d.amount),
            dueDate: d.due_date as string,
            href: '/borc-alacak',
          }));

    const upcomingPayments = [...upcomingFromBills, ...upcomingFromDebts].sort((a, b) =>
      a.dueDate.localeCompare(b.dueDate)
    );

    // 6. Bütçe aşımları — sadece gider kategorileri ve bu ayki harcamalar.
    const { data: budgetData } = await supabase
      .from('budgets')
      .select('category_id, monthly_limit')
      .eq('workspace_id', workspaceId);

    const { data: giderCategories } = await supabase
      .from('categories')
      .select('id, name, color')
      .eq('workspace_id', workspaceId)
      .eq('type', 'gider');

    const overBudgetRows =
      showBudgetAlerts && budgetData && giderCategories
        ? buildBudgetRows(
            giderCategories,
            budgetData.map((b) => ({
              category_id: b.category_id,
              monthly_limit: Number(b.monthly_limit),
            })),
            (txData ?? []).map((t) => ({
              type: t.type,
              amount: Number(t.amount),
              date: t.date,
              category_id: t.category_id,
            }))
          ).filter((r) => r.tone === 'over')
        : [];

    // 7. Seriler ve bu ayki kategori dağılımı — hepsi zaten çekilmiş
    // işlemlerden türetiliyor, ek sorgu yok.
    const today = new Date();
    const { income: mIncome, expense: mExpense, netTrend } = buildSeries(
      (txData ?? []) as RecentTransaction[],
      today
    );

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const byCategory = new Map<string, number>();
    (txData ?? []).forEach((t) => {
      if (t.type !== 'gider') return;
      if (new Date(`${t.date}T00:00:00`) < monthStart) return;
      const name = t.categories?.name ?? 'Kategorisiz';
      byCategory.set(name, (byCategory.get(name) ?? 0) + Number(t.try_equivalent ?? t.amount));
    });
    const categorySlices = [...byCategory.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    setSummary({
      totalTransactionsIncome: income,
      totalTransactionsExpense: expense,
      totalInvestments: investmentsTotal,
      totalAssets: assetsTotal,
      totalOpenDebts: debtsTotal,
      openInvoicesTotal,
      overdueInvoiceCount,
      recentTransactions: txData ? (txData.slice(0, 9) as RecentTransaction[]) : [],
      upcomingPayments,
      overBudgetRows,
      accounts,
      monthlyIncome: mIncome,
      monthlyExpense: mExpense,
      netTrend,
      categorySlices,
    });

    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchDashboardData();
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-3 h-12 w-64" />
          <Skeleton className="mt-4 h-11 w-72" />
        </div>
        <CardGridSkeleton count={4} />
        <TableSkeleton rows={6} columns={3} />
      </div>
    );
  }

  const isAile = workspaceType === 'aile';
  const today = new Date();

  const netWorth =
    summary.totalTransactionsIncome -
    summary.totalTransactionsExpense +
    summary.totalInvestments +
    summary.totalAssets;

  const last = summary.monthlyIncome.length - 1;
  const thisMonthNet = last >= 0 ? summary.monthlyIncome[last] - summary.monthlyExpense[last] : 0;
  const prevMonthNet = last >= 1 ? summary.monthlyIncome[last - 1] - summary.monthlyExpense[last - 1] : 0;
  const thisMonthIncome = last >= 0 ? summary.monthlyIncome[last] : 0;
  const thisMonthExpense = last >= 0 ? summary.monthlyExpense[last] : 0;
  const prevMonthIncome = last >= 1 ? summary.monthlyIncome[last - 1] : 0;
  const prevMonthExpense = last >= 1 ? summary.monthlyExpense[last - 1] : 0;

  const ratio = (now: number, before: number): number | null =>
    before === 0 ? null : now / before - 1;

  const heroValue = isAile ? thisMonthNet : netWorth;
  const heroLabel = isAile ? 'Bu ay elde kalan' : 'Tahmini net değer';
  const heroChange = isAile ? ratio(thisMonthNet, prevMonthNet) : null;

  const accountsTotal = summary.accounts.reduce((s, a) => s + a.balance, 0);

  const quickActions: QuickAction[] = isAile
    ? [
        { label: 'Harcama ekle', icon: Plus, href: '/gelir-gider', primary: true },
        { label: 'Gelir ekle', icon: Receipt, href: '/gelir-gider' },
        { label: 'Fiş çek', icon: Camera, href: '/belgeler' },
        { label: 'Bütçe', icon: Target, href: '/butce' },
      ]
    : [
        { label: 'Fatura kes', icon: FilePlus2, href: '/faturalar/yeni', primary: true },
        { label: 'Gider ekle', icon: Plus, href: '/gelir-gider' },
        { label: 'Fiş çek', icon: Camera, href: '/belgeler' },
        { label: 'Tahsilat', icon: Receipt, href: '/alacaklar' },
      ];

  const txRows: TxRow[] = summary.recentTransactions.map((t) => ({
    id: t.id,
    title: t.description || (t.categories?.name ?? 'Kayıt'),
    subtitle: t.categories?.name ?? null,
    date: t.date,
    amount: Number(t.try_equivalent ?? t.amount),
    direction: t.type,
    accentColor: t.categories?.color ?? null,
    href: '/gelir-gider',
  }));

  const hasAnyData =
    summary.recentTransactions.length > 0 ||
    summary.accounts.length > 0 ||
    summary.totalAssets > 0 ||
    summary.totalInvestments > 0;

  if (!hasAnyData) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={Wallet}
          title="Panelinizi doldurmaya başlayalım"
          description={
            <>
              Henüz kayıt yok. İlk gelir veya giderinizi eklediğiniz anda burada özet, grafik ve
              yaklaşan ödemeler görünmeye başlar.
            </>
          }
          action={
            <Link
              href="/gelir-gider"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              İlk kaydı ekle
            </Link>
          }
        />
        <p className="text-center text-sm text-muted-foreground">
          Nasıl göründüğünü merak ediyorsanız{' '}
          <Link href="/demo" className="text-primary hover:underline">
            örnek verilerle demoyu
          </Link>{' '}
          inceleyebilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero — sayfadaki TEK büyük sayı. */}
      <BalanceHero
        label={heroLabel}
        value={heroValue}
        changeRatio={heroChange}
        changeLabel="geçen aya göre"
        trend={summary.netTrend.length > 1 ? summary.netTrend : undefined}
        caption={
          isAile
            ? summary.accounts.length > 0
              ? `Hesaplarınızdaki toplam ${formatTRY(accountsTotal)}`
              : undefined
            : 'Varlıklar + yatırımlar + nakit akışı'
        }
        actions={<QuickActions actions={quickActions} />}
      />

      {/* Hesap şeridi */}
      {summary.accounts.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">Hesaplar</h2>
          <AccountStrip accounts={summary.accounts} />
        </section>
      )}

      {/* Metrikler — hero'dan bilinçli olarak sessiz */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Bu ay giren"
          value={thisMonthIncome}
          changeRatio={ratio(thisMonthIncome, prevMonthIncome)}
          upIsGood
          trend={summary.monthlyIncome}
          href="/gelir-gider"
        />
        <StatTile
          label="Bu ay çıkan"
          value={thisMonthExpense}
          changeRatio={ratio(thisMonthExpense, prevMonthExpense)}
          upIsGood={false}
          trend={summary.monthlyExpense}
          href="/gelir-gider"
        />
        {isAile ? (
          <>
            <StatTile
              label="Varlıklar"
              value={summary.totalAssets + summary.totalInvestments}
              icon={PiggyBank}
              hint="Birikim, yatırım ve varlıklar"
              href="/varlik"
            />
            <StatTile
              label="Net borç / alacak"
              value={summary.totalOpenDebts}
              icon={HandCoins}
              hint="Kişi bazlı açık bakiyeler"
              href="/borc-alacak"
            />
          </>
        ) : (
          <>
            {/* İşletmede en kritik rakam yatırım portföyü değil, tahsil
                edilmemiş alacak. Yatırımlar zaten "Tahmini net değer"in
                içinde ve menüden tek tıkla erişilebilir. */}
            <StatTile
              label="Tahsil edilmemiş"
              value={summary.openInvoicesTotal}
              icon={FileText}
              hint={
                summary.overdueInvoiceCount > 0
                  ? `${summary.overdueInvoiceCount} fatura vadesi geçmiş`
                  : 'Gönderilmiş, ödenmemiş faturalar'
              }
              hintTone={summary.overdueInvoiceCount > 0 ? 'uyari' : 'notr'}
              href="/alacaklar"
            />
            <StatTile
              label="Net alacak / borç"
              value={summary.totalOpenDebts}
              icon={HandCoins}
              hint="Kişi ve kurum bazlı açık bakiye"
              href="/borc-alacak"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Hareketler */}
        <section className="lg:col-span-3">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Son hareketler</h2>
              <Link href="/gelir-gider" className="text-xs font-medium text-primary hover:underline">
                Tümü →
              </Link>
            </div>
            <TransactionList
              rows={txRows}
              today={today}
              emptyText="Henüz gelir veya gider kaydı yok."
            />
          </div>
        </section>

        <div className="space-y-6 lg:col-span-2">
          {/* Yaklaşan ödemeler */}
          {summary.upcomingPayments.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <CalendarClock aria-hidden className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-semibold text-foreground">Yaklaşan ödemeler</h2>
              </div>
              <ul className="divide-y divide-border">
                {summary.upcomingPayments.slice(0, 5).map((p) => {
                  const due = getDueInfo(p.dueDate, false);
                  const overdue = (due?.days ?? 99) < 0;
                  return (
                    <li key={p.id}>
                      <Link
                        href={p.href}
                        className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted/50"
                      >
                        <span
                          aria-hidden
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ overdue ? 'bg-rose-100 dark:bg-rose-950/50' : 'bg-muted' }`}
                        >
                          {overdue ? (
                            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {due?.label ?? p.dueDate}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                          {formatTRY(p.amount)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Bütçe aşımları */}
          {summary.overBudgetRows.length > 0 && (
            <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/60 dark:bg-rose-950/20">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-rose-800 dark:text-rose-300">
                <AlertTriangle aria-hidden className="h-4 w-4" />
                Bütçe aşımı — {summary.overBudgetRows.length} kategori
              </h2>
              <ul className="mt-3 space-y-1.5">
                {summary.overBudgetRows.slice(0, 4).map((r) => (
                  <li key={r.categoryId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-foreground">{r.categoryName}</span>
                    <span className="shrink-0 tabular-nums text-rose-700 dark:text-rose-400">
                      {formatTRY(r.spent)} / {formatTRY(r.limit)}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/butce"
                className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
              >
                Bütçeyi düzenle →
              </Link>
            </section>
          )}

          {/* Kategori dağılımı */}
          {summary.categorySlices.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Bu ayki giderler — nereye gitti?
              </h2>
              <CategoryBreakdown slices={summary.categorySlices} />
            </section>
          )}
        </div>
      </div>

      {/* Aylık net */}
      {summary.monthlyIncome.some((v) => v > 0) && (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">Aylık net — son 12 ay</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Gelir eksi gider. Yeşil sütun o ay artıda, kırmızı eksidesiniz demek.
            </p>
          </div>
          <MonthlyNetChart
            income={summary.monthlyIncome}
            expense={summary.monthlyExpense}
            endDate={today}
          />
        </section>
      )}
    </div>
  );
}
