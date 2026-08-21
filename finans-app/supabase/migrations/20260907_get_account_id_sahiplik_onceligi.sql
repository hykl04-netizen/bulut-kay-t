-- 20260907 — HER YENİ KULLANICI "salt görüntüleme" olarak açılıyordu.
--
-- get_account_id_for_user() son çare olarak p_user_id döndürüyordu. Bu,
-- Faz 1 öncesinden kalma bir varsayım: "workspace id = kullanıcı id".
-- Artık YANLIŞ — create_workspace() ve kayıt tetikleyicisi rastgele
-- workspace id üretiyor.
--
-- ZİNCİR:
--   yeni kullanıcı → henüz workspace cookie'si yok
--   → getSelectedWorkspaceId() get_account_id_for_user()'a düşüyor
--   → fonksiyon kullanıcının KENDİ id'sini döndürüyor (workspace değil)
--   → /api/ekip/rolum o id'de workspace bulamıyor → isOwner = false
--   → team_members'ta da kayıt yok → role = 'salt_gorunum'
--   → arayüzde "Salt Görüntüleme" rozeti, ekleme düğmeleri kilitli
--
-- Belirtiler: "Harcama ekle" / "Gelir ekle" hiçbir şey yapmıyor
-- (canEdit false), ama rolü kontrol etmeyen ekranlar (banka hesapları)
-- çalışmaya devam ediyor.
--
-- Neden şimdiye kadar görülmedi: ilk hesabın workspace id'si tesadüfen
-- kullanıcı id'sine eşitti (eski şema), yanlış dallanma doğru sonuç
-- veriyordu. Yeni açılan hiçbir hesapta bu tesadüf yok.
--
-- ÇÖZÜM: önce SAHİP OLUNAN workspace, sonra aktif üyelik, en son eski
-- davranış (tek hesaplı eski kurulumlar bozulmasın diye korunuyor).

create or replace function public.get_account_id_for_user(p_user_id uuid default auth.uid())
returns uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select w.id
       from public.workspaces w
      where w.owner_id = p_user_id
      order by w.created_at
      limit 1),
    (select tm.workspace_id
       from public.team_members tm
      where tm.member_user_id = p_user_id and tm.status = 'aktif'
      limit 1),
    p_user_id
  );
$$;

revoke execute on function public.get_account_id_for_user(uuid) from public, anon;
grant execute on function public.get_account_id_for_user(uuid) to authenticated;
