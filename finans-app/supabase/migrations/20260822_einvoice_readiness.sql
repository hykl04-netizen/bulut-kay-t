-- Faz 10 HAZIRLIĞI: resmi e-Fatura / e-Arşiv entegrasyonu için veri modeli.
-- 20260821_invoicing.sql'den SONRA çalıştırılır.
--
-- ⚠️ ÖNEMLİ: Bu migration entegrasyonu KURMAZ. Resmi e-Fatura göndermek için
-- GİB onaylı bir özel entegratörle (Logo/e-Logo, Foriba, Uyumsoft, Nes Bilgi
-- vb.) ticari sözleşme, GİB test ortamı onayı ve mali mühür/e-imza gerekir.
-- Bunlar teknik değil ticari/hukuki adımlardır.
--
-- Buradaki amaç: o gün geldiğinde ŞEMA DEĞİŞİKLİĞİ GEREKMEMESİ ve satıcı
-- künyesinin şimdiden toplanması. Yazılım tarafındaki arayüz lib/einvoice.ts.

-- ============================================================
-- 1) Satıcı (işletme) künye bilgileri
-- ============================================================
-- Fatura PDF'i ve e-Fatura için satıcının vergi bilgileri gerekiyor.
-- Bunlar bilinçli olarak `company_settings` yerine `workspaces` tablosuna
-- eklendi: company_settings hâlâ KULLANICI bazlı (Faz 1'den kalan sınırlama),
-- oysa fatura künyesi İŞLETME bazlı olmak zorunda — ikinci bir işletme açan
-- kullanıcı farklı bir vergi numarası kullanır.
-- Arayüzü: app/(dashboard)/fatura-kunyesi/page.tsx (yalnızca işletme sahibi).
alter table public.workspaces add column if not exists tax_number text;
alter table public.workspaces add column if not exists tax_office text;
alter table public.workspaces add column if not exists address text;
alter table public.workspaces add column if not exists invoice_note text;

-- ============================================================
-- 2) Fatura tarafında e-Fatura izleme alanları
-- ============================================================
-- 'yok'          : bu fatura e-Faturaya hiç gönderilmedi (varsayılan)
-- 'kuyrukta'     : entegratöre iletilmek üzere sıraya alındı
-- 'gonderildi'   : entegratöre iletildi, GİB yanıtı bekleniyor
-- 'kabul'/'red'  : GİB/alıcı yanıtı
-- 'hata'         : gönderim sırasında hata
alter table public.invoices add column if not exists einvoice_status text
  not null default 'yok'
  check (einvoice_status in ('yok', 'kuyrukta', 'gonderildi', 'kabul', 'red', 'hata'));

-- ETTN (Evrensel Tekil Tanımlama Numarası) — belgenin GİB nezdindeki tekil
-- kimliği. Entegratör üretir; bizde yalnızca saklanır.
alter table public.invoices add column if not exists einvoice_uuid text;
alter table public.invoices add column if not exists einvoice_provider text;
alter table public.invoices add column if not exists einvoice_ref text;
alter table public.invoices add column if not exists einvoice_error text;
alter table public.invoices add column if not exists einvoice_sent_at timestamptz;

create index if not exists invoices_einvoice_status_idx
  on public.invoices (workspace_id, einvoice_status)
  where einvoice_status <> 'yok';

-- ============================================================
-- 3) Alıcı tarafında e-Fatura mükellefiyeti
-- ============================================================
-- Alıcı e-Fatura mükellefiyse "e-Fatura", değilse "e-Arşiv" senaryosu
-- uygulanır. Bu bilgi entegratörün mükellef sorgusundan gelir; burada
-- önbelleklenir (her fatura için tekrar sorgulamamak adına).
alter table public.customers add column if not exists is_einvoice_user boolean;
alter table public.customers add column if not exists einvoice_alias text;
alter table public.customers add column if not exists einvoice_checked_at timestamptz;

-- ============================================================
-- 4) Fatura künyesinin eksiksizliğini raporlayan yardımcı
-- ============================================================
-- Entegrasyon açıldığında "bu fatura gönderilebilir mi?" kontrolü için.
-- Eksik alanları metin dizisi olarak döner; boş dizi = hazır.
-- Kural DB'de tutuluyor ki hem arayüz hem ileride sunucu route'u aynı
-- kontrolü kullansın.
create or replace function public.einvoice_missing_fields(p_invoice_id uuid)
returns text[]
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(array_agg(eksik), array[]::text[])
  from (
    select 'Satıcı vergi numarası' as eksik
    from public.invoices i join public.workspaces w on w.id = i.workspace_id
    where i.id = p_invoice_id and coalesce(trim(w.tax_number), '') = ''
    union all
    select 'Satıcı adresi'
    from public.invoices i join public.workspaces w on w.id = i.workspace_id
    where i.id = p_invoice_id and coalesce(trim(w.address), '') = ''
    union all
    select 'Alıcı (cari) seçilmemiş'
    from public.invoices i
    where i.id = p_invoice_id and i.customer_id is null
    union all
    select 'Alıcı vergi/TC numarası'
    from public.invoices i join public.customers c on c.id = i.customer_id
    where i.id = p_invoice_id and coalesce(trim(c.tax_number), '') = ''
    union all
    select 'Alıcı adresi'
    from public.invoices i join public.customers c on c.id = i.customer_id
    where i.id = p_invoice_id and coalesce(trim(c.address), '') = ''
    union all
    select 'Fatura kalemi yok'
    from public.invoices i
    where i.id = p_invoice_id
      and not exists (select 1 from public.invoice_items it where it.invoice_id = i.id)
  ) s;
$$;

grant execute on function public.einvoice_missing_fields(uuid) to authenticated;
