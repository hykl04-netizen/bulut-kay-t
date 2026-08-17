-- Tekrarlayan işlem otomasyonu + çoklu para birimi + banka hesapları.
-- Bu dosya otomatik çalışmaz — Supabase projenizin SQL Editor'ünde elle çalıştırmanız gerekir
-- (Dashboard > SQL Editor > New query > yapıştır > Run).

-- ============================================================
-- 1) TEKRARLAYAN İŞLEM OTOMASYONU
-- ============================================================
-- `bills` tablosunda is_recurring/recurrence_period zaten vardı; otomatik
-- yeni kayıt üretimini takip edebilmek için "seri kimliği" ve bitiş tarihi
-- ekliyoruz. Aynı serideki tüm satırlar (ilk kayıt + otomatik üretilenler)
-- aynı series_id'yi paylaşır.
alter table public.bills
  add column if not exists series_id uuid,
  add column if not exists recurrence_end_date date;

-- `transactions` tablosunda tekrar desteği hiç yoktu (maaş, kira geliri,
-- abonelik gideri gibi düzenli gelir/giderler için ekliyoruz).
alter table public.transactions
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurrence_period text check (recurrence_period in ('aylik', 'yillik')),
  add column if not exists recurrence_end_date date,
  add column if not exists series_id uuid;

-- ============================================================
-- 2) ÇOKLU PARA BİRİMİ DESTEĞİ (gelir/gider işlemleri)
-- ============================================================
alter table public.transactions
  add column if not exists currency text not null default 'TRY',
  add column if not exists exchange_rate numeric(14, 6) not null default 1,
  add column if not exists try_equivalent numeric(14, 2);

-- Var olan kayıtlarda try_equivalent boşsa (yeni kolon), TRY varsayımıyla
-- amount'u kopyalayarak dolduruyoruz — böylece rapor/özet toplamları hemen
-- doğru çalışır.
update public.transactions
  set try_equivalent = amount
  where try_equivalent is null;

-- ============================================================
-- 3) BANKA HESAPLARI (manuel hesap + ekstre/CSV içe aktarma)
-- ============================================================
-- NOT: Gerçek "Open Banking" (bankaya canlı API ile bağlanma) BDDK lisanslı
-- bir aracı kurum (TPP) hesabı gerektirir — bkz. uygulamadaki açıklama.
-- Bu tablo, o entegrasyon ileride eklendiğinde de kullanılabilecek şekilde
-- tasarlandı; şu an için manuel hesap tanımı + CSV ekstre içe aktarma akışını
-- destekliyor.
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  bank_name text,
  iban_last4 text,
  currency text not null default 'TRY',
  current_balance numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bank_accounts enable row level security;

create policy "Kullanıcılar kendi banka hesaplarını görebilir"
  on public.bank_accounts for select
  using (auth.uid() = user_id);

create policy "Kullanıcılar kendi banka hesaplarını ekleyebilir"
  on public.bank_accounts for insert
  with check (auth.uid() = user_id);

create policy "Kullanıcılar kendi banka hesaplarını güncelleyebilir"
  on public.bank_accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Kullanıcılar kendi banka hesaplarını silebilir"
  on public.bank_accounts for delete
  using (auth.uid() = user_id);

create or replace function public.set_bank_accounts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_bank_accounts_updated_at on public.bank_accounts;
create trigger trg_bank_accounts_updated_at
  before update on public.bank_accounts
  for each row execute function public.set_bank_accounts_updated_at();

-- İçe aktarılan ekstre satırlarını normal `transactions` tablosuna yazıyoruz
-- (raporlar/özet panel/bütçe zaten bu tabloyu kullanıyor). Hangi hesaptan
-- geldiğini ve CSV'deki orijinal referansı (varsa) tutarak aynı ekstrenin
-- yanlışlıkla iki kez aktarılmasını engelliyoruz.
alter table public.transactions
  add column if not exists bank_account_id uuid references public.bank_accounts(id) on delete set null,
  add column if not exists external_ref text;

create unique index if not exists transactions_bank_external_ref_uniq
  on public.transactions (bank_account_id, external_ref)
  where external_ref is not null;
