# FinansApp — Yapılacaklar Listesi

## ✅ Şimdi Uygulanacaklar (üzerinde anlaştıklarımız)

- [ ] **Native alert()/confirm() → şık bildirim/modal.** Tarayıcının çirkin varsayılan kutularını (35 yerde kullanılıyor) tema renklerine uygun toast bildirimlerine ve onay modallarına çevir.
- [ ] **Vade tarihi hatırlatıcıları.** Fatura/Borç kayıtlarına "vadeye X gün kaldı" rozeti ve Özet Paneli'nde "bu hafta/ay ödenecekler" widget'ı ekle.
- [x] **Raporları PDF/Excel olarak dışa aktarma.** Raporlar sayfasına indirme butonu ekle, muhasebeci ile paylaşımı kolaylaştır.
- [x] **Şifre sıfırlama akışı.** Login sayfasına "Şifremi Unuttum" ekle (2 adımlı doğrulama olmadan, sadece e-posta ile sıfırlama linki).
- [x] **Tablo sayfalandırma (pagination).** Gelir/Gider ve Fatura/Masraf tablolarında büyük veri setlerinde performansı korumak için sayfa başına 25-50 kayıt göster.

---

## 💡 Yeni Öneriler (15 adet)

### Finansal Özellikler
- [x] **Bütçe planlama ve aşım uyarıları.** Kategori bazlı aylık bütçe belirleme, limit aşılınca uyarı.
- [x] **Nakit akışı tahmini (cash flow forecast).** Gelecek aylar için gelir/gider projeksiyonu grafiği.
- [x] **KDV/vergi hesaplama desteği.** Fatura tutarlarına otomatik KDV ekleme/çıkarma.
- [x] **Tekrarlayan fatura/gelir otomasyonu.** Her ay otomatik olarak yeni kayıt oluşturma (kira, abonelik vb.).
- [x] **Çoklu para birimi desteği.** Güncel döviz kuru entegrasyonu ile otomatik TL karşılığı hesaplama.
- [x] **Banka hesabı entegrasyonu (Open Banking).** İşlemleri elle girmek yerine otomatik içe aktarma. *(Not: gerçek canlı Open Banking API bağlantısı yerine — aşağıdaki nota bakın — CSV ekstre içe aktarma uygulandı.)*
- [ ] **OCR ile fatura/fiş otomatik okuma.** Yüklenen belge görselinden tutar/tarih/satıcı otomatik çıkarılıp form doldurulsun.
- [ ] **Yatırım portföyü için gerçek zamanlı fiyat.** Hisse/döviz/kripto fiyatları API'den otomatik çekilsin.

### Kurumsal / Güvenlik
- [ ] **Çoklu kullanıcı ve rol yönetimi.** Muhasebeci, yönetici, salt-görüntüleyici gibi farklı yetki seviyeleri.
- [ ] **Aktivite/işlem geçmişi (audit log).** Kim, ne zaman, hangi kaydı değiştirdi — kurumsal denetim için.
- [ ] **Oturum yönetimi.** Aktif oturumları görüntüleme ve uzaktan çıkış yapma imkânı.
- [ ] **Şirket logosu ve markalı rapor şablonu.** Yüklenen logo ile PDF raporların üstbilgisinde görünmesi.
- [ ] **Otomatik zamanlanmış yedekleme.** Haftalık/aylık otomatik yedek, e-posta veya buluta gönderim.
- [ ] **Çoklu şirket / proje desteği.** Tek hesapla birden fazla işletme/proje arası geçiş (workspace).
- [ ] **Dönem kilitleme (ay/yıl sonu kapanışı).** Geçmiş dönem kayıtlarının yanlışlıkla değiştirilmesini engelleme.

### Kullanıcı Deneyimi
- [ ] **Kategori bazlı grafik/pasta chart raporları.** Harcamaların görsel dağılımı.
- [ ] **Gelişmiş arama ve filtreleme.** Tarih aralığı, tutar aralığı, kategori bazlı çoklu filtre.
- [ ] **Yazdırılabilir (print-friendly) rapor görünümü.** Tarayıcıdan doğrudan düzgün baskı alınabilmesi.
- [ ] **Klavye kısayolları.** Hızlı kayıt ekleme, arama gibi işlemler için kısayol tuşları.
- [ ] **Mobil bildirimler (PWA push).** Ödeme/vade hatırlatmalarının telefon bildirimi olarak gelmesi.
- [ ] **Karşılaştırmalı trend raporları.** "Bu ay vs geçen ay", "bu yıl vs geçen yıl" analizleri.
- [ ] **Belge arşivinde etiketleme ve arama.** Belge içeriğine veya etiketlere göre hızlı filtreleme.
- [ ] **Bildirim tercihleri paneli.** Kullanıcının hangi bildirimleri, hangi kanaldan almak istediğini seçmesi.

---

## 📝 Tamamlanan İşler (bu oturumda)

