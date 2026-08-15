# Faz 9 — Manuel Doğrulama Kontrol Listesi

**Nasıl kullanılır:** Her satırı tarayıcında gerçek Supabase verinle dene, geçenin başına `[x]`, geçmeyenin başına `[FAIL: neden]` yaz. Hepsi geçtikten sonra roadmap dosyasında ilgili maddeyi `[x]` yapabiliriz. Build zaten `tsc --noEmit` ile temiz geçti; burada aranan kod hatası değil, **davranış** hatası.

---

## 9.1 — Mobil Responsive Test

- [ ] Tarayıcıyı ~375px genişliğe küçült (veya telefonda aç). Sidebar kayboluyor, üstte hamburger menü çıkıyor mu?
- [ ] Hamburger menüye dokun → menü açılıyor mu, tüm 7 modül linki (gelir-gider, borç-alacak, fatura-masraf, yatırım, varlık, kategoriler, raporlar) görünüyor mu?
- [ ] Bir linke dokunduğunda menü otomatik kapanıp doğru sayfaya gidiyor mu?
- [ ] Gelir-Gider tablosunu mobilde aç: sütunlar sığmıyorsa yatay kaydırma (`overflow-x-auto`) çalışıyor mu, sayfa taşıp yatay scrollbar tüm sayfayı bozuyor mu (olmamalı, sadece tablo container'ı kaymalı)?
- [ ] Aynı testi Borç-Alacak, Fatura-Masraf, Yatırım, Varlık tablolarında tekrarla.
- [ ] Modallar (yeni kayıt ekleme, Excel'den yapıştır) mobil ekranda düzgün ortalanıyor mu, ekran dışına taşmıyor mu?
- [ ] Raporlar sayfasındaki grafikler (Recharts) mobilde okunabiliyor mu, yoksa sıkışıp etiketler üst üste mi biniyor?
- [ ] iPhone/Android gerçek cihazda (mümkünse) bir kez dene — masaüstü tarayıcı simülasyonu bazen gerçek dokunma davranışını yakalamaz.

## 9.2 — PWA Kurulumu

- [ ] Chrome/Edge'de siteyi aç → adres çubuğunda "Yükle" (install) simgesi çıkıyor mu?
- [ ] Yükle → uygulama ayrı pencerede, tarayıcı çubuğu olmadan açılıyor mu (`display: standalone` çalışıyor mu)?
- [ ] Android'de "Ana ekrana ekle" ile eklenen ikon doğru görünüyor mu (192px ve 512px ikonlar, maskable versiyonlar dahil)?
- [ ] DevTools → Application → Manifest sekmesinde hata/uyarı var mı kontrol et.
- [ ] DevTools → Application → Service Workers: `sw.js` "activated and running" durumunda mı?
- [ ] Siteyi bir kez ziyaret ettikten sonra internetini kapat, sayfayı yenile — service worker herhangi bir offline davranış sağlıyor mu, yoksa sadece kayıtlı mı duruyor (şu anki kapsamın "offline değil, sadece app-gibi görünüm" olduğunu unutma — bu bilinçli bir sınırlama, hata değil)?
- [ ] `next.config.ts`'e dokunulmadığı doğrulandı mı (roadmap notu next-pwa yerine yerleşik `app/manifest.ts` kullanıldığını söylüyor) — Turbopack build'in bundan etkilenmediğini teyit et.

## 9.3 — Dark Mode

- [ ] Sağ üstteki (veya sidebar'daki) tema butonuna tıkla → tüm sayfa aydan koyuya geçiyor mu, geçiş anında beyaz "flash" (FOUC) oluyor mu?
- [ ] Sayfayı yenile (F5) — tema tercihin (localStorage) korunuyor mu, yoksa her seferinde açık temaya mı dönüyor?
- [ ] Koyu temadayken **her** modülü tek tek gez: Gelir-Gider, Borç-Alacak, Fatura-Masraf, Yatırım, Varlık, Kategoriler, Raporlar, Bordro, Belgeler. Okunmayan metin (koyu üstüne koyu, açık üstüne açık) var mı?
- [ ] Modallar (ekleme formu, Excel'den yapıştır, yedekleme) koyu temada da doğru kontrastta mı?
- [ ] **Bilinen sorun:** `app/(dashboard)/katagoriler` (yanlış yazımlı eski kopya) dark mode class'larını almamış — bu klasör zaten dead code, silinmesi gerekiyor (aşağıya bak).
- [ ] Sistem temanı (işletim sistemi) koyu ayarlıyken ilk ziyarette otomatik koyu açılıyor mu, yoksa hep açık mı başlıyor?

## 9.4 — Yedekleme Stratejisi

- [ ] Yedekleme modalını aç → "Dışa Aktar" butonuna bas, JSON dosyası gerçekten iniyor mu?
- [ ] İnen dosyayı aç, 6 tablonun (`categories`, `transactions`, `debts`, `bills`, `investments`, `assets`) hepsi dolu mu, boş dizi dönenler var mı kontrol et.
- [ ] **Dikkat — bu bir eksik, hata değil:** `lib/backup.ts` içinde sadece **dışa aktarma (export)** var, **geri yükleme (import/restore)** fonksiyonu yok. Yani "yedekleme stratejisi" şu an tek yönlü — bir felaket durumunda bu JSON'u geri Supabase'e yazacak bir yol henüz kodlanmamış. Bunu Faz 9 kapsamında bilinçli mi bırakıyorsun (örn. restore'u Supabase dashboard'dan elle SQL ile yapacaksın), yoksa ayrı bir görev olarak mı eklemek istersin — karar senin.
- [ ] Otomatik/zamanlanmış yedekleme yok (yalnızca manuel buton) — bunun kapsam dahilinde mi kapsam dışında mı olduğuna da karar ver.

---

## Bu oturumda tespit edilen, roadmap'e eklenmesi gereken boşluklar

Faz 9 testinden bağımsız ama roadmap dosyanla senkron değil, ayrıca not düşüyorum:

1. **`app/(dashboard)/katagoriler` hâlâ silinmedi** — üstelik artık `kategoriler`'den içerik olarak da sapmış (dark mode class'ları eksik). Gerçek dead code + potansiyel kafa karışıklığı kaynağı.
2. **`bordro` ve `belgeler` sayfaları + Cloudinary bağımlılığı** roadmap'in hiçbir yerinde dokümante değil. Ne zaman eklendiler, `payrolls`/`documents` tabloları migration'da var mı, Cloudinary env değişkenleri (`NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` vb.) `.env.local`'de tanımlı mı — bunlar doğrulanmalı.
3. **Faz 7.1, 7.2, 7.4 hâlâ `[~]`** (v2 roadmap'e göre) — bu Faz 9 testinden önce ya da onunla birlikte gerçek veriyle doğrulanmalı, çünkü Faz 9'daki (özellikle dark mode ve mobil) testler bu bileşenlerin üstünden geçiyor; ikisini aynı anda test edebilirsin.
