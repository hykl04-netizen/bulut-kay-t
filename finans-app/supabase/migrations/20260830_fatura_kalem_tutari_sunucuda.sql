-- 20260830 — Fatura kalemi tutarları artık SUNUCUDA hesaplanıyor.
--
-- BULUNAN AÇIK: invoices.subtotal / vat_total / total, invoice_items
-- tablosundaki net_total / vat_amount / line_total sütunlarının
-- toplamından üretiliyordu (trg_invoice_items_totals). Ama bu üç sütunu
-- hiçbir şey hesaplamıyordu — varsayılanları 0'dı ve değeri TARAYICI
-- gönderiyordu. Yani istemci quantity=2, unit_price=1000 gönderip
-- line_total=0 diyebiliyordu; fatura 0,00 TL olarak kaydediliyordu.
--
-- Uygulama doğru hesaplıyor (lib/invoices.ts → calcItem), ama veritabanı
-- bunu doğrulamıyordu. Tek bir istemci hatası veya doğrudan REST çağrısı
-- yanlış tutarlı resmi belge üretebilirdi.
--
-- ÇÖZÜM: kalem tutarları BEFORE INSERT/UPDATE ile miktar x birim fiyat x
-- KDV oranından yeniden hesaplanır; istemciden gelen değer yok sayılır.
-- Yuvarlama lib/invoices.ts ile birebir aynı: iki basamak, yarımı yukarı.

create or replace function public.calc_invoice_item_amounts()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  new.net_total  := round(new.quantity * new.unit_price, 2);
  new.vat_amount := round(new.net_total * (new.vat_rate / 100.0), 2);
  new.line_total := round(new.net_total + new.vat_amount, 2);
  return new;
end;
$$;

revoke execute on function public.calc_invoice_item_amounts() from public, anon, authenticated;

drop trigger if exists trg_invoice_items_amounts on public.invoice_items;
create trigger trg_invoice_items_amounts
  before insert or update on public.invoice_items
  for each row execute function public.calc_invoice_item_amounts();

alter table public.invoice_items drop constraint if exists invoice_items_amounts_sane;
alter table public.invoice_items add constraint invoice_items_amounts_sane
  check (quantity >= 0 and unit_price >= 0 and vat_rate >= 0 and vat_rate <= 100);
