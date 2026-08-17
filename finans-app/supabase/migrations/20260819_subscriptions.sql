-- Faz 3: Abonelik & plan altyapısı (ödeme sağlayıcısından BAĞIMSIZ kısım).
-- 20260818_onboarding.sql'den SONRA çalıştırılır.
--
-- Ödeme sağlayıcısı (iyzico / Stripe) henüz seçilmedi. Bu migration sağlayıcı
-- ne olursa olsun gereken modeli kurar; sağlayıcıya özel kimlikler serbest
-- metin alanlarda tutulur ve webhook (app/api/abonelik/webhook/route.ts)
-- tarafından doldurulur.
--
-- İKİ TEMEL KURAL:
--   1) Abonelik biterse YAZMA durur, OKUMA devam eder — kullanıcının verisi
--      asla rehin tutulmaz.
--   2) Bordro modülü yalnızca Pro ve Kurumsal planlarda erişilebilir.
--
-- Her iki kural da RLS seviyesinde uygulanır; arayüzdeki `lib/plans.ts`
-- yalnızca aynı mantığın görsel karşılığıdır (menü kilidi, uyarı şeridi).

-- ============================================================
-- 1) subscriptions tablosu — her workspace'in tek aboneliği
-- ============================================================
create table if not exists public.subscriptions (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  plan text not null default 'baslangic' check (plan in ('baslangic', 'pro', 'kurumsal')),
  status text not null default 'deneme'
    check (status in ('deneme', 'aktif', 'odeme_bekliyor', 'iptal', 'suresi_doldu')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  -- Ödeme başarısız olduğunda tamamen kilitlemeden önceki tolerans süresi.
  grace_until timestamptz,
  provider text check (provider in ('iyzico', 'stripe')),
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_status_idx on public.subscriptions (status);

alter table public.subscriptions enable row level security;

-- Workspace üyeleri kendi aboneliklerini GÖREBİLİR ama DEĞİŞTİREMEZ.
-- Yazma yalnızca service role (ödeme webhook'u) üzerinden — aksi halde
-- kullanıcı kendini Kurumsal plana yükseltebilirdi.
drop policy if exists "Abonelik görüntüleme" on public.subscriptions;
create policy "Abonelik görüntüleme"
  on public.subscriptions for select
  using (public.has_account_role(workspace_id, array['yonetici', 'muhasebeci', 'salt_gorunum']));

-- ============================================================
-- 2) Yeni workspace → 14 günlük ücretsiz deneme
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

drop trigger if exists on_workspace_created_trial on public.workspaces;
create trigger on_workspace_created_trial
  after insert on public.workspaces
  for each row execute function public.create_trial_subscription();

-- ============================================================
-- 3) Mevcut workspace'leri koru (grandfathering)
-- ============================================================
-- Faz 3 öncesinde var olan hesaplar ücretli sisteme geçişte kilitlenmemeli.
insert into public.subscriptions (workspace_id, plan, status)
select w.id, 'kurumsal', 'aktif' from public.workspaces w
on conflict (workspace_id) do nothing;

-- ============================================================
-- 4) Etkin plan ve erişim durumu fonksiyonları
-- ============================================================
-- Deneme süresi boyunca ürünün tamamı denenebilsin diye etkin plan 'pro' döner.
create or replace function public.workspace_plan(p_workspace_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select case
       when s.status = 'deneme' and now() < coalesce(s.trial_ends_at, now()) then 'pro'
       when s.status in ('aktif', 'odeme_bekliyor') then s.plan
       else 'baslangic'
     end
     from public.subscriptions s
     where s.workspace_id = p_workspace_id),
    -- Abonelik satırı yoksa (beklenmedik durum) en geniş plana düş; ücretli
    -- sistem yüzünden mevcut veriye erişim kaybedilmesin.
    'kurumsal'
  );
$$;

create or replace function public.workspace_can_write(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select case s.status
       when 'deneme' then now() < coalesce(s.trial_ends_at, now())
       when 'aktif' then true
       when 'odeme_bekliyor' then now() < coalesce(s.grace_until, now())
       else false
     end
     from public.subscriptions s
     where s.workspace_id = p_workspace_id),
    true
  );
$$;

