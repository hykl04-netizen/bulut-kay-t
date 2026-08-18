-- Öneri 5, 7, 10: Fatura-gelir bağı, deneme hatırlatması, tekrarlayan fatura.
-- 20260823_settings_workspace_scoping.sql'den SONRA çalıştırılır.

-- ============================================================
-- 1) (Öneri 5) Fatura ödendiğinde gelir kaydı oluşsun
-- ============================================================
-- SORUN: Fatura kesip "Ödendi" işaretlediğinizde o para nakit akışında ve
-- raporlarda hiç görünmüyordu; kullanıcı aynı tutarı ikinci kez elle giriyordu.
--
-- Kaydı UYGULAMA oluşturuyor (DB tetikleyicisi DEĞİL) — çünkü yedekten geri
-- yükleme sırasında hem faturalar hem işlemler yazılıyor; tetikleyici olsaydı
-- aynı gelir iki kez oluşurdu. Aşağıdaki tekil indeks, olası bir uygulama
-- hatasında bile çift kayıt oluşmasını veritabanı seviyesinde engelliyor.
alter table public.transactions
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null;

create unique index if not exists transactions_invoice_unique
  on public.transactions (invoice_id)
  where invoice_id is not null;

create index if not exists transactions_invoice_idx
  on public.transactions (workspace_id, invoice_id)
  where invoice_id is not null;

-- ============================================================
-- 2) (Öneri 7) Deneme bitiş hatırlatması
-- ============================================================
-- Deneme uyarısı yalnızca panelde görünüyordu; giriş yapmayan kullanıcı
-- denemesinin bittiğini hiç öğrenmiyordu. Hangi hatırlatmanın gönderildiği
-- burada tutuluyor ki günlük cron aynı e-postayı tekrar göndermesin.
alter table public.subscriptions
  add column if not exists last_trial_reminder text
  check (last_trial_reminder in ('3_gun', '1_gun', 'bitti'));

comment on column public.subscriptions.last_trial_reminder is
  'Gönderilen son deneme hatırlatması. null = hiç gönderilmedi. Sıra: 3_gun -> 1_gun -> bitti.';

-- ============================================================
-- 3) (Öneri 10) Tekrarlayan satış faturası
-- ============================================================
-- Gelir/gider ve gelen faturada tekrarlayan işlem vardı, KESİLEN faturada
-- yoktu. Desen `transactions`/`bills` ile birebir aynı.
alter table public.invoices add column if not exists is_recurring boolean not null default false;
alter table public.invoices add column if not exists recurrence_period text
  check (recurrence_period in ('aylik', 'yillik'));
alter table public.invoices add column if not exists recurrence_end_date date;
alter table public.invoices add column if not exists series_id uuid;

create index if not exists invoices_recurring_idx
  on public.invoices (workspace_id, series_id)
  where is_recurring = true;
