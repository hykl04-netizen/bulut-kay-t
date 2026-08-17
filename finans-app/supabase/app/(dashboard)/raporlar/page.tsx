'use client';

import { useEffect, useState } from 'react';
import { FileDown, FileSpreadsheet, Printer, BarChart3, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { ReportShareButton } from '@/components/report-share-button';
import { toast } from '@/components/ui/toaster';
import { exportReportToPDF, exportReportToExcel, type ReportBranding } from '@/lib/report-export';
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
  projectCashFlow,
  compareLastTwoMonths,
  compareYearOverYear,
  PeriodComparison,
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

function ChartCard({
  id,
  title,
  subtitle,
  children,
  empty,
  actions,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  empty: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div id={id} className="print-card bg-card dark:bg-primary rounded-xl shadow-sm border border-border dark:border-border p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-foreground dark:text-foreground">{title}</h2>
        <div className="flex items-center gap-2 print:hidden">
          {actions}
          <ReportShareButton targetElementId={id} reportTitle={title} />
        </div>
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

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground dark:bg-secondary">
        Karşılaştırılamıyor
      </span>
    );
  }
  const rounded = Math.round(pct * 10) / 10;
  if (Math.abs(rounded) < 0.1) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground dark:bg-secondary">
        <Minus className="h-3 w-3" /> Değişim yok
      </span>
    );
  }
  const isUp = rounded > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        isUp
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
      }`}
    >
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      %{Math.abs(rounded).toFixed(1)}
    </span>
  );
}

function ComparisonCard({ title, subtitle, data }: { title: string; subtitle: string; data: PeriodComparison | null }) {
  return (
    <div className="print-card bg-card dark:bg-primary rounded-xl shadow-sm border border-border dark:border-border p-6">
      <h2 className="text-lg font-bold text-foreground dark:text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1 mb-4">{subtitle}</p>
      {data === null ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground dark:text-muted-foreground text-sm text-center px-4">
          Karşılaştırma için yeterli geçmiş veri yok (önceki dönemde kayıt bulunamadı).
        </div>
      ) : (
        <div className="space-y-3">
          {[
            { label: 'Gelir', curr: data.currentGelir, prev: data.previousGelir, pct: data.gelirDeltaPct },
            { label: 'Gider', curr: data.currentGider, prev: data.previousGider, pct: data.giderDeltaPct },
            { label: 'Net', curr: data.currentGelir - data.currentGider, prev: data.previousGelir - data.previousGider, pct: data.netDeltaPct },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 dark:border-border px-4 py-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{row.label}</div>
                <div className="mt-0.5 text-sm text-foreground dark:text-slate-100">
                  <span className="font-bold">{formatTRY(row.curr)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">({data.currentLabel})</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatTRY(row.prev)} <span className="opacity-70">({data.previousLabel})</span>
                </div>
              </div>
              <DeltaBadge pct={row.pct} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RaporlarPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<ReportTransaction[]>([]);
  const [investments, setInvestments] = useState<ReportInvestment[]>([]);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [branding, setBranding] = useState<ReportBranding>({});
  const [expenseChartMode, setExpenseChartMode] = useState<'bar' | 'pie'>('bar');
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
      const { data: { user } } = await supabase.auth.getUser();
      const [txRes, invRes, companyRes] = await Promise.all([
        supabase.from('transactions').select('*, category:categories(name, color)').order('date', { ascending: true }),
        supabase.from('investments').select('*'),
        user
          ? supabase.from('company_settings').select('company_name, logo_data_url').eq('user_id', user.id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (companyRes.data) {
        setBranding({ companyName: companyRes.data.company_name, logoDataUrl: companyRes.data.logo_data_url });
      }

      if (!txRes.error && txRes.data) {
        // Raporlar döviz cinsinden işlemleri de TL karşılığı üzerinden toplar.
        const mapped = (txRes.data as Array<Record<string, unknown>>).map((t) => ({
          ...t,
          amount: Number((t.try_equivalent as number | null) ?? (t.amount as number)),
        }));
        setTransactions(mapped as unknown as ReportTransaction[]);
      }
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
  const cashFlowForecast = projectCashFlow(monthlyCashFlow, 3, 3);
  const monthComparison = compareLastTwoMonths(aggregateMonthlyCashFlow(transactions));
  const yearComparison = compareYearOverYear(transactions);

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await exportReportToPDF({ monthlyCashFlow, expenseByCategory, portfolioDistribution }, branding);
      toast.success('Rapor PDF olarak indirildi.');
    } catch (err) {
      console.error('PDF dışa aktarma hatası:', err);
      toast.error('Rapor PDF olarak oluşturulamadı.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      await exportReportToExcel({ monthlyCashFlow, expenseByCategory, portfolioDistribution });
      toast.success('Rapor Excel olarak indirildi.');
    } catch (err) {
      console.error('Excel dışa aktarma hatası:', err);
      toast.error('Rapor Excel olarak oluşturulamadı.');
    } finally {
      setExportingExcel(false);
    }
  };

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Raporlar</h1>
          <p className="text-muted-foreground dark:text-muted-foreground mt-1">Finansal durumunuzun grafiklerle özeti.</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-border dark:border-border bg-card dark:bg-primary px-4 py-2 text-xs font-medium text-foreground dark:text-slate-200 shadow-sm transition hover:bg-muted dark:hover:bg-secondary"
          >
            <Printer className="h-4 w-4" />
            Yazdır
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="inline-flex items-center gap-2 rounded-xl border border-border dark:border-border bg-card dark:bg-primary px-4 py-2 text-xs font-medium text-foreground dark:text-slate-200 shadow-sm transition hover:bg-muted dark:hover:bg-secondary disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            {exportingPdf ? 'Hazırlanıyor...' : 'PDF İndir'}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="inline-flex items-center gap-2 rounded-xl border border-border dark:border-border bg-card dark:bg-primary px-4 py-2 text-xs font-medium text-foreground dark:text-slate-200 shadow-sm transition hover:bg-muted dark:hover:bg-secondary disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exportingExcel ? 'Hazırlanıyor...' : 'Excel İndir'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1 print:gap-4">
        <ComparisonCard
          title="Bu Ay vs Geçen Ay"
          subtitle="Son iki ayın gelir/gider/net karşılaştırması."
          data={monthComparison}
        />
        <ComparisonCard
          title="Bu Yıl vs Geçen Yıl"
          subtitle="İçinde bulunulan yıl ile bir önceki takvim yılının karşılaştırması."
          data={yearComparison}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1 print:gap-4">
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
          id="chart-cash-flow-forecast"
          title="Nakit Akışı Tahmini"
          subtitle="Son 3 ayın ortalamasına göre önümüzdeki 3 ay için basit projeksiyon (kesikli çizgiler)."
          empty={cashFlowForecast.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cashFlowForecast} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 12, fill: tickFill }} />
              <YAxis tick={{ fontSize: 12, fill: tickFill }} tickFormatter={(v) => formatTRY(v)} width={80} />
              <Tooltip formatter={tooltipValueFormatter} labelStyle={tooltipLabelStyle} contentStyle={tooltipContentStyle} />
              <Legend />
              <Line type="monotone" dataKey="gelir" name="Gelir" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="gider" name="Gider" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="gelirTahmin" name="Gelir (Tahmin)" stroke="#10b981" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="giderTahmin" name="Gider (Tahmin)" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls />
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
          actions={
            <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5 dark:border-border">
              <button
                type="button"
                onClick={() => setExpenseChartMode('bar')}
                aria-label="Çubuk grafik göster"
                title="Çubuk grafik"
                className={`rounded-md p-1.5 transition ${
                  expenseChartMode === 'bar'
                    ? 'bg-primary text-white dark:bg-secondary dark:text-foreground'
                    : 'text-muted-foreground hover:bg-muted dark:text-muted-foreground dark:hover:bg-secondary'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setExpenseChartMode('pie')}
                aria-label="Pasta grafik göster"
                title="Pasta grafik"
                className={`rounded-md p-1.5 transition ${
                  expenseChartMode === 'pie'
                    ? 'bg-primary text-white dark:bg-secondary dark:text-foreground'
                    : 'text-muted-foreground hover:bg-muted dark:text-muted-foreground dark:hover:bg-secondary'
                }`}
              >
                <PieChartIcon className="h-4 w-4" />
              </button>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            {expenseChartMode === 'bar' ? (
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
            ) : (
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {expenseByCategory.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipValueFormatter} contentStyle={tooltipContentStyle} />
                <Legend />
              </PieChart>
            )}
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
