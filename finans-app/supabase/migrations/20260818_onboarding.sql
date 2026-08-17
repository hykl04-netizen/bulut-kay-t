-- Faz 2: Self-servis kayıt & onboarding.
-- 20260817b_workspaces_app_alignment.sql'den SONRA çalıştırılır.
--
-- Uygulama tarafı:
--   app/(auth)/kayit-ol/page.tsx  → açık kayıt formu (e-posta + şifre + işletme adı)
--   app/auth/callback/route.ts     → e-posta doğrulama dönüş noktası
--   app/kurulum/page.tsx           → 3 adımlı kurulum sihirbazı
--   lib/onboarding.ts              → kategori şablonları + yardımcılar
--
-- ÖNEMLİ — Supabase Dashboard'da elle yapılması gerekenler:
--   1) Authentication > Sign In / Providers > Email: "Confirm email" AÇIK olmalı.
--   2) Authentication > URL Configuration:
--        Site URL      = üretim adresiniz (örn. https://finansapp.vercel.app)
--        Redirect URLs = <site>/auth/callback  ve  http://localhost:3000/auth/callback
--   3) Üretimde kendi SMTP'nizi bağlayın (Resend/Postmark vb.). Supabase'in
--      yerleşik SMTP'si saatte ~3-4 e-posta ile sınırlıdır, gerçek kullanıcı
--      trafiğini kaldırmaz.

-- ============================================================
-- 1) Kurulum sihirbazının tamamlanma durumu
-- ============================================================
-- null = sihirbaz henüz tamamlanmadı. Dashboard layout'u, seçili workspace'in
-- bu alanı boşsa kullanıcıyı /kurulum sayfasına yönlendirir.
alter table public.workspaces add column if not exists onboarded_at timestamptz;

-- Mevcut workspace'ler zaten veri içeriyor — onları sihirbaza sokma.
update public.workspaces set onboarded_at = created_at where onboarded_at is null;

-- Not: `create_workspace()` bu alanı bilinçli olarak doldurmaz; böylece sol
-- menüdeki "Yeni İşletme Ekle" ile açılan her yeni işletme de kendi kategori
-- setini seçebilmek için sihirbazdan geçer.

-- ============================================================
-- 2) Yeni kullanıcının workspace'i kayıt formundaki şirket adını alsın
-- ============================================================
-- /kayit-ol sayfası signUp çağrısında options.data.company_name gönderiyor;
-- bu değer auth.users.raw_user_meta_data içine düşer. Boşsa eski varsayılana
-- ('İşletmem') geri düşülür.
create or replace function public.create_default_workspace_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  v_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'company_name', '')), '');

  insert into public.workspaces (owner_id, name)
  values (new.id, coalesce(v_name, 'İşletmem'));

  return new;
end;
$$;

-- Sadece trigger olarak kullanılıyor — PostgREST üzerinden çağrılabilir olmasın.
revoke execute on function public.create_default_workspace_for_new_user() from anon, authenticated, public;
