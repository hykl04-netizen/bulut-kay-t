# Kişisel Finans Web Uygulaması — Teknik Yol Haritası

## 0. Proje Özeti
- **Kullanıcı:** Tek kullanıcı, şifre korumalı giriş
- **Kapsam:** Gelir-gider, yatırım portföyü, borç-alacak, fatura/masraf, varlık-birikim + genişletilebilir kategori sistemi
- **Erişim:** PC + mobil (responsive web, PWA olarak da kurulabilir)
- **Kayıt mantığı:** Kullanıcı JSON indirmez, "Kaydet" dediğinde veya otomatik olarak gerçek veritabanına yazılır
- **Bütçe:** Tamamen ücretsiz katmanlarla başlanacak

---

## 1. Teknoloji Stack Kararı

| Katman | Seçim | Neden |
|---|---|---|
| Frontend | **Next.js 14+ (App Router) + TypeScript** | GitHub + Vercel ile sıfır konfig deploy, hem SSR hem statik sayfa desteği |
| UI | **Tailwind CSS + shadcn/ui** | Hızlı, mobil-uyumlu, bakımı kolay |
| Tablo bileşeni | **TanStack Table v8 + custom inline-edit** (alternatif: AG Grid Community — ücretsiz sürüm) | Excel hissi, hücre bazlı düzenleme, sıralama/filtreleme ücretsiz |
| Grafik/Rapor | **Recharts** | React-native entegrasyon, ileri seviye grafikler (line, area, pie, stacked bar) için yeterli |
| Backend + DB | **Supabase (PostgreSQL + Auth + Row Level Security)** | Ücretsiz katman: 500MB DB, 50k aylık aktif kullanıcı, gerçek zamanlı DB, tek kullanıcı için fazlasıyla yeterli |
| Auth | **Supabase Auth (email + password)** | Şifre korumalı giriş, session yönetimi hazır, ekstra backend yazmaya gerek yok |
| Hosting | **Vercel (Free/Hobby plan)** | GitHub push → otomatik deploy, ücretsiz SSL, custom domain desteği |
| Versiyon kontrol | **GitHub** | CI/CD zaten Vercel entegrasyonuyla otomatik |
| PWA | **next-pwa** paketi | "Ana ekrana ekle" ile mobilde native app hissi |

> Not: Supabase yerine Firebase de olur ama Postgres + SQL sorgu gücü + ücretsiz RLS (satır bazlı güvenlik) finans verisi için Supabase'i daha uygun kılıyor.

---

## 2. Repo / Klasör Yapısı

```
finans-app/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # sidebar + auth guard
│   │   ├── page.tsx                 # genel özet dashboard
│   │   ├── gelir-gider/page.tsx
│   │   ├── yatirim/page.tsx
│   │   ├── borc-alacak/page.tsx
│   │   ├── fatura-masraf/page.tsx
│   │   ├── varlik/page.tsx
│   │   ├── raporlar/page.tsx
│   ├── api/                         # gerekirse server actions/route handlers
├── components/
│   ├── ui/                          # shadcn bileşenleri
│   ├── data-table/                  # ortak Excel-benzeri tablo bileşeni
│   ├── charts/
├── lib/
│   ├── supabase/client.ts
│   ├── supabase/server.ts
│   ├── types.ts
├── supabase/
│   ├── migrations/                  # SQL şema dosyaları (versiyonlanabilir!)
├── public/
├── .env.local                       # (git'e eklenmeyecek)
├── next.config.js
```

---

## 3. Veritabanı Şeması (Supabase / PostgreSQL)

Tüm tablolar `user_id` içerir + **Row Level Security (RLS)** ile "sadece kendi verini görürsün" kuralı — tek kullanıcı olsa da güvenlik için şart.

