-- Faz 1: Çoklu şirket (workspace) altyapısı.
-- Bu dosya otomatik çalışmaz — Supabase projenizin SQL Editor'ünde elle
-- çalıştırmanız gerekir (Dashboard > SQL Editor > New query > yapıştır > Run).
--
-- ÖNEMLİ — ÇALIŞTIRMADAN ÖNCE YEDEK ALIN: Bu migration ~10 ana tabloya yeni
-- bir kolon ekliyor, yeni tetikleyiciler kuruyor ve RLS politikalarını
-- değiştiriyor. Uygulamanın "Yedek Al" özelliğiyle (veya Supabase Dashboard
-- > Database > Backups) önce bir yedek almanız önerilir.
--
-- ============================================================
-- YAKLAŞIM ÖZETİ
-- ============================================================
-- Şu ana kadar "hesap" kavramı = bir kullanıcının auth id'siydi (bkz.
-- 20260816_team_roles.sql: her veri tablosundaki `user_id` kolonu, hesap
-- sahibinin auth uid'siydi). Bu migration gerçek bir `workspaces` tablosu
-- ekleyip mevcut hesapları BİREBİR bu tabloya taşıyor: her mevcut auth
-- kullanıcısı için id'si kendi auth id'siyle AYNI olan bir workspace satırı
-- oluşturuluyor. Böylece mevcut veri (`user_id` kolonları,
-- `team_members.account_id` değerleri) hiç değişmeden yeni
-- `workspaces.id`'lerle eşleşiyor — riskli bir UUID yeniden-eşleme
-- migration'ına gerek kalmıyor.
--
-- Ana tablolar (`transactions`, `bills`, `debts`, `investments`, `assets`,
-- `categories`, `documents`, `budgets`, `bank_accounts`, `payrolls`) yeni bir
-- `workspace_id` kolonu kazanıyor ve RLS artık bu kolon üzerinden çalışıyor.
-- Mevcut `user_id` kolonu SİLİNMİYOR/anlamı değiştirilmiyor — hâlâ "bu kayıt
-- hangi hesaba/workspace'e ait" bilgisini taşıyor ve uygulama kodu (13+
-- sayfa) hâlâ `user_id` alanına yazıyor; yeni bir BEFORE INSERT tetikleyicisi
-- (`set_workspace_id_default`) `workspace_id` boş bırakılırsa otomatik
-- `user_id` değerinden dolduruyor. Bu sayede tek bir sayfa/insert kodu
-- değiştirmeden mevcut uygulama sorunsuz çalışmaya devam ediyor.
--
-- Bir kullanıcı artık BİRDEN FAZLA workspace sahibi olabilir (yeni
-- `create_workspace()` fonksiyonuyla) ve/veya başka workspace'lere ekip
-- üyesi olarak davetli olabilir. `get_user_workspaces()` fonksiyonu
-- kullanıcının erişebildiği tüm workspace'leri (rolüyle birlikte) döner —
-- uygulama tarafında yeni `lib/supabase/workspace.ts` bunu kullanıyor.
--
-- Yeni kullanıcı auth.users'a eklendiğinde otomatik kendi adına boş bir
-- workspace oluşturuluyor (en alttaki trigger) — hem mevcut "davetsiz" kayıt
-- akışı hem de Faz 2'de eklenecek self-servis kayıt için hazır.

-- ============================================================
-- 1) workspaces tablosu
-- ============================================================
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'İşletmem',
  created_at timestamptz not null default now()
);

create index if not exists workspaces_owner_idx on public.workspaces (owner_id);

alter table public.workspaces enable row level security;

-- ============================================================
-- 2) Mevcut kullanıcıları workspace'e taşı (id = kullanıcının auth id'si)
-- ============================================================
insert into public.workspaces (id, owner_id, name, created_at)
select u.id, u.id, coalesce(nullif(trim(cs.company_name), ''), 'İşletmem'), now()
from auth.users u
left join public.company_settings cs on cs.user_id = u.id
on conflict (id) do nothing;

-- ============================================================
-- 3) Ana tablolara workspace_id kolonu ekle ve doldur
-- ============================================================
do $$
declare
  tbl text;
  core_tables text[] := array[
    'transactions', 'bills', 'debts', 'investments', 'assets',
    'categories', 'documents', 'budgets', 'bank_accounts', 'payrolls'
  ];
begin
  foreach tbl in array core_tables loop
    if to_regclass('public.' || tbl) is null then
      continue; -- tablo projenizde yoksa sessizce atla
    end if;
    execute format('alter table public.%I add column if not exists workspace_id uuid references public.workspaces(id)', tbl);
    execute format('update public.%I set workspace_id = user_id where workspace_id is null', tbl);
    execute format('alter table public.%I alter column workspace_id set not null', tbl);
    execute format('create index if not exists %I_workspace_idx on public.%I (workspace_id)', tbl, tbl);
  end loop;
end $$;

