-- Otomatik zamanlanmış yedekleme.
-- Kullanıcı haftalık/aylık otomatik yedek sıklığı seçebilir; bir Vercel Cron
-- görevi (`app/api/cron/yedekleme`) periyodik olarak çalışıp süresi gelen
-- kullanıcılar için JSON yedeği oluşturup private `yedekler` bucket'ına
-- yükler ve `last_backup_at`'i günceller. Kullanıcı, geçmiş yedekleri
-- Şirket Ayarları sayfasından imzalı link ile indirebilir.

create table if not exists public.backup_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  frequency text not null default 'off' check (frequency in ('off', 'weekly', 'monthly')),
  last_backup_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.backup_settings enable row level security;

drop policy if exists "backup_settings_select_own" on public.backup_settings;
create policy "backup_settings_select_own" on public.backup_settings
  for select using (auth.uid() = user_id);

drop policy if exists "backup_settings_insert_own" on public.backup_settings;
create policy "backup_settings_insert_own" on public.backup_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "backup_settings_update_own" on public.backup_settings;
create policy "backup_settings_update_own" on public.backup_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Not: `frequency`/`last_backup_at` sunucu (cron route, service role) ve
-- kullanıcının kendisi tarafından güncellenir; başka bir kullanıcının
-- ayarını değiştiremeyeceğinden UPDATE politikası yeterlidir, DELETE'e
-- gerek görülmedi (frequency='off' yeterli).

-- ─────────────────────────────────────────────────────────────
-- Storage: private "yedekler" bucket + kullanıcı bazlı klasör erişimi.
-- `belgeler` bucket'ı gibi bu da panelden değil kod/migration ile
-- oluşturuluyor ki tekrarlanabilir olsun.
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('yedekler', 'yedekler', false)
on conflict (id) do nothing;

drop policy if exists "yedekler_select_own" on storage.objects;
create policy "yedekler_select_own" on storage.objects
  for select using (bucket_id = 'yedekler' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "yedekler_insert_own" on storage.objects;
create policy "yedekler_insert_own" on storage.objects
  for insert with check (bucket_id = 'yedekler' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "yedekler_delete_own" on storage.objects;
create policy "yedekler_delete_own" on storage.objects
  for delete using (bucket_id = 'yedekler' and (storage.foldername(name))[1] = auth.uid()::text);

-- Not: cron route, dosyayı service_role anahtarıyla yüklediği için yukarıdaki
-- politikalar bypass edilir (service_role RLS'e tabi değildir); bu
-- politikalar sadece kullanıcının kendi tarayıcısından/istemciden erişimini
-- kapsar (ör. ileride istemciden doğrudan silme eklenirse).
