// app/(dashboard)/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Wallet, TrendingUp, PiggyBank, HandCoins, ArrowUpRight, ArrowDownRight, ShieldCheck, Activity } from 'lucide-react';

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
function formatTRY(value: number) {
  return TRY_FORMATTER.format(value);
}

interface RecentTransaction {
  id: string;
  type: 'gelir' | 'gider';
  description: string | null;
  date: string;
  amount: number;
  categories?: { name: string } | null;
}

interface SummaryData {
  totalTransactionsIncome: number;
  totalTransactionsExpense: number;
  totalInvestments: number;
  totalAssets: number;
  totalOpenDebts: number;
  recentTransactions: RecentTransaction[];
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryData>({
    totalTransactionsIncome: 0,
    totalTransactionsExpense: 0,
    totalInvestments: 0,
    totalAssets: 0,
    totalOpenDebts: 0,
    recentTransactions: [],
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // 1. Gelir-Giderler
    const { data: txData } = await supabase
      .from('transactions')
      .select('*, categories(name, color)')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    let income = 0;
    let expense = 0;
    if (txData) {
      txData.forEach(tx => {
        if (tx.type === 'gelir') income += Number(tx.amount);
        else expense += Number(tx.amount);
      });
    }

    // 2. Yatırımlar
    const { data: invData } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', user.id);

    let investmentsTotal = 0;
    if (invData) {
      invData.forEach(inv => {
        investmentsTotal += Number(inv.quantity) * Number(inv.current_price || inv.avg_cost || 0);
      });
    }

    // 3. Varlıklar
    const { data: assetData } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id);

    let assetsTotal = 0;
    if (assetData) {
      assetData.forEach(ast => {
        assetsTotal += Number(ast.current_value || 0);
      });
    }

    // 4. Borçlar
    const { data: debtData } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'acik');

    let debtsTotal = 0;
    if (debtData) {
      debtData.forEach(d => {
        if (d.direction === 'alacak') debtsTotal += Number(d.amount);
        else debtsTotal -= Number(d.amount);
      });
    }

    setSummary({
      totalTransactionsIncome: income,
      totalTransactionsExpense: expense,
      totalInvestments: investmentsTotal,
      totalAssets: assetsTotal,
      totalOpenDebts: debtsTotal,
      recentTransactions: txData ? txData.slice(0, 5) : [],
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
      <div className="flex h-96 items-center justify-center">
        <div className="text-sm font-medium text-muted-foreground">Özet paneli yükleniyor...</div>
      </div>
    );
  }

  const netWorth = summary.totalTransactionsIncome - summary.totalTransactionsExpense + summary.totalInvestments + summary.totalAssets;

  return (
    <div className="space-y-8">
      {/* Üst Başlık & Yönetici Rozeti */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-foreground">Özet Paneli</h1>
          <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
            Finansal durumunuzun genel görünümü ve son hareketleriniz.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm dark:border-border dark:bg-primary dark:text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Executive Private Terminal</span>
        </div>
      </div>

      {/* Üst İstatistik Kartları (Obsidian / Slate & Zarif Kenarlıklar) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tahmini Net Değer */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition hover:border-border dark:border-border dark:bg-primary">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">Tahmini Net Değer</span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-2xl font-bold tracking-tight text-foreground dark:text-white">{formatTRY(netWorth)}</div>
          <p className="mt-1 text-xs text-muted-foreground">Varlıklar + Yatırımlar + Nakit</p>
        </div>

        {/* Toplam Yatırımlar */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition hover:border-border dark:border-border dark:bg-primary">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">Toplam Yatırımlar</span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-2xl font-bold tracking-tight text-foreground dark:text-white">{formatTRY(summary.totalInvestments)}</div>
          <p className="mt-1 text-xs text-muted-foreground">Hisse ve Altın portföyü</p>
        </div>

        {/* Fiziki Varlıklar */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition hover:border-border dark:border-border dark:bg-primary">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">Fiziki Varlıklar</span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <PiggyBank className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-2xl font-bold tracking-tight text-foreground dark:text-white">{formatTRY(summary.totalAssets)}</div>
          <p className="mt-1 text-xs text-muted-foreground">Araba, Gayrimenkul vb.</p>
        </div>

        {/* Net Alacak / Borç */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition hover:border-border dark:border-border dark:bg-primary">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">Net Alacak / Borç</span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <HandCoins className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-2xl font-bold tracking-tight text-foreground dark:text-white">{formatTRY(summary.totalOpenDebts)}</div>
          <p className="mt-1 text-xs text-muted-foreground">Kişi bazlı açık bakiyeler</p>
        </div>
      </div>

      {/* Son İşlemler Tablosu (Yumuşak Geçişler & Kurumsal Rozetler) */}
      <div className="rounded-2xl border border-border bg-card shadow-sm dark:border-border dark:bg-primary">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 dark:border-border">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-base font-bold text-foreground dark:text-slate-100">Son Gelir ve Giderler</h2>
          </div>
          <span className="text-xs text-muted-foreground">Son 5 Hareket</span>
        </div>

        <div className="p-6">
          {summary.recentTransactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Henüz işlem bulunmuyor.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-border">
              {summary.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3.5 transition hover:bg-muted/50 dark:hover:bg-secondary/30 px-2 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-xl p-2.5 ${
                      tx.type === 'gelir'
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                    }`}>
                      {tx.type === 'gelir' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground dark:text-white">{tx.description || 'Açıklama yok'}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {tx.date} • {tx.categories?.name ? (
                          <span className="font-medium text-muted-foreground dark:text-muted-foreground">
                            {tx.categories.name}
                          </span>
                        ) : 'Kategorisiz'}
                      </div>
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${
                    tx.type === 'gelir' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {tx.type === 'gelir' ? '+' : '-'}{formatTRY(Number(tx.amount))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}