-- ============================================================
-- 4) workspace_id boş bırakılırsa user_id'den otomatik doldur
--    (mevcut ~85 dosyadaki hiçbir insert çağrısı değişmeden çalışmaya
--    devam etsin diye — bkz. yukarıdaki not)
-- ============================================================
create or replace function public.set_workspace_id_default()
returns trigger
language plpgsql
as $$
begin
  if new.workspace_id is null then
    new.workspace_id := new.user_id;
  end if;
  return new;
end;
$$;

do $$
declare
  tbl text;
  core_tables text[] := array[
    'transactions', 'bills', 'debts', 'investments', 'assets',
    'categories', 'documents', 'budgets', 'bank_accounts', 'payrolls'
  ];
begin
  foreach tbl in array core_tables loop
    if to_regclass('public.' || tbl) is null then
      continue;
    end if;
    execute format('drop trigger if exists trg_%I_workspace_default on public.%I', tbl, tbl);
    execute format(
      'create trigger trg_%I_workspace_default before insert on public.%I for each row execute function public.set_workspace_id_default()',
      tbl, tbl
    );
  end loop;
end $$;

-- ============================================================
-- 5) team_members.account_id -> workspace_id (isim + anlam netleşiyor)
-- ============================================================
-- Postgres, RENAME COLUMN sonrası bu kolonu kullanan RLS politikalarını
-- (views/policies pg_depend ile takip edilir) otomatik günceller — bu
-- yüzden team_members'ın kendi 4 politikasını yeniden yazmaya gerek yok.
-- Fonksiyon gövdeleri (düz metin olarak saklanır) İSE elle güncellenmeli —
-- aşağıdaki 6. adımda yapılıyor.
alter table public.team_members rename column account_id to workspace_id;

alter table public.team_members drop constraint if exists team_members_account_id_fkey;
alter table public.team_members
  add constraint team_members_workspace_id_fkey
  foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter index if exists team_members_account_idx rename to team_members_workspace_idx;

-- ============================================================
-- 6) Yardımcı fonksiyonları workspace-farkında hale getir
-- ============================================================
-- ÖNEMLİ: has_account_role artık sahiplik kontrolünü `auth.uid() =
-- p_account_id` kısayoluyla DEĞİL, workspaces.owner_id üzerinden yapıyor —
-- eski kısayol sadece id'si kullanıcı uid'siyle aynı olan (yukarıda
-- taşınan) "ilk" workspace'lerde doğru çalışırdı; create_workspace() ile
-- oluşturulan YENİ workspace'lerin id'si rastgele üretildiğinden bu kontrol
-- olmadan gerçek sahip bile erişimini kaybederdi.
create or replace function public.get_account_id_for_user(p_user_id uuid default auth.uid())
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select workspace_id from public.team_members
       where member_user_id = p_user_id and status = 'aktif'
       limit 1),
    p_user_id
  );
$$;

create or replace function public.has_account_role(p_account_id uuid, p_allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    case
      when exists (
        select 1 from public.workspaces
        where id = p_account_id and owner_id = auth.uid()
      ) then true
      else exists (
        select 1 from public.team_members
        where workspace_id = p_account_id
          and member_user_id = auth.uid()
          and status = 'aktif'
          and role = any(p_allowed_roles)
      )
    end;
$$;

create or replace function public.has_account_access(p_account_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_account_role(p_account_id, array['yonetici', 'muhasebeci', 'salt_gorunum']);
$$;

-- ============================================================
-- 7) Yeni: çoklu workspace fonksiyonları
-- ============================================================
-- Kullanıcının erişebildiği tüm workspace'leri (sahip olduğu + aktif ekip
-- üyesi olduğu) rolüyle birlikte döner. RLS'e takılmadan çalışır.
create or replace function public.get_user_workspaces()
returns table (workspace_id uuid, name text, role text, is_owner boolean)
language sql
security definer
set search_path = public
stable
as $$
  select x.workspace_id, x.name, x.role, x.is_owner
  from (
    select w.id as workspace_id, w.name, 'sahip'::text as role, true as is_owner
    from public.workspaces w
    where w.owner_id = auth.uid()
    union all
    select w.id as workspace_id, w.name, tm.role, false as is_owner
    from public.team_members tm
    join public.workspaces w on w.id = tm.workspace_id
    where tm.member_user_id = auth.uid() and tm.status = 'aktif'
  ) x
  order by x.name;
$$;

grant execute on function public.get_user_workspaces() to authenticated;

