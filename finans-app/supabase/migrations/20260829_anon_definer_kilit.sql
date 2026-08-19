-- 20260829 — Anon rolünün SECURITY DEFINER fonksiyonlarını çağırması engellendi.
--
-- BULUNAN: Supabase yeni fonksiyona otomatik olarak PUBLIC + anon +
-- authenticated EXECUTE veriyor. Daha önceki "revoke ... from public"
-- satırları anon'un AÇIK grant'ini kaldırmıyordu; pg_proc.proacl'da
-- "anon=X" olarak duruyordu.
--
-- ETKİSİ: workspace_plan / workspace_has_feature / workspace_can_write
-- erişim kontrolü yapmıyor (RLS içinden çağrıldıkları için doğru), ama
-- /rest/v1/rpc üzerinden anon'a açıktı. Elinde bir workspace UUID'i olan
-- herkes o hesabın abonelik planını okuyabiliyordu. create_workspace ise
-- giriş yapmamış istekle çağrılabiliyordu.
--
-- authenticated ve service_role KORUNUYOR: RLS politikaları "to public"
-- tanımlı ve bu fonksiyonları çağırıyor; giriş yapmış kullanıcının EXECUTE
-- hakkı olmazsa bütün tablolar erişilemez hale gelir.

revoke execute on function public.create_workspace(text, text) from public, anon;
revoke execute on function public.get_user_workspaces() from public, anon;
revoke execute on function public.has_account_access(uuid) from public, anon;
revoke execute on function public.has_account_role(uuid, text[]) from public, anon;
revoke execute on function public.workspace_can_write(uuid) from public, anon;
revoke execute on function public.workspace_has_feature(uuid, text) from public, anon;
revoke execute on function public.workspace_plan(uuid) from public, anon;

grant execute on function public.create_workspace(text, text) to authenticated;
grant execute on function public.get_user_workspaces() to authenticated;
grant execute on function public.has_account_access(uuid) to authenticated;
grant execute on function public.has_account_role(uuid, text[]) to authenticated;
grant execute on function public.workspace_can_write(uuid) to authenticated;
grant execute on function public.workspace_has_feature(uuid, text) to authenticated;
grant execute on function public.workspace_plan(uuid) to authenticated;
