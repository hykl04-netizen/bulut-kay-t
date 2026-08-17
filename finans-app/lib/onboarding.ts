import { supabase } from './supabase/client';

/**
 * Faz 2 — self-servis kayıt sonrası kurulum sihirbazı.
 *
 * Yeni bir workspace (işletme) oluşturulduğunda `workspaces.onboarded_at`
 * null'dır (bkz. supabase/migrations/20260818_onboarding.sql). Dashboard
 * layout'u bunu görüp kullanıcıyı `/kurulum` sayfasına yönlendirir. Sihirbaz
 * bitince `completeOnboarding()` bu alanı doldurur ve yönlendirme durur.
 *
 * Not: Bu sadece kayıt akışı için değil — sol menüdeki "Yeni İşletme Ekle"
 * ile açılan ikinci/üçüncü işletmeler de aynı sihirbazdan geçer, böylece her
 * işletme kendi kategori setiyle başlar.
 */

export type CategoryType = 'gelir' | 'gider';

export interface CategorySeed {
  name: string;
  type: CategoryType;
  color: string;
}

export interface BusinessTemplate {
  key: string;
  label: string;
  description: string;
  categories: CategorySeed[];
}

// Kategori renkleri — /kategoriler sayfasındaki PRESET_COLORS paletiyle aynı
// aileden seçildi ki sonradan elle eklenen kategorilerle görsel olarak uyumlu olsun.
const GELIR = '#10b981';
const GELIR_ALT = '#84cc16';
const GIDER_KIRA = '#ef4444';
const GIDER_FATURA = '#f97316';
const GIDER_PERSONEL = '#8b5cf6';
const GIDER_PAZARLAMA = '#ec4899';
const GIDER_LOJISTIK = '#06b6d4';
const GIDER_VERGI = '#64748b';
const GIDER_DIGER = '#f59e0b';
const GIDER_MALIYET = '#d946ef';

export const BUSINESS_TEMPLATES: BusinessTemplate[] = [
  {
    key: 'hizmet',
    label: 'Hizmet / Danışmanlık',
    description: 'Proje ve danışmanlık geliri, ofis ve yazılım giderleri.',
    categories: [
      { name: 'Danışmanlık Geliri', type: 'gelir', color: GELIR },
      { name: 'Proje Geliri', type: 'gelir', color: GELIR_ALT },
      { name: 'Ofis Kirası', type: 'gider', color: GIDER_KIRA },
      { name: 'Yazılım / Abonelikler', type: 'gider', color: GIDER_DIGER },
      { name: 'Seyahat & Konaklama', type: 'gider', color: GIDER_LOJISTIK },
      { name: 'Muhasebe / Mali Müşavir', type: 'gider', color: GIDER_VERGI },
      { name: 'Personel Maaşı', type: 'gider', color: GIDER_PERSONEL },
      { name: 'Faturalar (Elektrik, İnternet)', type: 'gider', color: GIDER_FATURA },
    ],
  },
  {
    key: 'eticaret',
    label: 'E-ticaret',
    description: 'Ürün satışı, kargo, pazaryeri komisyonu ve reklam giderleri.',
    categories: [
      { name: 'Ürün Satışı', type: 'gelir', color: GELIR },
      { name: 'Kargo Geliri', type: 'gelir', color: GELIR_ALT },
      { name: 'Ürün Alım Maliyeti', type: 'gider', color: GIDER_MALIYET },
      { name: 'Kargo Gideri', type: 'gider', color: GIDER_LOJISTIK },
      { name: 'Pazaryeri Komisyonu', type: 'gider', color: GIDER_VERGI },
      { name: 'Reklam & Pazarlama', type: 'gider', color: GIDER_PAZARLAMA },
      { name: 'İade & İptal', type: 'gider', color: GIDER_KIRA },
      { name: 'Paketleme Malzemesi', type: 'gider', color: GIDER_DIGER },
    ],
  },
  {
    key: 'perakende',
    label: 'Perakende / Dükkan',
    description: 'Mağaza satışı, mal alımı, dükkan giderleri ve POS komisyonu.',
    categories: [
      { name: 'Mağaza Satışı', type: 'gelir', color: GELIR },
      { name: 'Mal Alımı', type: 'gider', color: GIDER_MALIYET },
      { name: 'Dükkan Kirası', type: 'gider', color: GIDER_KIRA },
      { name: 'Elektrik / Su / Doğalgaz', type: 'gider', color: GIDER_FATURA },
      { name: 'Personel Maaşı', type: 'gider', color: GIDER_PERSONEL },
      { name: 'POS Komisyonu', type: 'gider', color: GIDER_VERGI },
      { name: 'Temizlik & Bakım', type: 'gider', color: GIDER_DIGER },
    ],
  },
  {
    key: 'genel',
    label: 'Genel / Serbest Meslek',
    description: 'Her işe uyan sade başlangıç seti.',
    categories: [
      { name: 'Satış Geliri', type: 'gelir', color: GELIR },
      { name: 'Diğer Gelir', type: 'gelir', color: GELIR_ALT },
      { name: 'Kira', type: 'gider', color: GIDER_KIRA },
      { name: 'Faturalar', type: 'gider', color: GIDER_FATURA },
      { name: 'Ulaşım', type: 'gider', color: GIDER_LOJISTIK },
      { name: 'Yemek', type: 'gider', color: GIDER_DIGER },
      { name: 'Vergi & Resmi Ödemeler', type: 'gider', color: GIDER_VERGI },
      { name: 'Diğer Gider', type: 'gider', color: GIDER_PERSONEL },
    ],
  },
];

