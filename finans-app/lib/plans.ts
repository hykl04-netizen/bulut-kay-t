import { supabase } from './supabase/client';

/**
 * Faz 3 — abonelik planları ve plan bazlı özellik kontrolü.
 *
 * ÖNEMLİ: Buradaki mantık ARAYÜZ içindir (menüyü gizlemek, uyarı göstermek,
 * "Yükselt" düğmesi çıkarmak). Gerçek kısıtlama DB tarafındadır — RLS
 * politikaları `workspace_can_write()` ve `workspace_has_feature()`
 * fonksiyonlarını çağırır (bkz. 20260819_subscriptions.sql). Yani bu dosyadaki
 * bir hata veri güvenliğini bozmaz, yalnızca kullanıcıya yanlış ekran gösterir.
 *
 * Fiyatlar şimdilik YER TUTUCUDUR — ödeme sağlayıcısı (iyzico/Stripe) seçilip
 * ürünler tanımlandığında buradaki değerler ve `providerPriceId` alanları
 * gerçek değerlerle doldurulacak.
 */

export type PlanKey = 'baslangic' | 'pro' | 'kurumsal';
export type SubscriptionStatus = 'deneme' | 'aktif' | 'odeme_bekliyor' | 'iptal' | 'suresi_doldu';

export interface Subscription {
  workspaceId: string;
  plan: PlanKey;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  graceUntil: string | null;
  provider: 'iyzico' | 'stripe' | null;
}

export interface Plan {
  key: PlanKey;
  label: string;
  tagline: string;
  /** Aylık fiyat (TL). null = "bize ulaşın". YER TUTUCU. */
  monthlyPrice: number | null;
  userLimit: number | null;
  features: string[];
  /** Bu planda kilitli olan modüller — menüde kilit rozetiyle gösterilir. */
  lockedModules: string[];
}

export const TRIAL_DAYS = 14;

export const PLANS: Plan[] = [
  {
    key: 'baslangic',
    label: 'Başlangıç',
    tagline: 'Tek kişilik işletmeler için temel finans takibi',
    monthlyPrice: 299,
    userLimit: 1,
    features: [
      'Gelir/gider takibi',
      'Fatura & masraf',
      'Borç/alacak',
      'Kategoriler ve bütçe',
      'Temel raporlar',
      '1 kullanıcı',
    ],
    lockedModules: ['bordro'],
  },
  {
    key: 'pro',
    label: 'Pro',
    tagline: 'Büyüyen ekipler için tüm modüller',
    monthlyPrice: 799,
    userLimit: 5,
    features: [
      'Başlangıç plandaki her şey',
      'Bordro / maaş modülü',
      'Yatırım ve varlık takibi',
      'Banka hesapları',
      'Belgeler & arşiv',
      '5 kullanıcıya kadar',
    ],
    lockedModules: [],
  },
  {
    key: 'kurumsal',
    label: 'Kurumsal',
    tagline: 'Sınırsız kullanıcı ve öncelikli destek',
    monthlyPrice: null,
    userLimit: null,
    features: [
      'Pro plandaki her şey',
      'Sınırsız kullanıcı',
      'Öncelikli destek',
      'Dönem kilitleme ve denetim kaydı',
      'Gelecekte API erişimi',
    ],
    lockedModules: [],
  },
];

export function getPlan(key: PlanKey): Plan {
  return PLANS.find((p) => p.key === key) ?? PLANS[0];
}

/**
 * Kullanıcının o an fiilen sahip olduğu plan. Deneme süresi devam ederken
 * ürünün tamamı denenebilsin diye 'pro' döner — DB tarafındaki
 * `workspace_plan()` fonksiyonuyla birebir aynı mantık.
 */
export function effectivePlan(sub: Subscription | null): PlanKey {
  if (!sub) return 'kurumsal'; // abonelik satırı yoksa kısıtlama uygulama
  const now = Date.now();
  if (sub.status === 'deneme') {
    return sub.trialEndsAt && new Date(sub.trialEndsAt).getTime() > now ? 'pro' : 'baslangic';
  }
  if (sub.status === 'aktif' || sub.status === 'odeme_bekliyor') return sub.plan;
  return 'baslangic';
}

/** Workspace'e yeni kayıt eklenebilir/düzenlenebilir mi? */
export function canWrite(sub: Subscription | null): boolean {
  if (!sub) return true;
  const now = Date.now();
  switch (sub.status) {
    case 'deneme':
      return !!sub.trialEndsAt && new Date(sub.trialEndsAt).getTime() > now;
    case 'aktif':
      return true;
    case 'odeme_bekliyor':
      return !!sub.graceUntil && new Date(sub.graceUntil).getTime() > now;
    default:
      return false;
  }
}

export function hasFeature(sub: Subscription | null, feature: 'bordro' | 'sinirsiz_kullanici'): boolean {
  const plan = effectivePlan(sub);
  if (feature === 'bordro') return plan === 'pro' || plan === 'kurumsal';
  if (feature === 'sinirsiz_kullanici') return plan === 'kurumsal';
  return true;
}

/** Deneme süresinin bitmesine kaç gün kaldığı (bittiyse 0). */
export function trialDaysLeft(sub: Subscription | null): number {
  if (!sub || sub.status !== 'deneme' || !sub.trialEndsAt) return 0;
  const ms = new Date(sub.trialEndsAt).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export type AccessState = 'deneme' | 'aktif' | 'tolerans' | 'kisitli';

/** Arayüzde gösterilecek üst seviye durum — uyarı şeridi bunu kullanır. */
export function accessState(sub: Subscription | null): AccessState {
  if (!sub) return 'aktif';
  if (sub.status === 'aktif') return 'aktif';
  if (sub.status === 'deneme') return canWrite(sub) ? 'deneme' : 'kisitli';
  if (sub.status === 'odeme_bekliyor') return canWrite(sub) ? 'tolerans' : 'kisitli';
  return 'kisitli';
}

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  deneme: 'Ücretsiz deneme',
  aktif: 'Aktif',
  odeme_bekliyor: 'Ödeme bekleniyor',
  iptal: 'İptal edildi',
  suresi_doldu: 'Süresi doldu',
};

/**
 * Seçili workspace'in aboneliğini okur. Tablo/migration henüz yoksa null
 * döner — bu durumda hiçbir kısıtlama uygulanmaz (eski davranış korunur).
 */
export async function getSubscription(workspaceId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('workspace_id, plan, status, trial_ends_at, current_period_end, grace_until, provider')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    workspace_id: string;
    plan: PlanKey;
    status: SubscriptionStatus;
    trial_ends_at: string | null;
    current_period_end: string | null;
    grace_until: string | null;
    provider: 'iyzico' | 'stripe' | null;
  };

  return {
    workspaceId: row.workspace_id,
    plan: row.plan,
    status: row.status,
    trialEndsAt: row.trial_ends_at,
    currentPeriodEnd: row.current_period_end,
    graceUntil: row.grace_until,
    provider: row.provider,
  };
}
