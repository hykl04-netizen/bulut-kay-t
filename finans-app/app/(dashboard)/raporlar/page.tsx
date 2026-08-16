'use client';

import { useEffect, useState } from 'react';
import { ReportShareButton } from '@/components/report-share-button';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/lib/supabase/client';
import { useIsDarkMode } from '@/lib/use-is-dark-mode';
import {
  aggregateMonthlyCashFlow,
  aggregateCumulativeNet,
  aggregatePortfolioDistribution,
  aggregateExpenseByCategory,
  ReportTransaction,
  ReportInvestment,
} from '@/lib/reports';

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });

function formatTRY(value: number) {
  return TRY_FORMATTER.format(value);
}

function tooltipValueFormatter(value: unknown) {
  const num = Array.isArray(value) ? Number(value[0]) : Number(value);
  return Number.isFinite(num) ? formatTRY(num) : String(value ?? '');
}

function ChartCard({ id, title, subtitle, children, empty }: { id: string; title: string; subtitle?: string; children: React.ReactNode; empty: boolean }) {
  return (
    <div id={id} className="bg-card dark:bg-primary rounded-xl shadow-sm border border-border dark:border-border p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground dark:text-foreground">{title}</h2>
        <ReportShareButton targetElementId={id} reportTitle={title} />
      </div>
      {subtitle && <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1 mb-4">{subtitle}</p>}
      {empty ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground dark:text-muted-foreground text-sm">
          Gösterilecek yeterli veri yok.
        </div>
      ) : (
        <div className="h-72 mt-2">{children}</div>
      )}
    </div>
  );
}

export default function RaporlarPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<ReportTransaction[]>([]);
  const [investments, setInvestments] = useState<ReportInvestment[]>([]);
  const isDark = useIsDarkMode();

  // recharts SVG renklerini Tailwind dark: sınıflarıyla değil doğrudan prop
  // olarak alır, bu yüzden temaya göre elle seçiyoruz.
  const gridStroke = isDark ? '#334155' : '#e2e8f0';
  const tickFill = isDark ? '#94a3b8' : '#64748b';
  const lineStroke = isDark ? '#f1f5f9' : '#0f172a';
  const tooltipContentStyle = isDark
    ? { backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', borderRadius: 8 }
    : undefined;
  const tooltipLabelStyle = { color: isDark ? '#f1f5f9' : '#0f172a' };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [txRes, invRes] = await Promise.all([
        supabase.from('transactions').select('*, category:categories(name, color)').order('date', { ascending: true }),
        supabase.from('investments').select('*'),
      ]);

      if (!txRes.error && txRes.data) setTransactions(txRes.data as unknown as ReportTransaction[]);
      else if (txRes.error) console.error('Rapor için işlem verisi çekme hatası:', txRes.error.message);

      if (!invRes.error && invRes.data) setInvestments(invRes.data as ReportInvestment[]);
      else if (invRes.error) console.error('Rapor için yatırım verisi çekme hatası:', invRes.error.message);

      setLoading(false);
    };

    fetchAll();
  }, []);

  const monthlyCashFlow = aggregateMonthlyCashFlow(transactions).slice(-12);
  const cumulativeNet = aggregateCumulativeNet(monthlyCashFlow);
  const portfolioDistribution = aggregatePortfolioDistribution(investments);
  const expenseByCategory = aggregateExpenseByCategory(transactions).slice(0, 8);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Raporlar</h1>
          <p className="text-muted-foreground dark:text-muted-foreground mt-1">Finansal durumunuzun grafiklerle özeti.</p>
        </div>
        <div className="bg-card dark:bg-primary rounded-xl shadow-sm border border-border dark:border-border p-6 flex items-center justify-center h-40">
          <p className="text-muted-foreground dark:text-muted-foreground">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Raporlar</h1>
        <p className="text-muted-foreground dark:text-muted-foreground mt-1">Finansal durumunuzun grafiklerle özeti.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          id="chart-cash-flow"
          title="Nakit Akışı"
          subtitle="Aylık gelir ve gider karşılaştırması (son 12 ay)."
          empty={monthlyCashFlow.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyCashFlow} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 12, fill: tickFill }} />
              <YAxis tick={{ fontSize: 12, fill: tickFill }} tickFormatter={(v) => formatTRY(v)} width={80} />
              <Tooltip formatter={tooltipValueFormatter} labelStyle={tooltipLabelStyle} contentStyle={tooltipContentStyle} />
              <Legend />
              <Bar dataKey="gelir" name="Gelir" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gider" name="Gider" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          id="chart-cumulative-net"
          title="Nakit Bakiyesi Zaman Çizelgesi"
          subtitle="Kaydedilen gelir-gider işlemlerinin birikimli bakiyesi (son 12 ay). Varlık/yatırım değerlerini içermez."
          empty={cumulativeNet.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumulativeNet} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 12, fill: tickFill }} />
              <YAxis tick={{ fontSize: 12, fill: tickFill }} tickFormatter={(v) => formatTRY(v)} width={80} />
              <Tooltip formatter={tooltipValueFormatter} labelStyle={tooltipLabelStyle} contentStyle={tooltipContentStyle} />
              <Line type="monotone" dataKey="cumulative" name="Birikimli Bakiye" stroke={lineStroke} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          id="chart-portfolio"
          title="Portföy Dağılımı"
          subtitle="Güncel fiyatı girilmiş yatırımların varlık türüne göre dağılımı."
          empty={portfolioDistribution.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={portfolioDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                {portfolioDistribution.map((slice) => (
                  <Cell key={slice.name} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip formatter={tooltipValueFormatter} contentStyle={tooltipContentStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          id="chart-expense-category"
          title="Kategori Bazlı Harcamalar"
          subtitle="Giderlerin kategorilere göre kırılımı (ilk 8 kategori)."
          empty={expenseByCategory.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={expenseByCategory} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis type="number" tick={{ fontSize: 12, fill: tickFill }} tickFormatter={(v) => formatTRY(v)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: tickFill }} width={100} />
              <Tooltip formatter={tooltipValueFormatter} contentStyle={tooltipContentStyle} />
              <Bar dataKey="value" name="Harcama" radius={[0, 4, 4, 0]}>
                {expenseByCategory.map((slice) => (
                  <Cell key={slice.name} fill={slice.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
