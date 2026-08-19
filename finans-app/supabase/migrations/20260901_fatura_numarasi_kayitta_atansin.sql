-- 20260901 — Fatura numarası artık FATURA KAYDEDİLİRKEN atanıyor.
--
-- BULUNAN SORUN: numara, "Yeni Fatura" ekranı AÇILIRKEN üretiliyordu
-- (invoice-form.tsx → nextInvoiceNumber). Kullanıcı ekranı açıp vazgeçerse
-- o numara yanıyordu. Canlı veritabanında ölçüldü: sayaç 2'ye gelmişti,
-- kayıtlı fatura sayısı 0 idi.
--
-- NEDEN ÖNEMLİ: Türkiye'de fatura numaraları ARALIKSIZ ve SIRALI olmak
-- zorunda. Üç kez ekranı açıp vazgeçmek defterlerde üç numaralık delik
-- açar; mali müşavir bunu sorar.
--
-- ÇÖZÜM: numara yalnızca INSERT anında, veritabanında atanır. İstemci
-- kolonu hiç göndermez. next_invoice_number atomik olduğu için iki kişi
-- aynı anda kaydetse bile çakışma olmaz.

create or replace function public.assign_invoice_number()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.invoice_number is null or btrim(new.invoice_number) = '' then
    new.invoice_number := public.next_invoice_number(new.workspace_id);
  end if;
  return new;
end;
$$;

revoke execute on function public.assign_invoice_number() from public, anon, authenticated;

drop trigger if exists trg_invoices_assign_number on public.invoices;
create trigger trg_invoices_assign_number
  before insert on public.invoices
  for each row execute function public.assign_invoice_number();

-- Yanmış numaraları geri al: sayaç, o hesap/yıl için GERÇEKTEN var olan en
-- büyük fatura numarasına çekilir. Fatura yoksa 0'a döner, yani ilk gerçek
-- fatura 2026-0001 olur. Var olan faturalar asla etkilenmez.
update public.invoice_counters c
set last_number = coalesce(
  (select max((regexp_replace(i.invoice_number, '^\d{4}-', ''))::int)
   from public.invoices i
   where i.workspace_id = c.workspace_id
     and i.invoice_number ~ ('^' || c.year::text || '-\d+$')),
  0)
where c.last_number > coalesce(
  (select max((regexp_replace(i.invoice_number, '^\d{4}-', ''))::int)
   from public.invoices i
   where i.workspace_id = c.workspace_id
     and i.invoice_number ~ ('^' || c.year::text || '-\d+$')),
  0);
