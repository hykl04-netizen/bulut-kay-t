-- Faz 1 tamamlama — 20260817_workspaces.sql'in DEVAMIDIR, ondan SONRA çalıştırılır.
--
-- NEDEN GEREKLİ:
-- İlk migration altyapıyı (workspaces tablosu, workspace_id kolonları, RLS)
-- kurdu ama uygulama hâlâ seçili işletmenin id'sini `user_id` alanına
-- yazıyordu. Bu, 1. işletmede tesadüfen çalışıyordu çünkü onun id'si
-- kullanıcının auth uid'sine eşit olacak şekilde taşınmıştı. Ancak
-- `create_workspace()` ile açılan 2. işletmenin id'si rastgele bir UUID
-- olduğundan ve `user_id` kolonu `auth.users`'a foreign key olduğundan,
-- ikinci bir işletmeye kayıt eklemek şu hatayı veriyordu:
--
--   ERROR 23503: insert or update on table "transactions" violates foreign
--   key constraint "transactions_user_id_fkey"
--
-- YENİ SÖZLEŞME:
--   workspace_id = kaydın ait olduğu işletme (kiracı / tenant)
--   user_id      = kaydı oluşturan gerçek kullanıcı (auth.users FK'si)
--
-- Uygulama tarafında da tüm okuma filtreleri ve insert payload'ları
-- `workspace_id`'ye taşındı (19 dosya).

-- ============================================================
-- 1) user_id'yi gerçek kullanıcıya normalize et
-- ============================================================
create or replace function public.set_workspace_id_default()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Uygulama workspace_id göndermezse eski sözleşmeye düş (user_id alanında
  -- workspace id'si gelirdi) — geriye dönük uyumluluk.
  if new.workspace_id is null then
    new.workspace_id := new.user_id;
  end if;

  -- user_id gerçek bir auth kullanıcısı değilse (workspace id'si bırakılmış
  -- ya da hiç doldurulmamışsa) oturumdaki kullanıcıya çevir.
  if auth.uid() is not null
     and (new.user_id is null
          or not exists (select 1 from auth.users u where u.id = new.user_id))
  then
    new.user_id := auth.uid();
  end if;

  return new;
end;
$$;

-- ============================================================
-- 2) budgets: unique kısıt workspace bazlı olmalı
-- ============================================================
-- Aksi halde iki farklı işletme aynı kategori için bütçe tanımlayamazdı
-- (ve uygulamadaki upsert onConflict'i çalışmazdı).
alter table public.budgets drop constraint if exists budgets_user_id_category_id_key;
alter table public.budgets
  add constraint budgets_workspace_id_category_id_key unique (workspace_id, category_id);

-- ============================================================
-- 3) audit_log workspace-farkında
-- ============================================================
alter table public.audit_log add column if not exists workspace_id uuid references public.workspaces(id);
update public.audit_log set workspace_id = user_id where workspace_id is null;
create index if not exists audit_log_workspace_idx on public.audit_log (workspace_id);

-- Kaydın workspace'ini satırdan oku (tablo şeklinden bağımsız, jsonb üzerinden)
-- ki audit trigger'ı workspace_id'si olmayan bir tabloya takılmasın.
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_workspace_id uuid;
  v_user_id uuid;
  v_email text;
  v_record_id uuid;
begin
  v_row := case when TG_OP = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;

  v_workspace_id := nullif(v_row ->> 'workspace_id', '')::uuid;
  v_user_id := coalesce(nullif(v_row ->> 'user_id', '')::uuid, auth.uid());
  v_workspace_id := coalesce(v_workspace_id, v_user_id);

  select email into v_email from auth.users where id = auth.uid();

  begin
    v_record_id := case when TG_OP = 'DELETE' then old.id else new.id end;
  exception when others then
    v_record_id := null;
  end;

  insert into public.audit_log (user_id, workspace_id, actor_email, table_name, record_id, action, old_data, new_data)
  values (
    v_user_id,
    v_workspace_id,
    v_email,
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('UPDATE', 'INSERT') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

drop policy if exists "Hesap üyeleri aktivite geçmişini görebilir" on public.audit_log;
create policy "Hesap üyeleri aktivite geçmişini görebilir"
  on public.audit_log for select
  using (public.has_account_role(workspace_id, array['yonetici', 'muhasebeci']));

-- ============================================================
-- 4) Güvenlik sıkılaştırması (Supabase advisor uyarıları)
-- ============================================================
-- Sadece trigger olarak kullanılan fonksiyon PostgREST üzerinden çağrılmasın.
revoke execute on function public.create_default_workspace_for_new_user() from anon, authenticated, public;

-- Workspace fonksiyonları sadece oturum açmış kullanıcılara açık olsun.
revoke execute on function public.create_workspace(text) from anon, public;
revoke execute on function public.get_user_workspaces() from anon, public;
grant execute on function public.create_workspace(text) to authenticated;
grant execute on function public.get_user_workspaces() to authenticated;

-- ============================================================
-- BİLİNEN SINIRLAMALAR (Faz 1 sonrası)
-- ============================================================
-- 1) company_settings, period_locks, backup_settings, notification_preferences
--    hâlâ kullanıcı bazlı (workspace bazlı değil). İkinci bir işletme açan
--    kullanıcı için /ayarlar ve /donem-kilitleme sayfaları hâlâ tek bir ortak
--    ayar seti gösterir.
-- 2) app/api/cron/* route'ları (yedekleme, bildirim) hâlâ user_id üzerinden
--    çalışıyor — artık user_id gerçek kullanıcı olduğu için bu route'lar
--    kullanıcının TÜM işletmelerini birlikte işler. Yedekleme için bu makul,
--    ama işletme bazlı yedek istenirse workspace_id'ye taşınmalı.
-- 3) Ekip daveti hâlâ EKIP_DISABLED = true (Faz 4).
