/**
 * Raporlama (Faz 8) için veri toplama/gruplama yardımcıları.
 * Sayfa bileşenlerini sade tutmak amacıyla saf fonksiyonlar olarak ayrıldı.
 */

export type ReportTransaction = {
  id: string;
  type: 'gelir' | 'gider';
  amount: number;
  date: string; // 'YYYY-MM-DD'
  category_id: string | null;
  category?: { name: string; color: string } | null;
};

export type ReportInvestment = {
  id: string;
  asset_type: string;
  quantity: number;
  current_price: number | null;
};

export type MonthlyCashFlow = {
  month: string; // 'YYYY-MM'
  monthLabel: string;
  gelir: number;
  gider: number;
  net: number;
};

export type CumulativeNetPoint = {
  month: string;
  monthLabel: string;
  cumulative: number;
};

export type DistributionSlice = {
  name: string;
  value: number;
  color: string;
};

const MONTH_LABELS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  const idx = parseInt(month, 10) - 1;
  return `${MONTH_LABELS_TR[idx] ?? month} '${year.slice(2)}`;
}

/** 'YYYY-MM' anahtarını bir sonraki aya ilerletir (yıl sınırını doğru geçer). */
function nextMonthKey(key: string): string {
  const [year, month] = key.split('-').map(Number);
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  return `${next.y}-${String(next.m).padStart(2, '0')}`;
}

/**
 * `map`'te bulunan en erken ile en geç ay arasındaki tüm ayları (veri olmayanlar
 * dahil, sıfır değerle) üretir. Bu olmadan grafik yalnızca işlem bulunan ayları
 * yan yana gösterir ve aradaki boşlukları (ör. hiç işlem girilmemiş aylar) gizler.
 */
function fillMonthGaps(map: Map<string, { gelir: number; gider: number }>): MonthlyCashFlow[] {
  const keys = Array.from(map.keys()).sort();
  if (keys.length === 0) return [];

  const result: MonthlyCashFlow[] = [];
  let cursor = keys[0];
  const last = keys[keys.length - 1];

  while (cursor <= last) {
    const v = map.get(cursor) ?? { gelir: 0, gider: 0 };
    result.push({
      month: cursor,
      monthLabel: monthLabel(cursor),
      gelir: v.gelir,
      gider: v.gider,
      net: v.gelir - v.gider,
    });
    cursor = nextMonthKey(cursor);
  }

  return result;
}

/** Gelir/Gider işlemlerini aya göre gruplar (8.1 — Nakit akışı grafiği için).
 * Veri olmayan aylar da sıfır değerle listeye eklenir, böylece "son 12 ay" gerçekten
 * ardışık 12 takvim ayını ifade eder — aradaki boş aylar grafikte gizlenmez. */
export function aggregateMonthlyCashFlow(transactions: ReportTransaction[]): MonthlyCashFlow[] {
  const map = new Map<string, { gelir: number; gider: number }>();

  for (const t of transactions) {
    if (!t.date) continue;
    const key = monthKey(t.date);
    const entry = map.get(key) ?? { gelir: 0, gider: 0 };
    if (t.type === 'gelir') entry.gelir += t.amount;
    else entry.gider += t.amount;
    map.set(key, entry);
  }

  return fillMonthGaps(map);
}

/**
 * Aylık nakit akışının kümülatif (birikimli) toplamı (8.2 — Net değer zaman çizelgesi için).
 * Not: Uygulamada varlık/yatırım değerlerinin geçmiş anlık görüntüsü (snapshot) tutulmadığı için
 * gerçek "net değer" (varlıklar + yatırımlar - borçlar) zaman içindeki değişimi hesaplanamıyor.
 * Bunun yerine, kaydedilen gelir-gider işlemlerinin zaman içindeki birikimli bakiyesi gösteriliyor;
 * bu, nakit pozisyonunuzdaki trendi yansıtan bir yaklaşıklamadır, tam net değer değildir.
 */
export function aggregateCumulativeNet(monthly: MonthlyCashFlow[]): CumulativeNetPoint[] {
  let running = 0;
  return monthly.map((m) => {
    running += m.net;
    return { month: m.month, monthLabel: m.monthLabel, cumulative: running };
  });
}

export type CashFlowForecastPoint = {
  month: string;
  monthLabel: string;
  gelir: number | null;
  gider: number | null;
  gelirTahmin: number | null;
  giderTahmin: number | null;
};

