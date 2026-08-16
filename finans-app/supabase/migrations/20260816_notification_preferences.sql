-- Bildirim tercihleri paneli için ayar tablosu.
-- Özet Paneli'ndeki "Yaklaşan Ödemeler" ve "Bütçe Aşımları" widget'larının
-- açık/kapalı olmasını ve yaklaşan ödemelerin kaç gün öncesinden
-- gösterileceğini kullanıcı bazında saklar. `company_settings` ile aynı
-- desende: tek satır (user_id primary key) + kendi kaydına RLS.

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  show_upcoming_payments boolean not null default true,
  upcoming_days_threshold integer not null default 30,
  show_budget_alerts boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own" on public.notification_preferences
  for select using (auth.uid() = user_id);

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own" on public.notification_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own" on public.notification_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notification_preferences_delete_own" on public.notification_preferences;
create policy "notification_preferences_delete_own" on public.notification_preferences
  for delete using (auth.uid() = user_id);

-- Not: Bu tablo kasıtlı olarak audit log trigger'ına bağlanmadı — bildirim
-- tercihi değişikliklerinin denetim geçmişinde izlenmesine gerçek bir
-- ihtiyaç görülmedi (company_settings ile aynı karar).