- [x] Lacivert & Altın kurumsal tema uygulandı (globals.css + PWA renkleri)
- [x] Dosya yükleme Cloudinary'den Supabase Storage'a taşındı (private bucket + imzalı link)
- [x] Vercel ortam değişkenleri (Supabase URL/Key) düzeltildi
- [x] `bills` tablosuna eksik `receipt_url` kolonu eklendi
- [x] Tüm sayfalardaki sabit gri renkler (`slate-*`) tema değişkenlerine bağlandı (29 dosya)
- [x] "..." satır menüsünün tablo içinde altta/görünmez kalma sorunu çözüldü (Portal tabanlı ortak bileşen — 5 dosya)
- [x] Marka adı tutarsızlığı düzeltildi ("FinansAsistanım" → "FinansApp", "Kişisel Finans Yönetimi" → "Kurumsal Finans Yönetimi")
- [x] Raporlar sayfasına "PDF İndir" / "Excel İndir" butonları eklendi (`lib/report-export.ts` — jspdf-autotable + xlsx, 3 tablo: nakit akışı, kategori harcamaları, portföy dağılımı)
- [x] Şifre sıfırlama akışı eklendi: Login'de "Şifremi Unuttum" linki → `/sifremi-unuttum` (e-posta ile link gönderimi) → `/sifre-guncelle` (yeni şifre belirleme, `PASSWORD_RECOVERY` event'i dinleniyor)
- [x] Tablo sayfalandırma zaten `DataTable` bileşeninde mevcuttu (25/50/100 seçenekli), 5 tabloda da (gelir-gider, fatura-masraf, borç-alacak, varlık, yatırım) aktif olduğu doğrulandı
- [x] Bütçe planlama eklendi: yeni `/butce` sayfası, kategori bazlı aylık limit belirleme, harcama/limit ilerleme çubuğu (yeşil/sarı/kırmızı), Özet Paneli'nde "Bütçe Aşımları" widget'ı. **Önemli:** yeni `budgets` tablosu gerekiyor — `supabase/migrations/20260816_create_budgets_table.sql` dosyasını Supabase SQL Editor'de elle çalıştırmanız lazım.
- [x] Nakit akışı tahmini eklendi: Raporlar sayfasına, son 3 ayın ortalamasına göre gelecek 3 ay için gelir/gider projeksiyonu gösteren yeni bir grafik (kesikli çizgiler) — `lib/reports.ts`'teki `projectCashFlow`.
- [x] KDV hesaplama desteği eklendi: Fatura/Masraf formundaki "Tutar" alanının yanına, KDV hariç↔dahil çevrimi yapıp sonucu tek tıkla tutar alanına aktaran bir hesaplayıcı (`components/kdv-calculator.tsx`, %1/%10/%20 oranları) — mevcut tabloya kolon eklemeden çalışır.
- [x] Tekrarlayan fatura/gelir otomasyonu eklendi: `bills` tablosunda zaten var olan `is_recurring`/`recurrence_period` alanlarına ek olarak `series_id` ve `recurrence_end_date` eklendi; `transactions` tablosuna da aynı alanlar (yeni) eklendi. `lib/recurring.ts`'teki `runRecurringAutomation`, dashboard layout'unda oturum açıldığında bir kez çalışıp vadesi geçmiş tekrarlayan kayıtların eksik dönemlerini otomatik oluşturuyor (idempotent — sunucu tarafı cron olmadığı için "yakalama" deseniyle çalışıyor). **Not:** Fatura/Masraf formunda tekrar ayarları (`is_recurring`/`recurrence_period`) için state zaten vardı ama arayüzde görünür bir kontrol yoktu (kullanıcı hiç açamıyordu) — bu eksik de bu oturumda giderildi. Gelir/Gider formuna da aynı tekrar mekanizması (maaş, kira geliri vb. için) eklendi.
- [x] Çoklu para birimi desteği eklendi (Gelir/Gider işlemleri): `transactions` tablosuna `currency`, `exchange_rate`, `try_equivalent` kolonları eklendi. `lib/currency.ts`, frankfurter.app (ECB tabanlı, anahtarsız/ücretsiz) üzerinden canlı kur çekip 1 saat localStorage'da önbelleğe alıyor; ağ hatasında kullanıcı kuru elle girebiliyor. Form üzerinde döviz seçici + TL karşılığı önizlemesi, tabloda döviz tutarı + TL karşılığı gösterimi var. Özet Panel, Raporlar ve Bütçe sayfalarındaki toplamlar artık `try_equivalent` üzerinden hesaplanıyor (yoksa `amount`'a düşüyor) — böylece döviz cinsinden kayıtlar toplamları bozmuyor. **Şu an sadece Gelir/Gider işlemlerinde var; Fatura/Masraf'a henüz eklenmedi.**
- [x] Banka hesabı entegrasyonu eklendi — **önemli kapsam notu:** Gerçek "Open Banking" (bankaya canlı API ile bağlanıp işlemleri otomatik çekme) BDDK lisanslı bir aracı/ödeme kuruluşu (TPP) hesabı ve o kuruluşla ayrı bir sözleşme/API anahtarı gerektirir; bu genel bir uygulamaya doğrudan eklenemez. Onun yerine yeni `/banka-hesaplari` sayfası: manuel banka hesabı tanımlama (ad, banka, IBAN son 4 hane, bakiye) ve bankanızın internet şubesinden indirdiğiniz ekstre CSV'sini içe aktararak işlemleri otomatik `transactions` tablosuna ekleme (`lib/bank-import.ts`) sunuyor. Aynı ekstrenin iki kez aktarılmasını `bank_account_id` + `external_ref` üzerindeki benzersiz kısıtlama engelliyor. `bank_accounts` tablosu, ileride gerçek bir sağlayıcı (ör. GoCardless Bank Account Data, Salt Edge) bağlanacaksa da aynı şekilde kullanılabilecek şekilde tasarlandı.
- [x] **Önemli:** Bu oturumda eklenen tüm DB değişiklikleri (tekrarlayan işlem alanları, çoklu para birimi kolonları, `bank_accounts` tablosu) tek bir migration dosyasında: `supabase/migrations/20260816_recurring_currency_bank.sql` — Supabase SQL Editor'de elle çalıştırmanız lazım.