```sql
-- Ortak: kategori tablosu (genişletilebilir sistem)
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  type text not null,          -- 'gelir', 'gider', 'yatirim', 'varlik' vs.
  name text not null,
  color text,
  created_at timestamptz default now()
);

-- Gelir-Gider
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  type text not null check (type in ('gelir','gider')),
  category_id uuid references categories,
  amount numeric(14,2) not null,
  currency text default 'TRY',
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Yatırım Portföyü
create table investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  asset_type text not null,     -- 'hisse','doviz','kripto','fon','altin'
  symbol text not null,         -- 'THYAO','USD','BTC' vs.
  quantity numeric(18,8) not null,
  avg_cost numeric(14,4),
  current_price numeric(14,4),  -- manuel girilecek veya API ile çekilecek
  currency text default 'TRY',
  updated_at timestamptz default now()
);

-- Borç-Alacak
create table debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  direction text not null check (direction in ('borc','alacak')),
  counterparty text not null,   -- kime/kimden
  amount numeric(14,2) not null,
  currency text default 'TRY',
  due_date date,
  status text default 'acik' check (status in ('acik','kapandi')),
  notes text,
  created_at timestamptz default now()
);

-- Fatura/Masraf
create table bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  amount numeric(14,2) not null,
  due_date date,
  is_recurring boolean default false,
  recurrence_period text,        -- 'aylik','yillik' vs.
  status text default 'odenmedi' check (status in ('odendi','odenmedi')),
  category_id uuid references categories,
  created_at timestamptz default now()
);

-- Varlık / Birikim
create table assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  asset_name text not null,      -- 'Ev','Araba','Altın' vs.
  asset_type text,
  current_value numeric(14,2),
  currency text default 'TRY',
  notes text,
  updated_at timestamptz default now()
);

-- RLS aktifleştirme (her tablo için tekrarlanır)
alter table transactions enable row level security;
create policy "kendi verisi" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- ... aynı policy diğer tüm tablolara uygulanacak
```

> Her yeni "ne eklenebilir" ihtiyacı için (örn. kredi kartı takibi, hedef/bütçe planı) bu yapıya kolayca yeni tablo eklenebilir — şema baştan esnek tasarlandı.

---

