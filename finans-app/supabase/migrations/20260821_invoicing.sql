-- Faz 5: Fatura kesme (satış faturası) modülü.
-- 20260820_team_plan_limits.sql'den SONRA çalıştırılır.
--
-- NOT: Bu RESMİ e-Fatura DEĞİLDİR — görsel/PDF fatura üretimi. Resmi
-- e-Fatura/e-Arşiv, GİB onaylı entegratör anlaşması gerektirir (Faz 10,
-- bkz. 20260822_einvoice_readiness.sql ve lib/einvoice.ts).

-- ============================================================
-- 1) Cari kartları (müşteriler)
-- ============================================================
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  name text not null,
  tax_number text,
  tax_office text,
  address text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customers_workspace_idx on public.customers (workspace_id);
alter table public.customers enable row level security;

-- ============================================================
-- 2) Faturalar
-- ============================================================
-- Durum: taslak / gonderildi / odendi / iptal.
-- "Gecikti" BİLİNÇLİ olarak saklanmıyor — `gonderildi` + vadesi geçmiş olarak
-- uygulamada TÜRETİLİYOR (lib/invoices.ts → resolveStatus). Böylece durumu her
-- gün güncelleyecek bir cron'a gerek kalmıyor ve bilgi her zaman doğru oluyor.
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  customer_id uuid references public.customers(id) on delete set null,
  invoice_number text not null,
  issue_date date not null default current_date,
  due_date date,
  status text not null default 'taslak' check (status in ('taslak', 'gonderildi', 'odendi', 'iptal')),
  currency text not null default 'TRY',
  subtotal numeric not null default 0,
  vat_total numeric not null default 0,
  total numeric not null default 0,
  notes text,
  paid_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, invoice_number)
);
create index if not exists invoices_workspace_idx on public.invoices (workspace_id);
create index if not exists invoices_customer_idx on public.invoices (customer_id);
create index if not exists invoices_status_idx on public.invoices (workspace_id, status);
alter table public.invoices enable row level security;

-- ============================================================
-- 3) Fatura kalemleri
-- ============================================================
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  vat_rate numeric not null default 20,
  net_total numeric not null default 0,
  vat_amount numeric not null default 0,
  line_total numeric not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists invoice_items_invoice_idx on public.invoice_items (invoice_id);
alter table public.invoice_items enable row level security;

-- ============================================================
-- 4) Fatura numarası sayacı (yıl bazlı, atomik)
-- ============================================================
create table if not exists public.invoice_counters (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  year int not null,
  last_number int not null default 0,
  primary key (workspace_id, year)
);
alter table public.invoice_counters enable row level security;
-- Sayaç yalnızca aşağıdaki SECURITY DEFINER fonksiyon üzerinden değişir;
-- doğrudan erişim için bilinçli olarak politika açılmadı.

-- İptal edilen fatura numaraları YENİDEN KULLANILMAZ (muhasebe pratiği) —
-- sayaç yalnızca ileri gider.
create or replace function public.next_invoice_number(p_workspace_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year int := extract(year from current_date)::int;
  v_next int;
begin
  if not public.has_account_role(p_workspace_id, array['yonetici', 'muhasebeci']) then
    raise exception 'Bu işletmede fatura oluşturma yetkiniz yok.';
  end if;

  insert into public.invoice_counters (workspace_id, year, last_number)
  values (p_workspace_id, v_year, 1)
  on conflict (workspace_id, year)
  do update set last_number = public.invoice_counters.last_number + 1
  returning last_number into v_next;

  return v_year::text || '-' || lpad(v_next::text, 4, '0');
end;
$$;

grant execute on function public.next_invoice_number(uuid) to authenticated;

-- ============================================================
-- 5) Fatura toplamlarını kalemlerden otomatik hesapla
-- ============================================================
-- Toplamlar uygulamada da hesaplanıyor ama TEK DOĞRULUK KAYNAĞI burası —
-- kalem eklendiğinde/silindiğinde/güncellendiğinde başlık senkron kalır.
create or replace function public.recalc_invoice_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update public.invoices i
  set subtotal = coalesce(t.net, 0),
      vat_total = coalesce(t.vat, 0),
      total = coalesce(t.gross, 0),
      updated_at = now()
  from (
    select sum(net_total) as net, sum(vat_amount) as vat, sum(line_total) as gross
    from public.invoice_items where invoice_id = v_invoice
  ) t
  where i.id = v_invoice;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_invoice_items_totals on public.invoice_items;
create trigger trg_invoice_items_totals
  after insert or update or delete on public.invoice_items
  for each row execute function public.recalc_invoice_totals();

-- ============================================================
-- 6) workspace_id / user_id otomatik doldurma (diğer tablolarla aynı desen)
-- ============================================================
do $$
declare tbl text;
begin
  foreach tbl in array array['customers', 'invoices', 'invoice_items'] loop
    execute format('drop trigger if exists trg_%I_workspace_default on public.%I', tbl, tbl);
    execute format(
      'create trigger trg_%I_workspace_default before insert on public.%I for each row execute function public.set_workspace_id_default()',
      tbl, tbl
    );
  end loop;
end $$;

-- ============================================================
-- 7) RLS — rol + abonelik kontrolü (Faz 3 deseniyle birebir)
-- ============================================================
do $$
declare
  pol record;
  tbl text;
  new_tables text[] := array['customers', 'invoices', 'invoice_items'];
begin
  for pol in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename = any(new_tables)
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;

  foreach tbl in array new_tables loop
    execute format(
      'create policy "Workspace görüntüleme" on public.%I for select using (public.has_account_role(workspace_id, array[%L, %L, %L]))',
      tbl, 'yonetici', 'muhasebeci', 'salt_gorunum'
    );
    execute format(
      'create policy "Workspace ekleme" on public.%I for insert with check (public.has_account_role(workspace_id, array[%L, %L]) and public.workspace_can_write(workspace_id))',
      tbl, 'yonetici', 'muhasebeci'
    );
    execute format(
      'create policy "Workspace güncelleme" on public.%I for update using (public.has_account_role(workspace_id, array[%L, %L])) with check (public.has_account_role(workspace_id, array[%L, %L]) and public.workspace_can_write(workspace_id))',
      tbl, 'yonetici', 'muhasebeci', 'yonetici', 'muhasebeci'
    );
    execute format(
      'create policy "Workspace silme" on public.%I for delete using (public.has_account_role(workspace_id, array[%L, %L]) and public.workspace_can_write(workspace_id))',
      tbl, 'yonetici', 'muhasebeci'
    );
  end loop;
end $$;

-- ============================================================
-- 8) Denetim kaydı (audit_log) faturaları da kapsasın
-- ============================================================
do $$
declare tbl text;
begin
  foreach tbl in array array['customers', 'invoices'] loop
    execute format('drop trigger if exists trg_audit_%I on public.%I', tbl, tbl);
    execute format(
      'create trigger trg_audit_%I after insert or update or delete on public.%I for each row execute function public.write_audit_log()',
      tbl, tbl
    );
  end loop;
end $$;
