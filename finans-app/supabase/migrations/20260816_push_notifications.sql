-- Mobil bildirimler (PWA push) için altyapı.
--
-- push_subscriptions: kullanıcının izin verdiği her cihaz/tarayıcı için bir
-- Web Push aboneliği (endpoint + şifreleme anahtarları) saklar. Bir kullanıcı
-- birden fazla cihazdan abone olabileceği için user_id tekil değil; aynı
-- cihazın tekrar abone olmasında `endpoint` üzerinden upsert yapılır.
--
-- push_notification_log: cron'un (app/api/cron/bildirim-gonder) aynı
-- hatırlatmayı aynı gün içinde birden fazla kez göndermesini engelleyen
-- basit bir "gönderildi" defteri. `(user_id, ref_type, ref_id, sent_for_date)`
-- üzerindeki benzersiz kısıt, cron birden fazla kez tetiklense bile
-- (ör. Vercel'in yeniden denemesi) idempotent kalmasını sağlar.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  device_label text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own" on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

create table if not exists public.push_notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ref_type text not null, -- 'fatura' | 'borc' | 'budget_summary'
  ref_id text not null,
  sent_for_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, ref_type, ref_id, sent_for_date)
);

-- Bu tabloya sadece sunucu tarafı (service role ile çalışan cron route'u)
-- yazıyor/okuyor; istemciden hiç erişilmiyor, bu yüzden RLS'i açıp hiçbir
-- policy tanımlamıyoruz (varsayılan: service role hariç herkese kapalı).
alter table public.push_notification_log enable row level security;
