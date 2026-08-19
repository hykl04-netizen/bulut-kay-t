/**
 * Demo veri kümesi — veritabanı GEREKTİRMEZ.
 *
 * NEDEN VAR:
 * 1. Yatırımcı sunumu. Boş bir uygulama sunulamaz; ilk ekran dolu, gerçekçi
 *    ve tutarlı olmak zorunda. Bu veri tamamen bellekte üretildiği için
 *    demo internet ya da Supabase olmadan da çalışır — sunumda kırılmaz.
 * 2. Tasarım. Bileşenleri gerçek şekilli veriyle görmeden tasarlamak kör
 *    çalışmaktır.
 * 3. Yeni kullanıcı. İleride "örnek veriyle gez" akışına aynı kaynak bağlanır.
 *
 * DETERMİNİSTİK: tohumlu üreteç kullanılıyor, Math.random YOK. Aynı gün
 * aynı ekran görüntüsü çıkar — ekran görüntüsü karşılaştırması ve
 * regresyon için gerekli.
 */

import type { TxRow } from '@/components/finans/transaction-list';
import type { AccountCard } from '@/components/finans/account-strip';
import type { WorkspaceType } from '@/lib/workspace-types';

// ---------------------------------------------------------------------------
// Tohumlu üreteç (mulberry32)
// ---------------------------------------------------------------------------
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function jitter(rand: () => number, base: number, spread = 0.18): number {
  return Math.round(base * (1 + (rand() * 2 - 1) * spread));
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

// ---------------------------------------------------------------------------
// Tipler
// ---------------------------------------------------------------------------

export interface DemoCategory {
  name: string;
  color: string;
  type: 'gelir' | 'gider';
}

export interface DemoPersona {
  key: string;
  workspaceName: string;
  workspaceType: WorkspaceType;
  /** Panel hero'sunda görünen etiket. */
  heroLabel: string;
  ownerName: string;
  /** Sunumda anlatılacak tek cümlelik hikâye. */
  pitch: string;
  accounts: AccountCard[];
  transactions: TxRow[];
  /** Son 12 ayın net değeri — hero sparkline'ı. */
  netTrend: number[];
  monthlyIncome: number[];
  monthlyExpense: number[];
  categories: { label: string; value: number }[];
  metrics: DemoMetric[];
  upcoming: DemoUpcoming[];
}

export interface DemoMetric {
  label: string;
  value: number;
  display?: string;
  changeRatio?: number | null;
  upIsGood?: boolean;
  trend?: number[];
  hint?: string;
  href?: string;
}

export interface DemoUpcoming {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  dueDate: string;
  overdue: boolean;
}

// ---------------------------------------------------------------------------
// Aile personası — Ayşe
// ---------------------------------------------------------------------------

const AILE_KATEGORI: DemoCategory[] = [
  { name: 'Maaş', color: '#1baf7a', type: 'gelir' },
  { name: 'Ek Gelir', color: '#008300', type: 'gelir' },
  { name: 'Market', color: '#2a78d6', type: 'gider' },
  { name: 'Kira / Aidat', color: '#eb6834', type: 'gider' },
  { name: 'Faturalar', color: '#eda100', type: 'gider' },
  { name: 'Ulaşım', color: '#e87ba4', type: 'gider' },
  { name: 'Okul / Kurs', color: '#4a3aa7', type: 'gider' },
  { name: 'Sağlık', color: '#e34948', type: 'gider' },
];

function buildAile(today: Date): DemoPersona {
  const rand = rng(20260818);

  const transactions: TxRow[] = [];
  let n = 0;
  const push = (
    dayOffset: number,
    title: string,
    cat: string,
    amount: number,
    direction: 'gelir' | 'gider'
  ) => {
    const c = AILE_KATEGORI.find((k) => k.name === cat);
    transactions.push({
      id: `aile-${n++}`,
      title,
      subtitle: cat,
      date: iso(addDays(today, -dayOffset)),
      amount,
      direction,
      accentColor: c?.color ?? null,
    });
  };

  push(0, 'A101 alışverişi', 'Market', jitter(rand, 1450), 'gider');
  push(0, 'Metro kart yükleme', 'Ulaşım', 400, 'gider');
  push(1, 'Migros', 'Market', jitter(rand, 2380), 'gider');
  push(1, 'Elektrik faturası', 'Faturalar', jitter(rand, 1870), 'gider');
  push(2, 'Eczane', 'Sağlık', jitter(rand, 640), 'gider');
  push(3, 'Benzin', 'Ulaşım', jitter(rand, 2200), 'gider');
  push(4, 'Kız kardeşin kursu', 'Okul / Kurs', 4500, 'gider');
  push(5, 'Maaş — Ağustos', 'Maaş', 96500, 'gelir');
  push(5, 'Ev kirası', 'Kira / Aidat', 28000, 'gider');
  push(6, 'Apartman aidatı', 'Kira / Aidat', 3200, 'gider');
  push(7, 'CarrefourSA', 'Market', jitter(rand, 1980), 'gider');
  push(8, 'İnternet + telefon', 'Faturalar', 1340, 'gider');
  push(9, 'Freelance çeviri', 'Ek Gelir', 12000, 'gelir');
  push(11, 'Su faturası', 'Faturalar', jitter(rand, 720), 'gider');
  push(12, 'Doğalgaz', 'Faturalar', jitter(rand, 2100), 'gider');

  // 12 aylık seyir
  const monthlyIncome: number[] = [];
  const monthlyExpense: number[] = [];
  const netTrend: number[] = [];
  let cumulative = 148000;
  for (let i = 0; i < 12; i++) {
    const inc = jitter(rand, 96500 + i * 900, 0.06) + (i % 4 === 0 ? 12000 : 0);
    const exp = jitter(rand, 78000 + i * 800, 0.1);
    monthlyIncome.push(inc);
    monthlyExpense.push(exp);
    cumulative += inc - exp;
    netTrend.push(cumulative);
  }

  const thisMonthExp = monthlyExpense[11];
  const prevMonthExp = monthlyExpense[10];

  return {
    key: 'aile',
    workspaceName: 'Ailem',
    workspaceType: 'aile',
    heroLabel: 'Bu ay elde kalan',
    ownerName: 'Ayşe Y.',
    pitch:
      'Muhasebe bilmeyen bir kullanıcı. Ayda 15 dakika ayırıyor; ayın 1’inde tek ekranlık özeti okuyor.',
    accounts: [
      { id: 'a1', name: 'Maaş Hesabı', bankName: 'Ziraat Bankası', balance: 84_320, kind: 'banka' },
      { id: 'a2', name: 'Birikim', bankName: 'Enpara', balance: 152_800, kind: 'banka' },
      { id: 'a3', name: 'Nakit', balance: 6_450, kind: 'kasa' },
    ],
    transactions,
    netTrend,
    monthlyIncome,
    monthlyExpense,
    categories: [
      { label: 'Market', value: 24_800 },
      { label: 'Kira / Aidat', value: 31_200 },
      { label: 'Faturalar', value: 9_640 },
      { label: 'Ulaşım', value: 7_300 },
      { label: 'Okul / Kurs', value: 9_000 },
      { label: 'Sağlık', value: 3_180 },
    ],
    metrics: [
      {
        label: 'Bu ay giren',
        value: monthlyIncome[11],
        changeRatio: monthlyIncome[11] / monthlyIncome[10] - 1,
        upIsGood: true,
        trend: monthlyIncome,
      },
      {
        label: 'Bu ay çıkan',
        value: thisMonthExp,
        changeRatio: thisMonthExp / prevMonthExp - 1,
        upIsGood: false,
        trend: monthlyExpense,
      },
      {
        label: 'Birikim',
        value: 152_800,
        changeRatio: 0.043,
        upIsGood: true,
        trend: netTrend,
      },
      {
        label: 'En büyük kalem',
        value: 31_200,
        display: 'Kira / Aidat',
        hint: '31.200 ₺ — giderin %36’sı',
      },
    ],
    upcoming: [
      { id: 'u1', title: 'Kredi kartı ekstresi', subtitle: 'Garanti', amount: 18_400, dueDate: iso(addDays(today, 3)), overdue: false },
      { id: 'u2', title: 'Doğalgaz faturası', subtitle: 'İGDAŞ', amount: 2_180, dueDate: iso(addDays(today, 6)), overdue: false },
      { id: 'u3', title: 'Okul taksiti', subtitle: 'Eylül dönemi', amount: 9_000, dueDate: iso(addDays(today, 12)), overdue: false },
    ],
  };
}

// ---------------------------------------------------------------------------
// İşletme personası — Mehmet'in matbaası
// ---------------------------------------------------------------------------

const SIRKET_KATEGORI: DemoCategory[] = [
  { name: 'Baskı Geliri', color: '#1baf7a', type: 'gelir' },
  { name: 'Tasarım Geliri', color: '#008300', type: 'gelir' },
  { name: 'Kâğıt / Malzeme', color: '#2a78d6', type: 'gider' },
  { name: 'Personel', color: '#4a3aa7', type: 'gider' },
  { name: 'Kira', color: '#eb6834', type: 'gider' },
  { name: 'Faturalar', color: '#eda100', type: 'gider' },
  { name: 'Nakliye', color: '#e87ba4', type: 'gider' },
  { name: 'Vergi / SGK', color: '#e34948', type: 'gider' },
];

function buildSirket(today: Date): DemoPersona {
  const rand = rng(19850612);

  const transactions: TxRow[] = [];
  let n = 0;
  const push = (
    dayOffset: number,
    title: string,
    cat: string,
    amount: number,
    direction: 'gelir' | 'gider'
  ) => {
    const c = SIRKET_KATEGORI.find((k) => k.name === cat);
    transactions.push({
      id: `sirket-${n++}`,
      title,
      subtitle: cat,
      date: iso(addDays(today, -dayOffset)),
      amount,
      direction,
      accentColor: c?.color ?? null,
    });
  };

  push(0, 'Anadolu Ambalaj — FT2026-0184', 'Baskı Geliri', 148_500, 'gelir');
  push(0, 'Kâğıt alımı — Kartonsan', 'Kâğıt / Malzeme', 62_400, 'gider');
  push(1, 'Beyaz Reklam — FT2026-0183', 'Baskı Geliri', 74_200, 'gelir');
  push(1, 'Kargo — Aras', 'Nakliye', 4_850, 'gider');
  push(2, 'Katalog tasarımı', 'Tasarım Geliri', 32_000, 'gelir');
  push(3, 'Elektrik — sanayi tarifesi', 'Faturalar', jitter(rand, 24_600), 'gider');
  push(4, 'Mürekkep ve kalıp', 'Kâğıt / Malzeme', jitter(rand, 38_900), 'gider');
  push(5, 'Personel maaşları — Ağustos', 'Personel', 268_000, 'gider');
  push(5, 'SGK primleri', 'Vergi / SGK', 74_300, 'gider');
  push(6, 'Atölye kirası', 'Kira', 85_000, 'gider');
  push(7, 'Doruk Matbaa — FT2026-0181', 'Baskı Geliri', 96_800, 'gelir');
  push(9, 'KDV ödemesi', 'Vergi / SGK', 112_400, 'gider');
  push(10, 'Ege Tekstil — FT2026-0179', 'Baskı Geliri', 210_000, 'gelir');
  push(12, 'Nakliye — şehir içi', 'Nakliye', 6_200, 'gider');
  push(13, 'Bakım — ofset makine', 'Kâğıt / Malzeme', 18_500, 'gider');

  const monthlyIncome: number[] = [];
  const monthlyExpense: number[] = [];
  const netTrend: number[] = [];
  let cumulative = 620_000;
  for (let i = 0; i < 12; i++) {
    const seasonal = i >= 8 ? 1.18 : 1; // sonbaharda baskı sezonu
    const inc = jitter(rand, (780_000 + i * 14_000) * seasonal, 0.12);
    const exp = jitter(rand, (642_000 + i * 11_000) * seasonal, 0.09);
    monthlyIncome.push(inc);
    monthlyExpense.push(exp);
    cumulative += inc - exp;
    netTrend.push(cumulative);
  }

  return {
    key: 'sirket',
    workspaceName: 'Öz Matbaa Ltd. Şti.',
    workspaceType: 'sirket',
    heroLabel: 'Tahsil edilmemiş alacak',
    ownerName: 'Mehmet K.',
    pitch:
      '6 kişilik matbaa. Muhasebecisine WhatsApp’tan fiş fotoğrafı yolluyordu; şimdi ay sonu özeti otomatik gidiyor.',
    accounts: [
      { id: 's1', name: 'Ticari Hesap', bankName: 'İş Bankası', balance: 428_600, kind: 'banka' },
      { id: 's2', name: 'Vadeli', bankName: 'Yapı Kredi', balance: 750_000, kind: 'banka' },
      { id: 's3', name: 'POS Hesabı', bankName: 'Garanti BBVA', balance: 96_300, kind: 'banka' },
      { id: 's4', name: 'Kasa', balance: 24_800, kind: 'kasa' },
    ],
    transactions,
    netTrend,
    monthlyIncome,
    monthlyExpense,
    categories: [
      { label: 'Personel', value: 268_000 },
      { label: 'Kâğıt / Malzeme', value: 219_800 },
      { label: 'Vergi / SGK', value: 186_700 },
      { label: 'Kira', value: 85_000 },
      { label: 'Faturalar', value: 41_200 },
      { label: 'Nakliye', value: 22_400 },
    ],
    metrics: [
      {
        label: 'Bu ay ciro',
        value: monthlyIncome[11],
        changeRatio: monthlyIncome[11] / monthlyIncome[10] - 1,
        upIsGood: true,
        trend: monthlyIncome,
        href: '/gelir-gider',
      },
      {
        label: 'Bu ay gider',
        value: monthlyExpense[11],
        changeRatio: monthlyExpense[11] / monthlyExpense[10] - 1,
        upIsGood: false,
        trend: monthlyExpense,
        href: '/gelir-gider',
      },
      {
        label: 'Vadesi geçen',
        value: 186_400,
        display: '3 fatura',
        hint: '186.400 ₺ — en eskisi 34 gün',
        href: '/alacaklar',
      },
      {
        label: 'Bu ay kesilen fatura',
        value: 18,
        display: '18 fatura',
        hint: 'Toplam 892.400 ₺',
        href: '/faturalar',
      },
    ],
    upcoming: [
      { id: 'v1', title: 'Ege Tekstil A.Ş.', subtitle: 'FT2026-0179 · 34 gün gecikmiş', amount: 210_000, dueDate: iso(addDays(today, -34)), overdue: true },
      { id: 'v2', title: 'Doruk Matbaa', subtitle: 'FT2026-0181 · 12 gün gecikmiş', amount: 96_800, dueDate: iso(addDays(today, -12)), overdue: true },
      { id: 'v3', title: 'KDV beyannamesi', subtitle: 'Ağustos dönemi', amount: 118_600, dueDate: iso(addDays(today, 4)), overdue: false },
      { id: 'v4', title: 'Beyaz Reklam', subtitle: 'FT2026-0183', amount: 74_200, dueDate: iso(addDays(today, 9)), overdue: false },
    ],
  };
}

// ---------------------------------------------------------------------------
// Müşavir personası — Zeynep'in ofisi
// ---------------------------------------------------------------------------

export interface DemoClient {
  id: string;
  name: string;
  /** Bu ay eksik belge sayısı — müşavirin asıl baktığı sayı. */
  missingDocs: number;
  lastActivity: string;
  monthlyRevenue: number;
  status: 'hazir' | 'eksik' | 'beklemede';
}

export const DEMO_CLIENTS: DemoClient[] = [
  { id: 'c1', name: 'Öz Matbaa Ltd. Şti.', missingDocs: 0, lastActivity: 'bugün', monthlyRevenue: 892_400, status: 'hazir' },
  { id: 'c2', name: 'Kadıköy Kahve A.Ş.', missingDocs: 4, lastActivity: '3 gün önce', monthlyRevenue: 318_700, status: 'eksik' },
  { id: 'c3', name: 'Berk Mühendislik', missingDocs: 1, lastActivity: 'dün', monthlyRevenue: 540_200, status: 'eksik' },
  { id: 'c4', name: 'Nar Tekstil', missingDocs: 0, lastActivity: '2 gün önce', monthlyRevenue: 1_284_000, status: 'hazir' },
  { id: 'c5', name: 'Mavi Lojistik', missingDocs: 7, lastActivity: '11 gün önce', monthlyRevenue: 726_500, status: 'beklemede' },
];

function buildMusavir(today: Date): DemoPersona {
  const base = buildSirket(today);
  const rand = rng(770412);

  const monthlyIncome: number[] = [];
  const monthlyExpense: number[] = [];
  const netTrend: number[] = [];
  let cumulative = 210_000;
  for (let i = 0; i < 12; i++) {
    const inc = jitter(rand, 186_000 + i * 4_200, 0.07);
    const exp = jitter(rand, 121_000 + i * 2_800, 0.08);
    monthlyIncome.push(inc);
    monthlyExpense.push(exp);
    cumulative += inc - exp;
    netTrend.push(cumulative);
  }

  return {
    key: 'musavir',
    workspaceName: 'Zeynep Mali Müşavirlik',
    workspaceType: 'musavir_ofisi',
    heroLabel: 'Bu dönem tamamlanan mükellef',
    ownerName: 'Zeynep A.',
    pitch:
      '40 mükellefi var. LUCA’yı bırakmıyor — FinansApp mükellefin veriyi kendi girmesini ve eksiklerin görünmesini sağlıyor.',
    accounts: [
      { id: 'm1', name: 'Ofis Hesabı', bankName: 'Akbank', balance: 264_500, kind: 'banka' },
      { id: 'm2', name: 'Kasa', balance: 12_300, kind: 'kasa' },
    ],
    transactions: base.transactions.slice(0, 8).map((t, i) => ({
      ...t,
      id: `musavir-${i}`,
      title: i % 3 === 0 ? 'Müşavirlik ücreti — Nar Tekstil' : t.title,
      subtitle: i % 3 === 0 ? 'Hizmet Geliri' : t.subtitle,
    })),
    netTrend,
    monthlyIncome,
    monthlyExpense,
    categories: [
      { label: 'Personel', value: 96_000 },
      { label: 'Ofis Kirası', value: 42_000 },
      { label: 'Yazılım / LUCA', value: 18_400 },
      { label: 'Faturalar', value: 11_200 },
    ],
    metrics: [
      { label: 'Toplam mükellef', value: 40, display: '40', hint: '5’i FinansApp’te aktif' },
      { label: 'Eksik belge bekleyen', value: 3, display: '3 mükellef', upIsGood: false, hint: 'Toplam 12 belge' },
      { label: 'Bu ay ofis geliri', value: monthlyIncome[11], changeRatio: monthlyIncome[11] / monthlyIncome[10] - 1, upIsGood: true, trend: monthlyIncome },
      { label: 'Beyanname son gün', value: 4, display: '4 gün', upIsGood: false, hint: 'KDV — 26 Ağustos' },
    ],
    upcoming: [
      { id: 'z1', title: 'Mavi Lojistik', subtitle: '7 belge eksik · 11 gündür hareket yok', amount: 0, dueDate: iso(addDays(today, 2)), overdue: true },
      { id: 'z2', title: 'Kadıköy Kahve A.Ş.', subtitle: '4 belge eksik', amount: 0, dueDate: iso(addDays(today, 4)), overdue: false },
      { id: 'z3', title: 'KDV beyanname son günü', subtitle: 'Tüm mükellefler', amount: 0, dueDate: iso(addDays(today, 8)), overdue: false },
    ],
  };
}

// ---------------------------------------------------------------------------

export function buildDemoPersonas(today: Date = new Date()): DemoPersona[] {
  return [buildAile(today), buildSirket(today), buildMusavir(today)];
}

export function getDemoPersona(key: string, today: Date = new Date()): DemoPersona {
  const all = buildDemoPersonas(today);
  return all.find((p) => p.key === key) ?? all[1];
}