export function getTemplate(key: string): BusinessTemplate | undefined {
  return BUSINESS_TEMPLATES.find((t) => t.key === key);
}

/**
 * Verilen kategorileri workspace'e ekler ve eklenen sayıyı döner.
 *
 * Sihirbazda kullanıcı şablondan kategori çıkarabildiği için buraya şablonun
 * tamamı değil, SEÇİLİ kategoriler geçilir. Workspace'te aynı isimde bir
 * kategori zaten varsa (kullanıcı sihirbazı yarıda bırakıp geri döndüyse ya da
 * "Kurulumu atla" sonrası tekrar girdiyse) o kategori atlanır — sihirbaz kaç
 * kez çalışırsa çalışsın kopya kategori oluşmaz.
 */
export async function insertCategories(workspaceId: string, categories: CategorySeed[]): Promise<number> {
  if (categories.length === 0) return 0;

  const { data: existing } = await supabase
    .from('categories')
    .select('name')
    .eq('workspace_id', workspaceId);

  const existingNames = new Set(
    (existing ?? []).map((c: { name: string }) => c.name.toLocaleLowerCase('tr'))
  );
  const rows = categories
    .filter((c) => !existingNames.has(c.name.toLocaleLowerCase('tr')))
    .map((c) => ({
      workspace_id: workspaceId,
      name: c.name,
      type: c.type,
      color: c.color,
    }));

  if (rows.length === 0) return 0;

  const { error } = await supabase.from('categories').insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}

/** Sihirbazın ilk adımında oluşturulan banka/kasa hesabı (isteğe bağlı). */
export async function createFirstBankAccount(
  workspaceId: string,
  input: { name: string; bankName?: string; currentBalance?: number }
): Promise<void> {
  const { error } = await supabase.from('bank_accounts').insert({
    workspace_id: workspaceId,
    name: input.name.trim(),
    bank_name: input.bankName?.trim() || null,
    current_balance: input.currentBalance ?? 0,
    currency: 'TRY',
  });
  if (error) throw new Error(error.message);
}

/** Sihirbaz tamamlandı olarak işaretlenir; artık /kurulum'a yönlendirme yapılmaz. */
export async function completeOnboarding(workspaceId: string): Promise<void> {
  const { error } = await supabase
    .from('workspaces')
    .update({ onboarded_at: new Date().toISOString() })
    .eq('id', workspaceId);
  if (error) throw new Error(error.message);
}

/**
 * Seçili workspace'in kurulum sihirbazını tamamlayıp tamamlamadığını söyler.
 * Kolon henüz yoksa (migration çalıştırılmadıysa) `false` döner — yani
 * kimse sihirbaza zorlanmaz, eski davranış korunur.
 */
export async function isOnboardingPending(workspaceId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('onboarded_at')
    .eq('id', workspaceId)
    .maybeSingle();

  if (error || !data) return false;
  return (data as { onboarded_at: string | null }).onboarded_at === null;
}