## 4. Kimlik Doğrulama Akışı
1. Supabase Auth ile tek kullanıcı manuel oluşturulur (Supabase dashboard'dan, kayıt formu bile gerekmez)
2. `/login` sayfası → email+şifre → Supabase session cookie
3. `(dashboard)` route grubunda middleware ile session kontrolü — session yoksa `/login`'e yönlendirme
4. Opsiyonel ekstra güvenlik: Supabase'de "sadece bu email login olabilir" kısıtı + güçlü şifre

---

## 5. Excel-Benzeri Tablo Davranışı (Kritik Kısım)
Kullanıcı "kaydet" dediğinde/veya hücreden çıktığında otomatik DB yazımı için:

- **Inline cell editing:** çift tıkla → düzenle → `onBlur` veya Enter'da otomatik `supabase.from(...).update()`
- **Optimistic UI:** önce ekranda güncelle, arka planda DB'ye yaz, hata olursa geri al + toast bildirim ("Kaydedilemedi")
- **Debounce:** hızlı yazımlarda her tuşta değil, 500ms sonra kaydet
- **Toplu satır ekleme:** "+ Yeni Satır" butonu → boş satır → doldur → kaydet
- **Silme:** satır sağ tık / swipe (mobilde) → onay → soft delete (isteğe bağlı `deleted_at` kolonu) veya hard delete
- **Excel'den yapıştırma desteği (bonus):** clipboard paste event yakalanıp satır satır parse edilip toplu insert edilebilir — istersen sonradan ekleriz

Kullanıcı hiçbir zaman dosya indirip yüklemeyecek; tüm işlem tarayıcıda görünür-yazılır şekilde gerçek zamanlı.

---

## 6. Rapor / Analiz Modülü (İleri Seviye)
- **Nakit akışı grafiği:** aylık gelir vs gider (stacked/grouped bar)
- **Net değer zaman çizelgesi:** varlıklar - borçlar, aylık trend (area chart)
- **Portföy dağılımı:** varlık tipine göre pasta grafik (hisse/döviz/kripto/altın oranı)
- **Kategori bazlı harcama kırılımı:** en çok harcanan kategoriler (bar/pie)
- **Bütçe vs gerçekleşen:** hedef koyup karşılaştırma (ileri faz)
- Tüm hesaplamalar **Supabase SQL view'ları veya Postgres fonksiyonları** ile sunucu tarafında özetlenip frontend'e hafif veri gönderilecek (performans için — ham veriyi çekip frontend'de toplama yapmayacağız)

---

## 7. Mobil Uyum & PWA
- Tailwind ile mobile-first responsive tasarım (tablo mobilde yatay scroll veya kart görünümüne dönüşür)
- `next-pwa` ile manifest.json + service worker → "Ana Ekrana Ekle"
- Offline tam senkron zor olduğundan ilk fazda **offline'ı kapsam dışı bırakıp** sadece "hızlı erişim/app gibi görünüm" hedefleniyor

---

## 8. Deployment Akışı
1. Kod GitHub'a push edilir (private repo önerilir — finans verisi şeması içerdiği için)
2. Vercel, GitHub reposuna bağlanır → her push'ta otomatik deploy
3. Environment variables (Supabase URL + anon key) Vercel dashboard'a girilir, **asla kod içine yazılmaz**
4. Custom domain (isteğe bağlı, ücretsiz de bağlanabilir eğer domain'in varsa)

---

## 9. Güvenlik Kontrol Listesi
- [ ] Supabase RLS tüm tablolarda aktif ve test edilmiş (başka user_id ile erişim denenmeli)
- [ ] `.env.local` `.gitignore`'da
- [ ] Supabase anon key public olabilir (RLS koruduğu için) ama service_role key **asla** frontend'e sızmamalı
- [ ] Login sayfasında brute-force koruması (Supabase zaten rate-limit uyguluyor)
- [ ] HTTPS zorunlu (Vercel default olarak sağlıyor)
- [ ] Opsiyonel: 2FA (Supabase destekliyor, ileri faz)

---

## 10. Ücretsiz Katman Limitleri (Bilinmesi Gereken)
- **Supabase Free:** 500MB DB, 1GB dosya depolama, 50.000 aylık aktif kullanıcı, 7 gün sonra proje 1 hafta inaktiflikte "pause" olabilir (login ile tekrar aktifleşir) — tek kullanıcı için pratikte sorun yaratmaz
- **Vercel Free:** Sınırsız statik istek, 100GB bandwidth/ay — kişisel kullanım için fazlasıyla yeterli
- İleri günlerde büyürse Supabase Pro ($25/ay) veya Vercel Pro'ya geçiş sorunsuz

---

## 11. Geliştirme Fazları

**Faz 1 — Temel İskelet**
- [ ] Next.js + Tailwind + shadcn kurulumu
- [ ] Supabase proje oluşturma + şema migration
- [ ] Auth (login/logout) akışı
- [ ] Dashboard layout + sidebar navigasyon

**Faz 2 — Çekirdek Tablo Modülleri**
- [ ] Gelir-Gider tablosu (CRUD + inline edit)
- [ ] Kategori yönetimi
- [ ] Borç-Alacak tablosu
- [ ] Fatura/Masraf tablosu (tekrarlayan fatura desteğiyle)

**Faz 3 — Yatırım & Varlık**
- [ ] Yatırım portföyü tablosu
- [ ] Varlık/birikim tablosu
- [ ] (Opsiyonel) Canlı döviz/kripto kuru API entegrasyonu

**Faz 4 — Raporlama**
- [ ] Net değer zaman çizelgesi
- [ ] Nakit akışı grafiği
- [ ] Portföy dağılım grafiği
- [ ] Kategori bazlı analiz

**Faz 5 — Cilalama**
- [ ] Mobil responsive test + PWA kurulumu
- [ ] Excel'den yapıştırma desteği
- [ ] Dark mode (opsiyonel)
- [ ] Yedekleme (Supabase otomatik günlük backup — free planda kısıtlı, istersen manuel export cron'u ekleriz)

---

## 12. Sonraki Adım
Onaylarsan sırasıyla şunları başlatabiliriz:
1. Next.js + Supabase proje iskeletini oluşturma (kod olarak)
2. SQL migration dosyalarını hazırlama
3. Auth + dashboard layout
4. İlk tablo modülü (örn. Gelir-Gider) uçtan uca çalışır halde

Hangisinden başlamamı istersin?
