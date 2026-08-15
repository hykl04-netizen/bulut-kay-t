// app/(dashboard)/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Wallet, TrendingUp, ArrowRightLeft, Receipt, HandCoins, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
function formatTRY(value: number) {
  return TRY_FORMATTER.format(value);
}

interface SummaryData {
  totalTransactionsIncome: number;
  totalTransactionsExpense: number;
  totalInvestments: number;
  totalAssets: number;
  totalOpenDebts: number;
  recentTransactions: any[];
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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

  if (loading) {
    return <div className="py-12 text-center text-slate-400">Özet paneli yükleniyor...</div>;
  }

  const netWorth = summary.totalTransactionsIncome - summary.totalTransactionsExpense + summary.totalInvestments + summary.totalAssets;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Özet Paneli</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Finansal durumunuzun genel görünümü ve son hareketleriniz.
        </p>
      </div>

      {/* Üst İstatistik Kartları */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Tahmini Net Değer</span>
            <Wallet className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatTRY(netWorth)}</div>
          <div className="mt-1 text-xs text-slate-400">Varlıklar + Yatırımlar + Nakit</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Toplam Yatırımlar</span>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatTRY(summary.totalInvestments)}</div>
          <div className="mt-1 text-xs text-slate-400">Hisse ve Altın portföyü</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Fiziki Varlıklar</span>
            <PiggyBankIcon className="h-5 w-5 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatTRY(summary.totalAssets)}</div>
          <div className="mt-1 text-xs text-slate-400">Araba, Gayrimenkul vb.</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Net Alacak / Borç</span>
            <HandCoins className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatTRY(summary.totalOpenDebts)}</div>
          <div className="mt-1 text-xs text-slate-400">Kişi bazlı açık bakiyeler</div>
        </div>
      </div>

      {/* Son İşlemler Tablosu */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Son Gelir ve Giderler</h2>
        
        {summary.recentTransactions.length === 0 ? (
          <p className="text-sm text-slate-400">Henüz işlem bulunmuyor.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {summary.recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={`rounded-full p-2 ${tx.type === 'gelir' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'}`}>
                    {tx.type === 'gelir' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{tx.description || 'Açıklama yok'}</div>
                    <div className="text-xs text-slate-400">{tx.date} • {tx.categories?.name || 'Kategorisiz'}</div>
                  </div>
                </div>
                <div className={`text-sm font-bold ${tx.type === 'gelir' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {tx.type === 'gelir' ? '+' : '-'}{formatTRY(Number(tx.amount))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PiggyBankIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-3c1-.5 1.5-1.5 2-2.5 1-.5 2-2 2-4 0-2.5-2-4.5-5-4.5z" />
      <path d="M2 9v1c0 1.1.9 2 2 2h1" />
      <path d="M16 11h.01" />
    </svg>
  );
}