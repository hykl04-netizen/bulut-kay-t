# Kişisel Finans Web Uygulaması — Yol Haritası v2 (İskelet Öncelikli)

## 📌 Nasıl Kullanılır (Claude için not)
Bu dosyayı her sohbete yüklediğinde:
- `[x]` = tamamlandı ve test edildi
- `[~]` = kod yazıldı ama henüz test edilmedi / doğrulanmadı
- `[ ]` = başlanmadı
- **"Şu an buradayız"** satırı her zaman en güncel odak noktasını gösterir, direkt oraya bak.

Her görev, tek bir sohbet mesajı alışverişinde (yaklaşık mesaj bütçesinin 1/3'ünü geçmeyecek şekilde) tamamlanabilecek küçüklükte bölünmüştür. Büyük bir modülü tek seferde isteme — sıradaki tek görevi iste.

---

## Şu an buradayız
👉 **Faz 7 / Görev 7.1 — Kategori yönetim arayüzü (uygulama içinden ekle/sil)**

_(Not: Faz 2-6'daki tüm kodlar teslim edildi ve `[x]` işaretlendi. Kapsamlı uçtan uca test henüz yapılmadı — bir şey bozuk çıkarsa ilgili görevi tekrar `[~]`'ye çevirip düzeltiriz.)_

---

## Faz 1 — Temel Altyapı
- [x] Next.js + Tailwind + shadcn kurulumu (build başarılı)
- [x] Supabase proje bağlantısı (.env.local, API key sorunu çözüldü)
- [x] Auth (login/logout) akışı çalışıyor
- [x] Oturum kalıcılığı (sayfa yenilenince login'e atmıyor)
- [x] Dashboard layout + sidebar

## Faz 2 — Modül İskeletleri: Gelir-Gider (öncelik burada)
- [x] 2.1 — Tablo görünümü + Supabase'ten veri çekme (fetchTransactions)
- [x] 2.2 — Yeni işlem ekleme formu (modal + insert)
- [x] 2.3 — Kategori dropdown'ı bağlama (categories tablosuna join)
- [x] 2.4 — Düzenleme (update) ve silme (delete) fonksiyonları — kod teslim edildi
- [ ] 2.5 — categories tablosuna en az 3-4 örnek kategori eklenmesi (Supabase dashboard'dan elle) — **kullanıcı tarafında bekliyor**

## Faz 3 — Modül İskeletleri: Borç-Alacak ✅
- [x] 3.1 — Sayfa + tablo görünümü + veri çekme (debts tablosu)
- [x] 3.2 — Ekleme formu (borç/alacak yönü, karşı taraf, tutar, vade tarihi)
- [x] 3.3 — Silme fonksiyonu
- [x] 3.4 — Durum güncelleme (açık → kapandı)

## Faz 4 — Modül İskeletleri: Fatura/Masraf ✅
- [x] 4.1 — Sayfa + tablo görünümü + veri çekme (bills tablosu)
- [x] 4.2 — Ekleme formu (başlık, tutar, vade, tekrarlayan mı)
- [x] 4.3 — Silme fonksiyonu
- [x] 4.4 — Ödendi/ödenmedi durumu değiştirme

## Faz 5 — Modül İskeletleri: Yatırım Portföyü ✅
- [x] 5.1 — Sayfa + tablo görünümü + veri çekme (investments tablosu)
- [x] 5.2 — Ekleme formu (varlık tipi, sembol, miktar, maliyet)
- [x] 5.3 — Silme fonksiyonu
- [x] 5.4 — Güncel fiyat manuel güncelleme (düzenle modalına gömülü)

## Faz 6 — Modül İskeletleri: Varlık/Birikim ✅
- [x] 6.1 — Sayfa + tablo görünümü + veri çekme (assets tablosu)
- [x] 6.2 — Ekleme formu (varlık adı, tip, güncel değer)
- [x] 6.3 — Silme fonksiyonu

---

## ✅ İskelet tamamlandı — sıradaki fazlar aşağıda

## Faz 7 — Detaylar & Geliştirmeler
- [ ] 7.1 — Kategori yönetim arayüzü (uygulama içinden ekle/sil, dashboard'a gitmeden)
- [ ] 7.2 — Inline cell editing (çift tıkla → düzenle)
- [ ] 7.3 — Optimistic UI + debounce
- [ ] 7.4 — Toplu satır ekleme / Excel'den yapıştırma

## Faz 8 — Raporlama
- [ ] 8.1 — Nakit akışı grafiği (aylık gelir vs gider)
- [ ] 8.2 — Net değer zaman çizelgesi
- [ ] 8.3 — Portföy dağılım grafiği
- [ ] 8.4 — Kategori bazlı harcama kırılımı

## Faz 9 — Cilalama
- [ ] 9.1 — Mobil responsive test
- [ ] 9.2 — PWA kurulumu (next-pwa)
- [ ] 9.3 — Dark mode
- [ ] 9.4 — Yedekleme stratejisi

---

## Değişmeyen Referans Bilgiler
(Bunlar için orijinal dosyaya bakılabilir: veritabanı şeması, güvenlik kontrol listesi, ücretsiz katman limitleri — bu bölüm sadece ilerleme takibi içindir.)