/**
 * Geçmiş aylık nakit akışına dayanarak gelecek ayları tahmin eder (basit
 * hareketli ortalama — son `windowSize` ayın ortalaması alınır). Grafik
 * gerçek ve tahmini serileri aynı eksende ayrı renklerle gösterebilsin diye
 * gerçek son ay hem `gelir/gider` hem `gelirTahmin/giderTahmin` alanlarında
 * tekrarlanır (çizgilerin kopuk görünmemesi için bağlantı noktası).
 */
export function projectCashFlow(
  monthly: MonthlyCashFlow[],
  monthsAhead = 3,
  windowSize = 3
): CashFlowForecastPoint[] {
  const actual: CashFlowForecastPoint[] = monthly.map((m) => ({
    month: m.month,
    monthLabel: m.monthLabel,
    gelir: m.gelir,
    gider: m.gider,
    gelirTahmin: null,
    giderTahmin: null,
  }));

  if (monthly.length === 0) return actual;

  const recent = monthly.slice(-windowSize);
  const avgGelir = recent.reduce((sum, m) => sum + m.gelir, 0) / recent.length;
  const avgGider = recent.reduce((sum, m) => sum + m.gider, 0) / recent.length;

  // Son gerçek noktayı tahmin serisine de ekleyip çizgiyi birbirine bağlıyoruz.
  const last = actual[actual.length - 1];
  last.gelirTahmin = last.gelir;
  last.giderTahmin = last.gider;

  const forecast: CashFlowForecastPoint[] = [];
  let cursor = monthly[monthly.length - 1].month;
  for (let i = 0; i < monthsAhead; i++) {
    cursor = nextMonthKey(cursor);
    forecast.push({
      month: cursor,
      monthLabel: monthLabel(cursor),
      gelir: null,
      gider: null,
      gelirTahmin: Math.round(avgGelir),
      giderTahmin: Math.round(avgGider),
    });
  }

  return [...actual, ...forecast];
}


const ASSET_TYPE_LABELS_TR: Record<string, string> = {
  hisse: 'Hisse',
  doviz: 'Döviz',
  kripto: 'Kripto',
  fon: 'Fon',
  altin: 'Altın',
};

const ASSET_TYPE_COLORS: Record<string, string> = {
  hisse: '#3b82f6',
  doviz: '#10b981',
  kripto: '#f59e0b',
  fon: '#a855f7',
  altin: '#eab308',
};

const FALLBACK_COLOR = '#94a3b8';

/**
 * Yatırımları varlık türüne göre gruplar (8.3 — Portföy dağılım grafiği için).
 * Not: Güncel fiyatı girilmemiş yatırımlar hesaba katılmaz. Farklı para birimleri
 * dönüştürülmeden doğrudan toplanır (uygulamanın diğer yerlerindeki toplam değer
 * hesaplarıyla tutarlı bir basitleştirme).
 */
export function aggregatePortfolioDistribution(investments: ReportInvestment[]): DistributionSlice[] {
  const map = new Map<string, number>();

  for (const inv of investments) {
    if (inv.current_price === null) continue;
    const value = inv.quantity * inv.current_price;
    map.set(inv.asset_type, (map.get(inv.asset_type) ?? 0) + value);
  }

  return Array.from(map.entries())
    .filter(([, value]) => value > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([type, value]) => ({
      name: ASSET_TYPE_LABELS_TR[type] ?? type,
      value,
      color: ASSET_TYPE_COLORS[type] ?? FALLBACK_COLOR,
    }));
}

/** Gider işlemlerini kategoriye göre gruplar (8.4 — Kategori bazlı harcama kırılımı için). */
export function aggregateExpenseByCategory(transactions: ReportTransaction[]): DistributionSlice[] {
  const map = new Map<string, { value: number; color: string }>();

  for (const t of transactions) {
    if (t.type !== 'gider') continue;
    const name = t.category?.name ?? 'Kategorisiz';
    const color = t.category?.color ?? FALLBACK_COLOR;
    const entry = map.get(name) ?? { value: 0, color };
    entry.value += t.amount;
    map.set(name, entry);
  }

  return Array.from(map.entries())
    .filter(([, v]) => v.value > 0)
    .sort(([, a], [, b]) => b.value - a.value)
    .map(([name, v]) => ({ name, value: v.value, color: v.color }));
}