create or replace function public.workspace_has_feature(p_workspace_id uuid, p_feature text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case p_feature
    when 'bordro' then public.workspace_plan(p_workspace_id) in ('pro', 'kurumsal')
    when 'sinirsiz_kullanici' then public.workspace_plan(p_workspace_id) = 'kurumsal'
    else true
  end;
$$;

-- Plana göre azami kullanıcı sayısı (Faz 4'teki ekip davetinde kullanılacak).
create or replace function public.workspace_user_limit(p_workspace_id uuid)
returns int
language sql
security definer
set search_path = public
stable
as $$
  select case public.workspace_plan(p_workspace_id)
    when 'baslangic' then 1
    when 'pro' then 5
    else 2147483647
  end;
$$;

grant execute on function public.workspace_plan(uuid) to authenticated;
grant execute on function public.workspace_can_write(uuid) to authenticated;
grant execute on function public.workspace_has_feature(uuid, text) to authenticated;
grant execute on function public.workspace_user_limit(uuid) to authenticated;

-- ============================================================
-- 5) Plan kısıtlarının RLS'e işlenmesi
-- ============================================================
-- Politikalar tek yerden yeniden üretiliyor (Faz 1'deki aynı desen) ki rol
-- kontrolü + abonelik kontrolü her tabloda tutarlı olsun.
--
-- NOT: SELECT politikalarına abonelik kontrolü BİLİNÇLİ olarak eklenmedi —
-- aboneliği biten kullanıcı verisini okumaya ve dışa aktarmaya devam edebilir.
do $$
declare
  pol record;
  tbl text;
  core_tables text[] := array[
    'transactions', 'bills', 'debts', 'investments', 'assets',
    'categories', 'documents', 'budgets', 'bank_accounts', 'payrolls'
  ];
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and tablename = any(core_tables)
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;

  foreach tbl in array core_tables loop
    if to_regclass('public.' || tbl) is null then
      continue;
    end if;

    if tbl = 'payrolls' then
      execute format(
        'create policy "Workspace görüntüleme" on public.%I for select using (public.has_account_role(workspace_id, array[%L, %L]) and public.workspace_has_feature(workspace_id, %L))',
        tbl, 'yonetici', 'muhasebeci', 'bordro'
      );
      execute format(
        'create policy "Workspace ekleme" on public.%I for insert with check (public.has_account_role(workspace_id, array[%L, %L]) and public.workspace_can_write(workspace_id) and public.workspace_has_feature(workspace_id, %L))',
        tbl, 'yonetici', 'muhasebeci', 'bordro'
      );
      execute format(
        'create policy "Workspace güncelleme" on public.%I for update using (public.has_account_role(workspace_id, array[%L, %L]) and public.workspace_has_feature(workspace_id, %L)) with check (public.has_account_role(workspace_id, array[%L, %L]) and public.workspace_can_write(workspace_id) and public.workspace_has_feature(workspace_id, %L))',
        tbl, 'yonetici', 'muhasebeci', 'bordro', 'yonetici', 'muhasebeci', 'bordro'
      );
      execute format(
        'create policy "Workspace silme" on public.%I for delete using (public.has_account_role(workspace_id, array[%L, %L]) and public.workspace_can_write(workspace_id) and public.workspace_has_feature(workspace_id, %L))',
        tbl, 'yonetici', 'muhasebeci', 'bordro'
      );
    else
      execute format(
        'create policy "Workspace görüntüleme" on public.%I for select using (public.has_account_role(workspace_id, array[%L, %L, %L]))',
        tbl, 'yonetici', 'muhasebeci', 'salt_gorunum'
      );
      execute format(
        'create policy "Workspace ekleme" on public.%I for insert with check (public.has_account_role(workspace_id, array[%L, %L]) and public.workspace_can_write(workspace_id))',
        tbl, 'yonetici', 'muhasebeci'
      );
      execute format(
        'create policy "Workspace güncelleme" on public.%I for update using (public.has_account_role(workspace_id, array[%L, %L])) with check (public.has_account_role(workspace_id, array[%L, %L]) and public.workspace_can_write(workspace_id))',
        tbl, 'yonetici', 'muhasebeci', 'yonetici', 'muhasebeci'
      );
      execute format(
        'create policy "Workspace silme" on public.%I for delete using (public.has_account_role(workspace_id, array[%L, %L]) and public.workspace_can_write(workspace_id))',
        tbl, 'yonetici', 'muhasebeci'
      );
    end if;
  end loop;
end $$;

-- ============================================================
-- DAVRANIŞ NOTU — silme ve güncelleme farkı
-- ============================================================
-- UPDATE'te WITH CHECK ihlali PostgreSQL hatası olarak döner ve kullanıcı
-- arayüzde mesaj görür. DELETE'te ise WITH CHECK yoktur; USING koşulunu
-- geçemeyen satırlar basitçe filtrelenir, yani silme "0 satır etkiledi" ile
-- sessizce sonuçlanır (veri korunur ama hata çıkmaz). Bu yüzden abonelik
-- durumu arayüzde de gösteriliyor (dashboard layout'undaki uyarı şeridi),
-- kullanıcı neden işlem yapamadığını anlasın.
