-- Oturum yönetimi: kullanıcının kendi aktif oturumlarını (cihaz/tarayıcı
-- bazında) listeleyip, istediğini uzaktan sonlandırabilmesi.
--
-- `auth` şeması PostgREST'e açık değildir (ve açılması Supabase tarafından
-- önerilmez), bu yüzden servis anahtarı veya sunucu route'u yerine,
-- auth.uid() ile kilitlenmiş SECURITY DEFINER fonksiyonlar üzerinden dar bir
-- pencere açıyoruz. Bu fonksiyonlar sadece çağıran kullanıcının KENDİ
-- oturumlarını görebilir/silebilir.
--
-- Not: Supabase erişim (access) token'ları stateless JWT'dir; bir oturum
-- burada silindiğinde ilgili refresh token'lar geçersiz olur ama o oturuma
-- ait access token, süresi (varsayılan ~1 saat) dolana kadar teorik olarak
-- geçerli kalabilir. Bu, Supabase'in kendi mimarisinin bir sınırlamasıdır.

create or replace function public.get_my_sessions()
returns table (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  user_agent text,
  ip text,
  is_current boolean
)
language sql
security definer
set search_path = public, auth
as $$
  select
    s.id,
    s.created_at,
    s.updated_at,
    s.user_agent,
    s.ip::text,
    (s.id::text = (auth.jwt() ->> 'session_id')) as is_current
  from auth.sessions s
  where s.user_id = auth.uid()
  order by s.updated_at desc nulls last, s.created_at desc;
$$;

revoke all on function public.get_my_sessions() from public;
grant execute on function public.get_my_sessions() to authenticated;

create or replace function public.revoke_my_session(target_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if target_session_id::text = (auth.jwt() ->> 'session_id') then
    raise exception 'Mevcut oturumu bu yoldan sonlandıramazsınız; "Çıkış Yap" düğmesini kullanın.';
  end if;

  delete from auth.sessions
  where id = target_session_id
    and user_id = auth.uid();
end;
$$;

revoke all on function public.revoke_my_session(uuid) from public;
grant execute on function public.revoke_my_session(uuid) to authenticated;

create or replace function public.revoke_other_sessions()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  affected integer;
begin
  delete from auth.sessions
  where user_id = auth.uid()
    and id::text is distinct from (auth.jwt() ->> 'session_id');
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.revoke_other_sessions() from public;
grant execute on function public.revoke_other_sessions() to authenticated;
