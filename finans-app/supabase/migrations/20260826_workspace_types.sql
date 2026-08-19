-- ============================================================
-- Faz 11 — Workspace tipleri (Aile / Şirket / Müşavir ofisi)
-- ============================================================
--
-- NEDEN:
-- Faz 1'den beri veri izolasyonu workspace bazlı ve RLS ile korunuyor; bir
-- kullanıcı aynı anda hem kendi işletmesine sahip olup hem başka
-- workspace'lere ekip üyesi olabiliyor. Eksik olan, bir workspace'in NE
-- OLDUĞU bilgisiydi. Tip olmadan bir aile bütçesi hesabı da sol menüde
-- Cariler, Bordro, Fatura Künyesi, Dönem Kilitleme gibi 25 işletme ekranını
-- görüyordu.
--
-- ÖNEMLİ AYRIM — tip ile ROL birbirine karıştırılmamalı:
--   * type = bu workspace ne? (aile / sirket / musavir_ofisi)
--     → hangi ÖZELLİKLER görünür
--   * team_members.role = sen bu workspace'te ne yapabilirsin?
--     (sahip / yonetici / muhasebeci / salt_gorunum) → YETKİ
-- Aynı kişi aile hesabında sahip, şirketinde sahip, müşterisinin
-- işletmesinde muhasebeci olabilir. İkisi dik eksenler.
--
-- "Muhasebeci" ayrı bir tip DEĞİL: mali müşavir kendi ofisi için bir
-- workspace açar; müşteri portföyü ise başka workspace'lere ekip üyeliğiyle
-- erişimdir (bkz. /musterilerim). `musavir_ofisi` yalnızca "bu ofis müşteri
-- portföyü yönetiyor" bayrağıdır.

-- ============================================================
-- 1) type kolonu
-- ============================================================
-- Varsayılan 'sirket': mevcut tüm workspace'ler işletme olarak açılmıştı,
-- geriye dönük davranış aynen korunur.
alter table public.workspaces
  add column if not exists type text not null default 'sirket';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'workspaces_type_check'
  ) then
    alter table public.workspaces
      add constraint workspaces_type_check
      check (type in ('aile', 'sirket', 'musavir_ofisi'));
  end if;
end $$;

create index if not exists workspaces_type_idx on public.workspaces (type);

-- ============================================================
-- 2) get_user_workspaces() artık tipi de döner
-- ============================================================
-- Dönüş tipi değiştiği için önce drop gerekiyor (create or replace
-- returns table imzasını değiştiremez).
drop function if exists public.get_user_workspaces();

create function public.get_user_workspaces()
returns table (workspace_id uuid, name text, role text, is_owner boolean, type text)
language sql
security definer
set search_path = public
stable
as $$
  select x.workspace_id, x.name, x.role, x.is_owner, x.type
  from (
    select w.id as workspace_id, w.name, 'sahip'::text as role, true as is_owner, w.type
    from public.workspaces w
    where w.owner_id = auth.uid()
    union all
    select w.id as workspace_id, w.name, tm.role, false as is_owner, w.type
    from public.team_members tm
    join public.workspaces w on w.id = tm.workspace_id
    where tm.member_user_id = auth.uid() and tm.status = 'aktif'
  ) x
  order by x.name;
$$;

grant execute on function public.get_user_workspaces() to authenticated;

-- ============================================================
-- 3) create_workspace() tip parametresi alır
-- ============================================================
-- Eski tek parametreli sürüm kaldırılıyor; p_type varsayılanı 'sirket'
-- olduğu için yalnızca p_name geçen mevcut çağrılar çalışmaya devam eder.
drop function if exists public.create_workspace(text);

create function public.create_workspace(p_name text, p_type text default 'sirket')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Hesap adı boş olamaz.';
  end if;

  if p_type not in ('aile', 'sirket', 'musavir_ofisi') then
    raise exception 'Geçersiz hesap türü: %', p_type;
  end if;

  insert into public.workspaces (owner_id, name, type)
  values (auth.uid(), trim(p_name), p_type)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_workspace(text, text) to authenticated;

-- ============================================================
-- 4) KVKK koruması: aile hesabına muhasebeci eklenemez
-- ============================================================
-- Bir mali müşavirin, müşterisinin EV BÜTÇESİNİ görmesi ciddi bir kişisel
-- veri ihlali olur. Arayüzde menüyü gizlemek yetmez — davet akışı service
-- role ile çalıştığı (RLS'i atladığı) için kısıt tetikleyicide olmalı.
-- (Faz 4'teki kullanıcı limiti kısıtıyla aynı gerekçe.)
create or replace function public.enforce_no_accountant_in_family()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
begin
  if new.role <> 'muhasebeci' or new.status = 'iptal' then
    return new;
  end if;

  select type into v_type from public.workspaces where id = new.workspace_id;

  if v_type = 'aile' then
    raise exception
      'Aile hesabına muhasebeci eklenemez. Muhasebeci erişimi yalnızca işletme hesaplarında verilebilir.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_team_members_no_accountant_in_family on public.team_members;
create trigger trg_team_members_no_accountant_in_family
  before insert or update on public.team_members
  for each row execute function public.enforce_no_accountant_in_family();

-- Ters yol da kapatılmalı: workspace'i şirket olarak açıp muhasebeci davet
-- edip sonra tipi 'aile'ye çevirmek yukarıdaki tetikleyiciyi atlatırdı.
create or replace function public.enforce_family_type_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type = 'aile' and coalesce(old.type, '') <> 'aile' then
    if exists (
      select 1 from public.team_members
      where workspace_id = new.id
        and role = 'muhasebeci'
        and status <> 'iptal'
    ) then
      raise exception
        'Bu hesapta yetkili bir muhasebeci var. Aile hesabına çevirmeden önce muhasebeci erişimini kaldırın.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_workspaces_family_type_change on public.workspaces;
create trigger trg_workspaces_family_type_change
  before update of type on public.workspaces
  for each row execute function public.enforce_family_type_change();

-- Tetikleyici fonksiyonları doğrudan çağrılabilir olmasın (Faz 10'daki
-- revoke_trigger_function_exposure ile aynı gerekçe).
--
-- DİKKAT: yalnızca PUBLIC'ten revoke etmek YETMİYOR. Supabase yeni
-- oluşturulan her fonksiyona anon ve authenticated rollerine AÇIK grant
-- veriyor; PUBLIC'ten yapılan revoke bu açık grant'ları kaldırmıyor.
-- Üç rolü de tek tek yazmak gerekiyor (bu, uygulandıktan sonra
-- pg_proc.proacl ile doğrulandı).
revoke execute on function public.enforce_no_accountant_in_family() from public, anon, authenticated;
revoke execute on function public.enforce_family_type_change() from public, anon, authenticated;

-- create_workspace() bir YAZMA yoludur; oturum açmamış bir istemcinin
-- /rest/v1/rpc/create_workspace'e ulaşabilmesi için hiçbir sebep yok.
-- (Pratikte anon çağrısı auth.uid() null olduğu için owner_id NOT NULL
-- kısıtına takılıp zaten hata verirdi; yine de yüzeyi kapatıyoruz.)
-- Not: aynı desendeki salt-okunur yardımcı fonksiyonlar (has_account_role,
-- workspace_plan vb.) bilinçli olarak dokunulmadan bırakıldı — onlar RLS
-- politikalarının içinden çağrılıyor ve anon için boş sonuç dönüyorlar.
revoke execute on function public.create_workspace(text, text) from anon;
