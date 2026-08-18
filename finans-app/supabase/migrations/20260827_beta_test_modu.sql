-- ============================================================
-- BETA TEST MODU — abonelik kilidi geçici olarak kaldırıldı
-- ============================================================
-- GEREKÇE: kapalı aile/arkadaş testi sırasında hesapların 14 gün sonra
-- yazma erişimini kaybetmesi test etmeyi imkânsız kılıyor; ödeme sağlayıcısı
-- da henüz seçilmedi, yani kullanıcının ödeme yapıp kilidi açma yolu yok.
--
-- NE YAPIYOR: hem mevcut hem yeni workspace'ler 'kurumsal' plan + 'aktif'
-- durumla başlıyor. Böylece hiçbir kilit devreye girmiyor VE bordro gibi
-- plan bazlı kilitli modüller de test edilebiliyor.
--
-- !!! GERİ ALMA — yatırımcı sunumundan önce 20260828_beta_modu_kapat.sql
--     çalıştırılacak. Asıl 14 günlük sürüm: 20260819_subscriptions.sql, 2) bölümü.
-- ============================================================

update public.subscriptions
set plan = 'kurumsal',
    status = 'aktif',
    trial_ends_at = null,
    grace_until = null;

create or replace function public.create_trial_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- BETA: normalde ('baslangic', 'deneme', now() + 14 gün) idi.
  insert into public.subscriptions (workspace_id, plan, status, trial_ends_at)
  values (new.id, 'kurumsal', 'aktif', null)
  on conflict (workspace_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.create_trial_subscription() from anon, authenticated, public;

comment on function public.create_trial_subscription() is
  'BETA TEST MODU: yeni hesaplar kurumsal/aktif başlar. Yatırımcı sunumundan önce 14 günlük denemeye geri alınacak.';
