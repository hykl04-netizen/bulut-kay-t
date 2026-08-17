-- Faz 4: Ekip yönetimini plan bazlı geri açmak.
-- 20260819_subscriptions.sql'den SONRA çalıştırılır.
--
-- Uygulama tarafı:
--   EKIP_DISABLED bayrağı 3 dosyadan kaldırıldı (/ekip sayfası ve
--   /api/ekip/* route'ları), sol menüdeki "Kapalı" rozeti kalktı.
--   /api/ekip/* artık `get_account_id_for_user()` yerine SEÇİLİ workspace
--   üzerinde çalışıyor (bkz. lib/supabase/workspace-server.ts).

-- ============================================================
-- 1) Davetli kullanıcıya kişisel workspace AÇMA
-- ============================================================
-- Faz 2'de her yeni auth kullanıcısına otomatik bir workspace açan trigger
-- eklenmişti. Ekip daveti geri açılınca bu, davetli kullanıcının ilk girişte
-- KENDİ boş workspace'ine düşmesine ve kurulum sihirbazına zorlanmasına yol
-- açardı — oysa o kişi başkasının işletmesine katılmak için geldi.
--
-- Kontrol `status`tan bağımsız yapılıyor ki iki trigger'ın çalışma sırası
-- (on_auth_user_created_default_workspace < on_auth_user_created_link_team,
-- alfabetik) değişse bile doğru davransın.
create or replace function public.create_default_workspace_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_invited boolean;
begin
  select exists (
    select 1 from public.team_members tm
    where lower(tm.invited_email) = lower(new.email)
      and tm.status <> 'iptal'
  ) into v_invited;

  if v_invited then
    return new;
  end if;

  v_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'company_name', '')), '');

  insert into public.workspaces (owner_id, name)
  values (new.id, coalesce(v_name, 'İşletmem'));

  return new;
end;
$$;

revoke execute on function public.create_default_workspace_for_new_user() from anon, authenticated, public;

-- ============================================================
-- 2) Plan bazlı kullanıcı limiti
-- ============================================================
-- Sahip her zaman 1 kişi sayılır; iptal edilmiş davetler sayılmaz.
create or replace function public.workspace_member_count(p_workspace_id uuid)
returns int
language sql
security definer
set search_path = public
stable
as $$
  select 1 + (
    select count(*)::int from public.team_members
    where workspace_id = p_workspace_id and status <> 'iptal'
  );
$$;

grant execute on function public.workspace_member_count(uuid) to authenticated;

-- Limit DB seviyesinde uygulanıyor. Davet akışı service role ile çalıştığı
-- (yani RLS'i atladığı) için kontrolü politikaya değil TETİKLEYİCİYE koymak
-- şart — aksi halde sunucu kodundaki bir hata limiti sessizce delerdi.
-- Plan limitleri: Başlangıç 1, Pro 5, Kurumsal sınırsız
-- (bkz. workspace_user_limit, 20260819_subscriptions.sql).
create or replace function public.enforce_workspace_user_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int;
  v_current int;
begin
  -- İptal edilen üyeler ve durumu değişmeyen güncellemeler limiti etkilemez.
  if new.status = 'iptal' then
    return new;
  end if;
  if TG_OP = 'UPDATE' and old.status = new.status and old.workspace_id = new.workspace_id then
    return new;
  end if;

  v_limit := public.workspace_user_limit(new.workspace_id);

  select 1 + count(*)::int into v_current
  from public.team_members
  where workspace_id = new.workspace_id
    and status <> 'iptal'
    and (TG_OP = 'INSERT' or id <> new.id);

  if v_current + 1 > v_limit then
    raise exception 'Planınızda en fazla % kullanıcı olabilir. Daha fazla üye eklemek için planınızı yükseltin.', v_limit
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_team_members_user_limit on public.team_members;
create trigger trg_team_members_user_limit
  before insert or update on public.team_members
  for each row execute function public.enforce_workspace_user_limit();
