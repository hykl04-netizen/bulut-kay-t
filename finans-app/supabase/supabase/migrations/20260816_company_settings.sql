-- Şirket logosu ve markalı rapor şablonu için ayar tablosu.
-- Logo, ayrı bir storage bucket + imzalı link karmaşasına gerek kalmadan,
-- küçük boyuta indirgenmiş (istemci tarafında canvas ile resize edilmiş)
-- bir data URL (base64) olarak saklanır. Bu sayede PDF oluşturma (jsPDF)
-- tarafında ekstra bir ağ isteğine gerek kalmadan doğrudan gömülebilir.

create table if not exists public.company_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_name text,
  logo_data_url text,
  updated_at timestamptz not null default now()
);

alter table public.company_settings enable row level security;

drop policy if exists "company_settings_select_own" on public.company_settings;
create policy "company_settings_select_own" on public.company_settings
  for select using (auth.uid() = user_id);

drop policy if exists "company_settings_insert_own" on public.company_settings;
create policy "company_settings_insert_own" on public.company_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "company_settings_update_own" on public.company_settings;
create policy "company_settings_update_own" on public.company_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "company_settings_delete_own" on public.company_settings;
create policy "company_settings_delete_own" on public.company_settings
  for delete using (auth.uid() = user_id);

-- Not: Bu tablo, `20260816_audit_log.sql` migration'ındaki genel denetim
-- (audit log) trigger'ına kasıtlı olarak bağlanmadı — şirket adı/logosu
-- değişikliklerinin denetim geçmişinde izlenmesine gerçek bir ihtiyaç
-- görülmedi. İstenirse aynı trigger buraya da eklenebilir.
