/**
 * Beta test girişleri — kullanıcı adıyla giriş.
 *
 * NEDEN VAR: kapalı beta sırasında test kullanıcıları e-posta yerine
 * "aile", "kurumsal", "muhasebe" gibi kısa bir adla giriyor. Supabase Auth
 * yalnızca e-posta ile çalıştığı için burada tek yaptığımız şey, "@"
 * içermeyen bir girdiyi sabit bir alan adıyla birleştirmek.
 *
 * DİKKAT — bu bir kimlik doğrulama katmanı DEĞİL. Şifre kontrolü hâlâ
 * tamamen Supabase'de; burada sadece kullanıcının yazdığı metin bir
 * e-postaya çevriliyor. Yani güvenlik açısından hiçbir şey gevşemiyor,
 * yalnızca yazması kolaylaşıyor.
 *
 * Lansmanda bu dosya ve BETA_GIRIS_ACIK bayrağı kaldırılacak; gerçek
 * kullanıcılar zaten kendi e-postalarıyla giriyor ve o yol hiç değişmedi.
 */

/** Kullanıcı adlarının arkasına eklenen alan adı. */
export const BETA_ALAN_ADI = 'beta.finansapp.app';

/** Beta kullanıcı adı girişi açık mı. Lansmanda false yapılıp silinecek. */
export const BETA_GIRIS_ACIK = true;

/**
 * Kullanıcının yazdığını Supabase'in beklediği e-postaya çevirir.
 * İçinde "@" varsa dokunulmaz — gerçek kullanıcılar etkilenmez.
 */
export function girisKimligineCevir(girdi: string): string {
  const temiz = girdi.trim().toLowerCase();
  if (!temiz) return temiz;
  if (temiz.includes('@')) return temiz;
  if (!BETA_GIRIS_ACIK) return temiz;
  return `${temiz}@${BETA_ALAN_ADI}`;
}

/**
 * Kapalı beta sırasında kayıt bağlantısı gizlenir: hesaplar elle açılıyor,
 * kimsenin kendi kendine kayıt olması beklenmiyor. Bağlantıyı bırakmak
 * test kullanıcısını çalışmayan bir kapıya yönlendirir.
 */
export const BETA_KAYIT_GIZLI = true;

/** Beta hesapları — kurulum talimatı ve giriş ekranındaki ipucu için. */
export const BETA_HESAPLARI: { kullaniciAdi: string; aciklama: string }[] = [
  { kullaniciAdi: 'aile', aciklama: 'Aile / bireysel bütçe paneli' },
  { kullaniciAdi: 'kurumsal', aciklama: 'İşletme paneli — fatura, cari, bordro' },
  { kullaniciAdi: 'muhasebe', aciklama: 'Mali müşavir paneli — mükellef geçişi' },
];