-- Oturum açan kullanıcı adına yeni bir işletme/workspace oluşturur ve
-- id'sini döner (sahibi otomatik auth.uid()).
create or replace function public.create_workspace(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'İşletme adı boş olamaz.';
  end if;

  insert into public.workspaces (owner_id, name)
  values (auth.uid(), trim(p_name))
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_workspace(text) to authenticated;

-- Yeni kayıt olan her kullanıcıya otomatik kişisel bir workspace açar
-- (mevcut "davetle katılma" trigger'ından — link_invited_team_member —
-- bağımsız çalışır; davet edilen bir kullanıcı hem kendi boş workspace'ine
-- hem de davetli olduğu workspace'e sahip olur, bu kasıtlı ve zararsızdır).
create or replace function public.create_default_workspace_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspaces (owner_id, name)
  values (new.id, 'İşletmem');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_default_workspace on auth.users;
create trigger on_auth_user_created_default_workspace
  after insert on auth.users
  for each row execute function public.create_default_workspace_for_new_user();

-- ============================================================
-- 8) workspaces tablosu RLS politikaları
-- ============================================================
drop policy if exists "Workspace görüntüleme" on public.workspaces;
create policy "Workspace görüntüleme"
  on public.workspaces for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.team_members
      where team_members.workspace_id = workspaces.id
        and team_members.member_user_id = auth.uid()
        and team_members.status = 'aktif'
    )
  );

drop policy if exists "Workspace sahibi güncelleyebilir" on public.workspaces;
create policy "Workspace sahibi güncelleyebilir"
  on public.workspaces for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Insert sadece create_workspace() (SECURITY DEFINER) üzerinden yapılıyor,
-- delete Faz 1 kapsamı dışında (ileride "işletmeyi sil" özelliğiyle
-- eklenebilir) — bu yüzden insert/delete policy'si bilinçli olarak açılmadı.

-- ============================================================
-- 9) Ana tabloların RLS politikalarını workspace-farkında yeniden yaz
-- ============================================================
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
      -- Bordro: salt_görünüm hariç (maaş verisi hassas).
      execute format(
        'create policy "Workspace görüntüleme" on public.%I for select using (public.has_account_role(workspace_id, array[%L, %L]))',
        tbl, 'yonetici', 'muhasebeci'
      );
    else
      execute format(
        'create policy "Workspace görüntüleme" on public.%I for select using (public.has_account_role(workspace_id, array[%L, %L, %L]))',
        tbl, 'yonetici', 'muhasebeci', 'salt_gorunum'
      );
    end if;

    execute format(
      'create policy "Workspace ekleme" on public.%I for insert with check (public.has_account_role(workspace_id, array[%L, %L]))',
      tbl, 'yonetici', 'muhasebeci'
    );
    execute format(
      'create policy "Workspace güncelleme" on public.%I for update using (public.has_account_role(workspace_id, array[%L, %L])) with check (public.has_account_role(workspace_id, array[%L, %L]))',
      tbl, 'yonetici', 'muhasebeci', 'yonetici', 'muhasebeci'
    );
    execute format(
      'create policy "Workspace silme" on public.%I for delete using (public.has_account_role(workspace_id, array[%L, %L]))',
      tbl, 'yonetici', 'muhasebeci'
    );
  end loop;
end $$;

-- Not: `audit_log` politikası (`has_account_role(user_id, ...)`) kasıtlı
-- olarak DEĞİŞTİRİLMEDİ — has_account_role'un dış imzası/sözleşmesi aynı
-- kaldığı (bir "hesap/workspace id" alıp bool döner) için audit_log.user_id
-- hâlâ doğru şekilde çözümleniyor, ek bir işlem gerekmiyor. Aynı sebeple
-- `donem_kilitleme`/`period_locks`, `ayarlar`/company_settings gibi
-- sadece-sahibe-özel tablolar da bilinçli olarak bu migration'a dahil
-- edilmedi (önceki migration'daki notla aynı gerekçe).

-- ============================================================
-- ÖNEMLİ NOTLAR
-- ============================================================
-- 1) Bu migration'dan sonra uygulama kodunda ZORUNLU bir değişiklik
--    gerekmiyor — `lib/supabase/account.ts`'teki `getCurrentAccountId`
--    şimdiden yeni `lib/supabase/workspace.ts`'e devrediyor, mevcut 13+
--    sayfa hiç dokunulmadan çoklu workspace'e duyarlı hale geldi.
-- 2) Sol menüde yeni bir "İşletme Seçici" eklendi (WorkspaceSwitcher) —
--    kullanıcı "Yeni İşletme Ekle" ile ikinci bir workspace açıp aralarında
--    geçiş yapabilir; seçim tarayıcıda bir cookie'de (`finansapp_workspace_id`)
--    tutulur.
-- 3) `EKIP_DISABLED = true` olduğu sürece (bkz. app/api/ekip/*) ekip/rol
--    özellikleri hâlâ kapalı — yeni workspace'lere ekip daveti Faz 4'te
--    ("Ekip yönetimini plan bazlı geri açmak") ele alınacak. Şimdilik her
--    workspace'in tek kullanıcısı (sahibi) var.
-- 4) `donem-kilitleme` ve `ayarlar` (company_settings, backup, bildirim
--    tercihleri, dönem kilitleri) tabloları hâlâ workspace_id'ye taşınmadı —
--    hâlâ tek kullanıcıya özel. İkinci bir workspace açan kullanıcı için bu
--    sayfalar hâlâ İLK/varsayılan workspace'in ayarlarını gösterecektir.
--    İstenirse ayrı bir migration ile bunlara da workspace_id eklenebilir.
