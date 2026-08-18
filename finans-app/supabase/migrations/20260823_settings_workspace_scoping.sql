-- Öneri 1 + 2: Ayar tablolarını işletme (workspace) bazına taşı.
-- 20260822_einvoice_readiness.sql'den SONRA çalıştırılır.
--
-- SORUN: company_settings, period_locks ve backup_settings hâlâ `user_id`
-- anahtarlıydı. İki sonucu vardı:
--   a) İkinci bir işletme açan kullanıcı, BİRİNCİ işletmenin şirket adını,
--      logosunu ve yedekleme ayarını görüyor/düzenliyordu. Faturaya yanlış
--      şirketin logosu basılabiliyordu.
--   b) Dönem kilidi hem TAŞIYOR hem DELİNEBİLİYORDU:
--      - enforce_period_lock_* fonksiyonları kilidi `new.user_id` ile arıyordu.
--        Faz 1'den sonra user_id = kaydı OLUŞTURAN kişi olduğundan, sahip
--        dönemi kilitlese bile muhasebecinin eklediği kayıt kilide takılmıyordu.
--      - Kullanıcının iki işletmesi varsa birinde konan kilit diğerini de
--        kilitliyordu.
--
-- BİLİNÇLİ OLARAK DEĞİŞTİRİLMEYENLER:
--   notification_preferences — hangi widget'ları görmek istediğiniz KİŞİSEL bir
--     tercih, işletmeye ait değil.
--   push_subscriptions       — cihaz/kullanıcı bazlı olması doğru.
--   push_notification_log    — tekilleştirme ref_id üzerinden yapıldığı için
--     workspace'ten bağımsız çalışıyor.

-- ============================================================
-- 1) company_settings / period_locks / backup_settings
-- ============================================================
do $$
declare tbl text;
begin
  foreach tbl in array array['company_settings', 'period_locks', 'backup_settings'] loop
    execute format('alter table public.%I add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade', tbl);
    execute format('update public.%I set workspace_id = user_id where workspace_id is null', tbl);
    execute format('delete from public.%I where workspace_id is null', tbl);
    execute format('alter table public.%I drop constraint if exists %I', tbl, tbl || '_pkey');
    execute format('alter table public.%I alter column workspace_id set not null', tbl);
    execute format('alter table public.%I add primary key (workspace_id)', tbl);
    -- user_id artık anahtar değil; "en son kim güncelledi" bilgisi olarak kalıyor.
    execute format('alter table public.%I alter column user_id drop not null', tbl);
  end loop;
end $$;

-- ============================================================
-- 2) Dönem kilidi tetikleyicileri artık workspace_id ile çalışıyor
-- ============================================================
-- Ayrıca `set search_path` eklendi (Supabase advisor uyarısı).
create or replace function public.enforce_period_lock_date()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locked_before date;
  v_ws uuid;
begin
  v_ws := coalesce(new.workspace_id, old.workspace_id);
  select locked_before into v_locked_before from public.period_locks where workspace_id = v_ws;
  if v_locked_before is null then
    return coalesce(new, old);
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.date < v_locked_before then
    raise exception 'Bu kayıt kilitli bir döneme ait (% tarihinden önce). Değiştirmek/silmek için Dönem Kilitleme ayarından kilidi kaldırın.', to_char(v_locked_before, 'DD.MM.YYYY');
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.date < v_locked_before then
    raise exception 'Kilitli bir döneme (% tarihinden önce) kayıt eklenemez/taşınamaz.', to_char(v_locked_before, 'DD.MM.YYYY');
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.enforce_period_lock_due_date()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locked_before date;
  v_ws uuid;
begin
  v_ws := coalesce(new.workspace_id, old.workspace_id);
  select locked_before into v_locked_before from public.period_locks where workspace_id = v_ws;
  if v_locked_before is null then
    return coalesce(new, old);
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.due_date is not null and old.due_date < v_locked_before then
    raise exception 'Bu kayıt kilitli bir döneme ait (% tarihinden önce). Değiştirmek/silmek için Dönem Kilitleme ayarından kilidi kaldırın.', to_char(v_locked_before, 'DD.MM.YYYY');
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.due_date is not null and new.due_date < v_locked_before then
    raise exception 'Kilitli bir döneme (% tarihinden önce) kayıt eklenemez/taşınamaz.', to_char(v_locked_before, 'DD.MM.YYYY');
  end if;

  return coalesce(new, old);
end;
$$;

-- ============================================================
-- 3) RLS politikaları workspace bazına geçiyor
-- ============================================================
do $$
declare
  pol record;
  tbl text;
  settings_tables text[] := array['company_settings', 'period_locks', 'backup_settings'];
begin
  for pol in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename = any(settings_tables)
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;

  foreach tbl in array settings_tables loop
    -- Görüntüleme: işletmenin tüm üyeleri (şirket adı/logo raporlarda kullanılıyor).
    execute format(
      'create policy "Workspace görüntüleme" on public.%I for select using (public.has_account_role(workspace_id, array[%L, %L, %L]))',
      tbl, 'yonetici', 'muhasebeci', 'salt_gorunum'
    );
    -- Değiştirme: yalnızca sahip/yönetici — bunlar idari ayarlar.
    execute format(
      'create policy "Workspace ekleme" on public.%I for insert with check (public.has_account_role(workspace_id, array[%L]))',
      tbl, 'yonetici'
    );
    execute format(
      'create policy "Workspace güncelleme" on public.%I for update using (public.has_account_role(workspace_id, array[%L])) with check (public.has_account_role(workspace_id, array[%L]))',
      tbl, 'yonetici', 'yonetici'
    );
    execute format(
      'create policy "Workspace silme" on public.%I for delete using (public.has_account_role(workspace_id, array[%L]))',
      tbl, 'yonetici'
    );
  end loop;
end $$;

-- NOT: Yedek dosyalarının depolama yolu da `user_id/` yerine `workspace_id/`
-- oldu (app/api/cron/yedekleme + /ayarlar). Eski yoldaki dosyalar orada kalır;
-- istenirse Supabase Storage'dan elle taşınabilir.
