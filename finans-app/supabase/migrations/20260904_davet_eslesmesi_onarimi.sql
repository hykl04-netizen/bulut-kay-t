-- 20260904 — Ekip daveti eşleşmesi onarıldı. İKİ AYRI KOPUKLUK vardı.
--
-- 1) BÜYÜK/KÜÇÜK HARF: link_invited_team_member() daveti
--    "where invited_email = new.email" ile arıyordu — harfi harfine.
--    Davet eden "Kardes@Ornek.com" yazdıysa, Supabase kayıtta e-postayı
--    küçük harfe indirdiği için ("kardes@ornek.com") eşleşme olmuyordu.
--
--    Aynı e-postayı create_default_workspace_for_new_user() lower() ile
--    karşılaştırıyordu. Yani iki tetikleyici ÇELİŞİYORDU: biri "bu kişi
--    davetli, ona hesap açma" diyor, diğeri "eşleşme yok, bağlama" diyordu.
--    Sonuç: davet edilen kişi kayıt oluyor, kendi hesabı AÇILMIYOR ve davet
--    edildiği hesaba da BAĞLANMIYOR — hiçbir yere giremeyen ölü bir hesap.
--    Canlı veritabanında testle doğrulandı.
--
-- 2) ÖNCE KAYIT OLMUŞ KİŞİYİ DAVET ETME: link_invited_team_member yalnızca
--    auth.users'a YENİ satır eklenince çalışıyor. Zaten hesabı olan birini
--    davet ettiğinizde hiçbir tetikleyici çalışmıyordu; davet sonsuza kadar
--    'beklemede' kalıyor, member_user_id null olduğu için has_account_role
--    hiçbir zaman true dönmüyordu. Davet sessizce hiçbir işe yaramıyordu.

create or replace function public.link_invited_team_member()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.team_members
  set member_user_id = new.id,
      status = 'aktif',
      joined_at = now()
  where lower(btrim(invited_email)) = lower(btrim(new.email))
    and status = 'beklemede';
  return new;
end;
$$;

create or replace function public.normalize_and_link_invite()
returns trigger
language plpgsql
security definer
set search_path to 'public, auth'
as $$
declare
  v_uid uuid;
begin
  new.invited_email := lower(btrim(new.invited_email));

  if new.member_user_id is null then
    select u.id into v_uid
    from auth.users u
    where lower(u.email) = new.invited_email
    limit 1;

    if v_uid is not null then
      new.member_user_id := v_uid;
      if new.status = 'beklemede' then
        new.status := 'aktif';
        new.joined_at := coalesce(new.joined_at, now());
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.normalize_and_link_invite() from public, anon, authenticated;
revoke execute on function public.link_invited_team_member() from public, anon, authenticated;

drop trigger if exists trg_team_members_normalize_invite on public.team_members;
create trigger trg_team_members_normalize_invite
  before insert or update on public.team_members
  for each row execute function public.normalize_and_link_invite();

update public.team_members set invited_email = lower(btrim(invited_email))
where invited_email <> lower(btrim(invited_email));

update public.team_members tm
set member_user_id = u.id,
    status = 'aktif',
    joined_at = coalesce(tm.joined_at, now())
from auth.users u
where tm.member_user_id is null
  and tm.status = 'beklemede'
  and lower(u.email) = tm.invited_email;
