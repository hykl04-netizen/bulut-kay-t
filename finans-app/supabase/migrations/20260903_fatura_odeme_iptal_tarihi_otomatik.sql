-- 20260903 — Faturanın ödeme/iptal tarihi durumla birlikte otomatik işaretlenir.
--
-- BULUNAN SORUN: "Ödendi İşaretle" düğmesi saveInvoice() üzerinden gidiyor
-- ve o fonksiyon paid_at kolonuna hiç dokunmuyordu. Canlıda doğrulandı:
-- fatura 2026-0001 status='odendi' olduğu hâlde paid_at NULL kaldı.
-- Tahsilatın NE ZAMAN yapıldığı kayıtsız kalıyordu.
--
-- (paid_at'i doğru dolduran tek yol updateInvoiceStatus idi, o da yalnızca
-- iptal işlemi için kullanılıyordu.)
--
-- ÇÖZÜM: kural veritabanında. Hangi ekrandan gelirse gelsin durum 'odendi'
-- olduğunda tarih düşer, durumdan çıkınca temizlenir. Zaten dolu olan
-- paid_at KORUNUR — ödenmiş bir fatura tekrar kaydedildiğinde tarih
-- bugüne kaymaz.

create or replace function public.sync_invoice_status_dates()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.status = 'odendi' then
    if new.paid_at is null then new.paid_at := now(); end if;
  else
    new.paid_at := null;
  end if;

  if new.status = 'iptal' then
    if new.cancelled_at is null then new.cancelled_at := now(); end if;
  else
    new.cancelled_at := null;
  end if;

  return new;
end;
$$;

revoke execute on function public.sync_invoice_status_dates() from public, anon, authenticated;

drop trigger if exists trg_invoices_status_dates on public.invoices;
create trigger trg_invoices_status_dates
  before insert or update on public.invoices
  for each row execute function public.sync_invoice_status_dates();

update public.invoices
set paid_at = coalesce(paid_at, updated_at)
where status = 'odendi' and paid_at is null;
