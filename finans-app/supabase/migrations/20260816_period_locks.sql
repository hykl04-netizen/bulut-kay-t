-- Dönem kilitleme (ay/yıl sonu kapanışı).
-- Kullanıcı bir "kilit tarihi" belirler; o tarihten ÖNCEKİ kayıtlar
-- (gelir/gider, fatura/masraf, borç/alacak) artık değiştirilemez/silinemez,
-- ayrıca kilitli döneme yeni kayıt da eklenemez. Bu, yanlışlıkla geçmiş
-- dönem kayıtlarının bozulmasına karşı bir koruma katmanıdır.
--
-- Not: Bu, tek kullanıcılı hesap modelinde bir "kendine hatırlatma / yanlışlık
-- önleyici" korumadır — hesap sahibi kilidi kendisi kaldırabilir (RBAC/rol
-- ayrımı olmadığından). Gerçek denetim-geçirmez bir kapanış için, ileride
-- eklenebilecek rol yönetimiyle "kilidi sadece yönetici kaldırabilir" kuralı
-- güçlendirilebilir.

create table if not exists public.period_locks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  locked_before date not null,
  updated_at timestamptz not null default now()
);

alter table public.period_locks enable row level security;

drop policy if exists "period_locks_select_own" on public.period_locks;
create policy "period_locks_select_own" on public.period_locks
  for select using (auth.uid() = user_id);

drop policy if exists "period_locks_insert_own" on public.period_locks;
create policy "period_locks_insert_own" on public.period_locks
  for insert with check (auth.uid() = user_id);

drop policy if exists "period_locks_update_own" on public.period_locks;
create policy "period_locks_update_own" on public.period_locks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "period_locks_delete_own" on public.period_locks;
create policy "period_locks_delete_own" on public.period_locks
  for delete using (auth.uid() = user_id);

-- `date` kolonlu tablolar için (transactions)
create or replace function public.enforce_period_lock_date()
returns trigger
language plpgsql
as $$
declare
  v_locked_before date;
  v_uid uuid;
begin
  v_uid := coalesce(new.user_id, old.user_id);
  select locked_before into v_locked_before from public.period_locks where user_id = v_uid;
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

-- `due_date` kolonlu tablolar için (bills, debts)
create or replace function public.enforce_period_lock_due_date()
returns trigger
language plpgsql
as $$
declare
  v_locked_before date;
  v_uid uuid;
begin
  v_uid := coalesce(new.user_id, old.user_id);
  select locked_before into v_locked_before from public.period_locks where user_id = v_uid;
  if v_locked_before is null then
    return coalesce(new, old);
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.due_date < v_locked_before then
    raise exception 'Bu kayıt kilitli bir döneme ait (% tarihinden önce). Değiştirmek/silmek için Dönem Kilitleme ayarından kilidi kaldırın.', to_char(v_locked_before, 'DD.MM.YYYY');
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.due_date < v_locked_before then
    raise exception 'Kilitli bir döneme (% tarihinden önce) kayıt eklenemez/taşınamaz.', to_char(v_locked_before, 'DD.MM.YYYY');
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_period_lock_transactions on public.transactions;
create trigger trg_period_lock_transactions
  before insert or update or delete on public.transactions
  for each row execute function public.enforce_period_lock_date();

drop trigger if exists trg_period_lock_bills on public.bills;
create trigger trg_period_lock_bills
  before insert or update or delete on public.bills
  for each row execute function public.enforce_period_lock_due_date();

drop trigger if exists trg_period_lock_debts on public.debts;
create trigger trg_period_lock_debts
  before insert or update or delete on public.debts
  for each row execute function public.enforce_period_lock_due_date();
