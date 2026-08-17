-- Aktivite / işlem geçmişi (audit log).
-- Bu dosya otomatik çalışmaz — Supabase projenizin SQL Editor'ünde elle çalıştırmanız gerekir
-- (Dashboard > SQL Editor > New query > yapıştır > Run).
--
-- Yaklaşım: her ana tabloya INSERT/UPDATE/DELETE için genel bir trigger
-- fonksiyonu bağlıyoruz. Trigger, değişikliği yapan kullanıcıyı (auth.uid()),
-- hangi tabloda/hangi kayıtta, eski/yeni değerleri (jsonb) ve zamanı
-- `audit_log` tablosuna yazar. Uygulama kodunda hiçbir değişiklik gerekmez —
-- DB seviyesinde çalıştığı için hiçbir sayfa "unutup" loglamayı atlayamaz.

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_email text,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_user_created_idx on public.audit_log (user_id, created_at desc);
create index if not exists audit_log_table_idx on public.audit_log (table_name);

alter table public.audit_log enable row level security;

-- Kullanıcılar sadece kendi kayıtlarının geçmişini görebilir. Audit log
-- satırları hiçbir zaman uygulama tarafından elle insert/update/delete
-- edilmemeli — sadece trigger'lar yazar (bkz. security definer fonksiyon),
-- bu yüzden insert/update/delete policy'si açılmıyor.
create policy "Kullanıcılar kendi aktivite geçmişini görebilir"
  on public.audit_log for select
  using (auth.uid() = user_id);

-- Genel trigger fonksiyonu. SECURITY DEFINER ile çalışır ki audit_log'a RLS'e
-- takılmadan (policy sadece SELECT açık) yazabilsin.
create or replace function public.write_audit_log()
returns trigger
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_email text;
  v_record_id uuid;
begin
  v_user_id := coalesce(
    case when TG_OP = 'DELETE' then (old.user_id) else (new.user_id) end,
    auth.uid()
  );
  select email into v_email from auth.users where id = auth.uid();

  begin
    v_record_id := case when TG_OP = 'DELETE' then old.id else new.id end;
  exception when others then
    v_record_id := null;
  end;

  insert into public.audit_log (user_id, actor_email, table_name, record_id, action, old_data, new_data)
  values (
    v_user_id,
    v_email,
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('UPDATE', 'INSERT') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$ language plpgsql;

-- Aşağıdaki tablolarda audit trigger'ı kuruyoruz. Projenizde farklı isimde
-- ek tablolar varsa aynı deseni (drop + create trigger ... after insert or
-- update or delete ... execute function public.write_audit_log()) onlara da
-- uygulayabilirsiniz.
do $$
declare
  t text;
  tables text[] := array[
    'transactions', 'bills', 'debts', 'investments', 'assets',
    'budgets', 'bank_accounts', 'documents', 'categories', 'payrolls'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_audit_%1$s on public.%1$s', t);
      execute format(
        'create trigger trg_audit_%1$s after insert or update or delete on public.%1$s
         for each row execute function public.write_audit_log()',
        t
      );
    end if;
  end loop;
end $$;
