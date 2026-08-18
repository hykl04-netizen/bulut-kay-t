-- Bonus: Supabase advisor uyarılarının kapatılması.
-- 20260824_invoice_income_recurring_trial.sql'den SONRA çalıştırılır.

-- ============================================================
-- 1) Politikasız RLS tabloları
-- ============================================================
-- Politika olmadığı için bu tablolar fiilen kimseye kapalıydı (yalnızca
-- service role erişebiliyordu). Bu güvenliydi ama "unutulmuş" görünüyordu;
-- niyeti açık hale getiriyoruz.
drop policy if exists "Kendi bildirim kaydını görebilir" on public.push_notification_log;
create policy "Kendi bildirim kaydını görebilir"
  on public.push_notification_log for select
  using (user_id = auth.uid());

drop policy if exists "Workspace sayaç görüntüleme" on public.invoice_counters;
create policy "Workspace sayaç görüntüleme"
  on public.invoice_counters for select
  using (public.has_account_role(workspace_id, array['yonetici', 'muhasebeci']));

-- ============================================================
-- 2) Değişken search_path'li tetikleyici fonksiyonları
-- ============================================================
-- `search_path` sabitlenmezse, çağıran oturumun search_path'ini değiştirerek
-- fonksiyonun beklenmedik bir şemadaki nesneye erişmesi sağlanabilir.
create or replace function public.set_budgets_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;

create or replace function public.set_bank_accounts_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;

-- ============================================================
-- 3) Gereksiz REST erişimini kapat
-- ============================================================
-- Supabase, public şemadaki her fonksiyonu /rest/v1/rpc/<ad> olarak yayınlar.
-- Yalnızca TETİKLEYİCİ olarak kullanılan fonksiyonların dışarıdan çağrılabilir
-- olması için hiçbir sebep yok.
revoke execute on function public.enforce_period_lock_date() from anon, authenticated, public;
revoke execute on function public.enforce_period_lock_due_date() from anon, authenticated, public;
revoke execute on function public.enforce_workspace_user_limit() from anon, authenticated, public;
revoke execute on function public.link_invited_team_member() from anon, authenticated, public;
revoke execute on function public.recalc_invoice_totals() from anon, authenticated, public;
revoke execute on function public.set_workspace_id_default() from anon, authenticated, public;
revoke execute on function public.write_audit_log() from anon, authenticated, public;
revoke execute on function public.set_budgets_updated_at() from anon, authenticated, public;
revoke execute on function public.set_bank_accounts_updated_at() from anon, authenticated, public;

-- Oturum gerektiren RPC'ler — anon rolüne kapalı olsun.
--
-- NOT: has_account_role / has_account_access / workspace_can_write /
-- workspace_has_feature / workspace_plan BİLİNÇLİ olarak dokunulmadı. Bunlar
-- RLS politikalarının İÇİNDE çalışıyor; anon rolünden EXECUTE alınırsa oturum
-- henüz yüklenmemişken yapılan sorgular "boş sonuç" yerine izin hatası
-- döndürür ve arayüzde anlamsız hata mesajları çıkar. Zaten auth.uid() null
-- olduğu için anon'a hiçbir veri döndürmüyorlar.
revoke execute on function public.get_my_sessions() from anon, public;
revoke execute on function public.revoke_my_session(uuid) from anon, public;
revoke execute on function public.revoke_other_sessions() from anon, public;
revoke execute on function public.next_invoice_number(uuid) from anon, public;
revoke execute on function public.einvoice_missing_fields(uuid) from anon, public;
revoke execute on function public.workspace_member_count(uuid) from anon, public;
revoke execute on function public.workspace_user_limit(uuid) from anon, public;
revoke execute on function public.get_account_id_for_user(uuid) from anon, public;

-- Yetkilerin doğru kaldığını doğrulamak için:
--   select p.proname,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_ok,
--          has_function_privilege('anon', p.oid, 'EXECUTE') as anon_ok
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' order by 1;
--
-- KALAN (Dashboard'dan yapılmalı): Authentication > Providers > Email >
-- "Leaked password protection" açılmalı (HaveIBeenPwned kontrolü).
