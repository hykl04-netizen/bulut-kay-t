-- 20260902 — next_invoice_number artık yalnızca tetikleyiciden çağrılabilir.
--
-- Giriş yapmış bir kullanıcı /rest/v1/rpc/next_invoice_number çağırarak
-- fatura sayacını istediği kadar ilerletebiliyordu — hiç fatura kesmeden
-- seride delik açmak mümkündü. Numarayı zaten trg_invoices_assign_number
-- atıyor; o tetikleyici SECURITY DEFINER olduğu için bu grant'e ihtiyaç
-- duymuyor.
revoke execute on function public.next_invoice_number(uuid) from public, anon, authenticated;
