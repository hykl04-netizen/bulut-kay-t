-- 20260905 — PAKETLEME: aile hesapları ücretsiz, ücretli işletme/müşavir
-- planı aile hesabını da yükseltir.
--
-- Gerekçe: aile modülü sunucuda neredeyse hiçbir maliyet çıkarmıyor
-- (fatura yok, bordro yok, mükellef yok) ve Türkiye'de aile bütçesi
-- uygulamasına ödeme isteği düşük. Ücretsiz bırakmak fiyat sayfasını
-- sadeleştiriyor ve satın alma hunisinin girişi oluyor. Ücretli planı
-- olan kullanıcının kendi aile hesabı da aynı plana yükseliyor —
-- "işletme hesabınıza ailenizin bütçesi dahil".
--
-- ÖNEMLİ: kural veritabanında duruyor, arayüzde değil. Arayüzde dursaydı
-- bir sonraki ekranda unutulur ve aile hesabı bir gün sessizce kilitlenirdi.

create or replace function public.workspace_can_write(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    when (select w.type from public.workspaces w where w.id = p_workspace_id) = 'aile'
      then true
    else coalesce(
      (select case s.status
         when 'deneme' then now() < coalesce(s.trial_ends_at, now())
         when 'aktif' then true
         when 'odeme_bekliyor' then now() < coalesce(s.grace_until, now())
         else false
       end
       from public.subscriptions s
       where s.workspace_id = p_workspace_id),
      true)
  end;
$$;

create or replace function public.workspace_plan(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  with hedef as (
    select w.type, w.owner_id from public.workspaces w where w.id = p_workspace_id
  ),
  kendi as (
    select coalesce(
      (select case
         when s.status = 'deneme' and now() < coalesce(s.trial_ends_at, now()) then 'pro'
         when s.status in ('aktif', 'odeme_bekliyor') then s.plan
         else 'baslangic'
       end
       from public.subscriptions s
       where s.workspace_id = p_workspace_id),
      'kurumsal') as plan
  ),
  capraz as (
    select max(case s.plan when 'kurumsal' then 3 when 'pro' then 2 else 1 end) as derece
    from public.workspaces w
    join public.subscriptions s on s.workspace_id = w.id
    where w.owner_id = (select owner_id from hedef)
      and w.type <> 'aile'
      and s.status in ('aktif', 'odeme_bekliyor')
  )
  select case
    when (select type from hedef) <> 'aile' then (select plan from kendi)
    when coalesce((select derece from capraz), 0) >= 3 then 'kurumsal'
    when coalesce((select derece from capraz), 0) = 2 then 'pro'
    else (select plan from kendi)
  end;
$$;

revoke execute on function public.workspace_can_write(uuid) from public, anon;
revoke execute on function public.workspace_plan(uuid) from public, anon;
grant execute on function public.workspace_can_write(uuid) to authenticated;
grant execute on function public.workspace_plan(uuid) to authenticated;
