-- Çoklu kullanıcı ve rol yönetimi (1. yarı: veritabanı katmanı).
-- Bu dosya otomatik çalışmaz — Supabase projenizin SQL Editor'ünde elle
-- çalıştırmanız gerekir (Dashboard > SQL Editor > New query > yapıştır > Run).
--
-- Yaklaşım özeti:
--  - Mevcut mimaride her veri tablosu `user_id = auth.uid()` üzerinden kişiye
--    özeldi ("hesap" kavramı yoktu, hesap sahibinin auth uid'si aynı zamanda
--    verinin sahibiydi). Workspace/organizasyon tablosu eklemek yerine — daha
--    az riskli bir geçiş için — mevcut `user_id` kolonunu "hesap kimliği"
--    olarak koruyorup, o hesaba EK kullanıcı bağlayan bir `team_members`
--    tablosu ekliyoruz. Hesap sahibinin kendisi team_members'ta satır
--    gerektirmez (auth.uid() = user_id kontrolü ile zaten tam yetkilidir).
--  - 3 rol: 'yonetici' (sahiple eşit yetki, ekip üyesi davet edebilir),
--    'muhasebeci' (veri ekleyip düzenleyebilir, ekip yönetemez),
--    'salt_gorunum' (sadece görüntüleme).
--  - `has_account_role()` fonksiyonu SECURITY DEFINER olduğundan RLS'e
--    takılmadan team_members'ı sorgulayabilir — böylece sonsuz döngü/RLS
--    kilitlenmesi olmaz.
--  - Davet akışı: `/api/ekip` route'u (2. yarıda arayüzle birlikte
--    kullanılacak) Supabase Admin API'siyle (service role key) kullanıcıyı
--    davet eder; auth.users'a yeni satır düşünce aşağıdaki trigger,
--    bekleyen davetle eşleşen team_members satırını otomatik aktif eder.

-- ============================================================
-- 1) team_members tablosu
-- ============================================================
create table if not exists public.team_members (
  id bigint generated always as identity primary key,
  account_id uuid not null references auth.users(id) on delete cascade, -- hesap sahibinin (verinin user_id'sinin) kimliği
  member_user_id uuid references auth.users(id) on delete cascade, -- davet kabul edilip kullanıcı oluşunca dolar
  invited_email text not null,
  role text not null check (role in ('yonetici', 'muhasebeci', 'salt_gorunum')),
  status text not null default 'beklemede' check (status in ('beklemede', 'aktif', 'iptal')),
  invited_by uuid not null references auth.users(id),
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  unique (account_id, invited_email)
);

create index if not exists team_members_account_idx on public.team_members (account_id);
create index if not exists team_members_member_idx on public.team_members (member_user_id);

alter table public.team_members enable row level security;

-- ============================================================
-- 2) Yardımcı fonksiyonlar (SECURITY DEFINER — RLS'e takılmaz)
-- ============================================================

-- Bir kullanıcının hangi "hesaba" ait olduğunu döner: aktif bir ekip
-- üyeliği varsa o hesabın id'si, yoksa kullanıcının kendi id'si (yani
-- kendisi hesap sahibi demektir).
create or replace function public.get_account_id_for_user(p_user_id uuid default auth.uid())
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select account_id from public.team_members
       where member_user_id = p_user_id and status = 'aktif'
       limit 1),
    p_user_id
  );
$$;

grant execute on function public.get_account_id_for_user(uuid) to authenticated;

-- auth.uid()'nin, verilen hesap üzerinde belirtilen rollerden birine sahip
-- olup olmadığını kontrol eder. Hesap sahibinin kendisi (auth.uid() =
-- p_account_id) her zaman true döner — tam yetkilidir.
create or replace function public.has_account_role(p_account_id uuid, p_allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    case
      when auth.uid() = p_account_id then true
      else exists (
        select 1 from public.team_members
        where account_id = p_account_id
          and member_user_id = auth.uid()
          and status = 'aktif'
          and role = any(p_allowed_roles)
      )
    end;
$$;

grant execute on function public.has_account_role(uuid, text[]) to authenticated;

-- Kısayol: "en az görüntüleme" (herhangi bir aktif rol) yetkisi var mı.
create or replace function public.has_account_access(p_account_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_account_role(p_account_id, array['yonetici', 'muhasebeci', 'salt_gorunum']);
$$;

grant execute on function public.has_account_access(uuid) to authenticated;

-- Davet edilen kullanıcı gerçekten kayıt olunca (auth.users'a satır
-- düşünce) bekleyen davetini otomatik aktif eder.
create or replace function public.link_invited_team_member()
returns trigger
security definer
set search_path = public
as $$
begin
  update public.team_members
  set member_user_id = new.id,
      status = 'aktif',
      joined_at = now()
  where invited_email = new.email
    and status = 'beklemede';
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_auth_user_created_link_team on auth.users;
create trigger on_auth_user_created_link_team
  after insert on auth.users
  for each row execute function public.link_invited_team_member();

-- ============================================================
-- 3) team_members üzerindeki RLS politikaları
-- ============================================================

drop policy if exists "Hesap üyeleri listeyi görebilir" on public.team_members;
create policy "Hesap üyeleri listeyi görebilir"
  on public.team_members for select
  using (
    public.has_account_role(account_id, array['yonetici'])
    or member_user_id = auth.uid()
  );

drop policy if exists "Sahip/yönetici davet oluşturabilir" on public.team_members;
create policy "Sahip/yönetici davet oluşturabilir"
  on public.team_members for insert
  with check (public.has_account_role(account_id, array['yonetici']));

drop policy if exists "Sahip/yönetici rol güncelleyebilir" on public.team_members;
create policy "Sahip/yönetici rol güncelleyebilir"
  on public.team_members for update
  using (public.has_account_role(account_id, array['yonetici']))
  with check (public.has_account_role(account_id, array['yonetici']));

drop policy if exists "Sahip/yönetici üye çıkarabilir" on public.team_members;
create policy "Sahip/yönetici üye çıkarabilir"
  on public.team_members for delete
  using (public.has_account_role(account_id, array['yonetici']));

-- ============================================================
-- 4) Ana veri tablolarının RLS politikalarını rol-farkında hale getir
-- ============================================================
-- Görüntüleme: yonetici + muhasebeci + salt_gorunum (hepsi görebilir)
-- Ekleme/güncelleme/silme: yonetici + muhasebeci (salt_gorunum düzenleyemez)
-- Not: bordro (payrolls) hassas olduğundan salt_gorunum'a görüntüleme
-- yetkisi de verilmiyor — sadece yonetici + muhasebeci görebilir.

