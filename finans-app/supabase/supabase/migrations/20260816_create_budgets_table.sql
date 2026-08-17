-- Bütçe planlama özelliği için gerekli tablo.
-- Bu dosya otomatik çalışmaz — Supabase projenizin SQL Editor'ünde elle çalıştırmanız gerekir
-- (Dashboard > SQL Editor > New query > yapıştır > Run).

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  monthly_limit numeric(12, 2) not null check (monthly_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id)
);

alter table public.budgets enable row level security;

create policy "Kullanıcılar kendi bütçelerini görebilir"
  on public.budgets for select
  using (auth.uid() = user_id);

create policy "Kullanıcılar kendi bütçelerini ekleyebilir"
  on public.budgets for insert
  with check (auth.uid() = user_id);

create policy "Kullanıcılar kendi bütçelerini güncelleyebilir"
  on public.budgets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Kullanıcılar kendi bütçelerini silebilir"
  on public.budgets for delete
  using (auth.uid() = user_id);

-- updated_at'i otomatik güncelleyen trigger (diğer tablolarda benzer bir
-- deseniniz varsa onunla değiştirebilirsiniz; yoksa bu basit haliyle çalışır).
create or replace function public.set_budgets_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_budgets_updated_at on public.budgets;
create trigger trg_budgets_updated_at
  before update on public.budgets
  for each row execute function public.set_budgets_updated_at();
