-- ============================================================
-- BETA TEST MODU'NU KAPAT — 14 günlük denemeye geri dön
-- ============================================================
-- Yatırımcı sunumundan / gerçek kullanıma açmadan ÖNCE çalıştırılacak.
-- 20260827_beta_test_modu.sql'i geri alır.
--
-- DİKKAT: bu dosyayı çalıştırmadan önce ödeme sağlayıcısının bağlı
-- olduğundan emin olun; aksi halde denemesi biten kullanıcı kilitlenir
-- ve ödeme yapıp açmanın bir yolu olmaz.
-- ============================================================

create or replace function public.create_trial_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (workspace_id, plan, status, trial_ends_at)
  values (new.id, 'baslangic', 'deneme', now() + interval '14 days')
  on conflict (workspace_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.create_trial_subscription() from anon, authenticated, public;

comment on function public.create_trial_subscription() is
  'Yeni workspace için 14 günlük Pro denemesi açar (Faz 3).';

-- Test hesaplarını da denemeye döndürmek isterseniz (İSTEĞE BAĞLI —
-- gerçek müşteriniz varsa ÇALIŞTIRMAYIN):
-- update public.subscriptions
-- set plan = 'baslangic', status = 'deneme',
--     trial_ends_at = now() + interval '14 days';