do $$
declare
  pol record;
  tbl text;
  core_tables text[] := array[
    'transactions', 'bills', 'debts', 'investments', 'assets',
    'categories', 'documents', 'budgets', 'bank_accounts', 'payrolls'
  ];
begin
  -- Bu tablolardaki TÜM mevcut politikaları temizle (isimleri bilinmediği
  -- için pg_policies üzerinden dinamik olarak buluyoruz).
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and tablename = any(core_tables)
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;

  foreach tbl in array core_tables loop
    if tbl = 'payrolls' then
      -- Bordro: salt_gorunum hariç (maaş verisi hassas).
      execute format(
        'create policy "Hesap görüntüleme" on public.%I for select using (public.has_account_role(user_id, array[%L, %L]))',
        tbl, 'yonetici', 'muhasebeci'
      );
    else
      execute format(
        'create policy "Hesap görüntüleme" on public.%I for select using (public.has_account_role(user_id, array[%L, %L, %L]))',
        tbl, 'yonetici', 'muhasebeci', 'salt_gorunum'
      );
    end if;

    execute format(
      'create policy "Hesap ekleme" on public.%I for insert with check (public.has_account_role(user_id, array[%L, %L]))',
      tbl, 'yonetici', 'muhasebeci'
    );
    execute format(
      'create policy "Hesap güncelleme" on public.%I for update using (public.has_account_role(user_id, array[%L, %L])) with check (public.has_account_role(user_id, array[%L, %L]))',
      tbl, 'yonetici', 'muhasebeci', 'yonetici', 'muhasebeci'
    );
    execute format(
      'create policy "Hesap silme" on public.%I for delete using (public.has_account_role(user_id, array[%L, %L]))',
      tbl, 'yonetici', 'muhasebeci'
    );
  end loop;
end $$;

-- ============================================================
-- 5) audit_log görünürlüğünü hesap geneline aç (kim-ne-yaptı artık
--    ekip üyeleri arasında da görülebilmeli — sadece yonetici/muhasebeci,
--    salt_gorunum denetim kaydı göremez)
-- ============================================================
drop policy if exists "Kullanıcılar kendi aktivite geçmişini görebilir" on public.audit_log;
create policy "Hesap üyeleri aktivite geçmişini görebilir"
  on public.audit_log for select
  using (public.has_account_role(user_id, array['yonetici', 'muhasebeci']));

-- ============================================================
-- ÖNEMLİ NOTLAR
-- ============================================================
-- 1) `payrolls`, `bank_accounts`, `documents`, `budgets` tabloları bu
--    migration'dan önce zaten var olmalı (önceki oturumlarda oluşturuldu).
--    Eğer projenizde bu tablolardan biri yoksa, ilgili DO bloğu o tablo
--    için hata verir — böyle bir tabloyu core_tables dizisinden çıkarıp
--    ayrıca ekleyebilirsiniz.
-- 2) Ayarlar/kişisel tablolar (company_settings, backup_settings,
--    notification_preferences, period_locks, push_subscriptions,
--    push_notification_log, yedekler) bilinçli olarak bu migration'a
--    dahil edilmedi — bunlar hesap düzeyinde tekil ayarlar olduğundan
--    şimdilik sadece hesap sahibine özel kalıyor. İstenirse 2. turda
--    ("yonetici" rolüne bu ayarları da açma) ele alınabilir.
-- 3) Ekip üyesi davet etme/rol değiştirme/çıkarma işlemleri UI'dan değil,
--    `/api/ekip` route'undan (service role ile) yapılacak — bu route ve
--    arayüz sayfası bu görevin 2. yarısında eklenecek.
