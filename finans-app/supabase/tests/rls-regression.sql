-- ============================================================
-- FinansApp — RLS REGRESYON TESTLERİ
-- ============================================================
-- Bu uygulamanın TÜM güvenlik modeli satır bazlı güvenlik (RLS) üzerine
-- kurulu. Politikalar Faz 1-5 boyunca defalarca yeniden yazıldı; her
-- yeniden yazımda "bir işletmenin verisi başka bir işletmede görünmesin"
-- garantisinin bozulma riski var ve böyle bir hata SESSİZCE olur.
--
-- NASIL ÇALIŞTIRILIR
--   A) Supabase Dashboard > SQL Editor'e yapıştırıp Run (en kolay yol)
--   B) psql "$DATABASE_URL" -f supabase/tests/rls-regression.sql
--   C) npm run test:rls   (package.json'daki script — B'nin kısayolu)
--
-- GÜVENLİ: Her şey tek bir transaction içinde yapılır ve sonunda ROLLBACK
-- edilir. Üretim veritabanında çalıştırmak veri değiştirmez.
--
-- ÇIKTI: Testlerin listesi + geçti/kaldı. Kalan test varsa script hata ile
-- biter (CI'da kırmızı yanar).
-- ============================================================

begin;

create temp table test_sonuc(sira serial, ad text, gecti boolean, detay text);
-- Testler rol değiştirerek çalıştığı için sonuç tablosu tüm rollere açık olmalı.
grant all on table test_sonuc to authenticated, anon;
grant usage, select on all sequences in schema pg_temp to authenticated, anon;

-- Yardımcı: beklenen ile gerçekleşeni karşılaştırıp kaydeder.
create or replace function pg_temp.kontrol(p_ad text, p_gercek anyelement, p_beklenen anyelement)
returns void language plpgsql as $$
begin
  insert into test_sonuc(ad, gecti, detay)
  values (
    p_ad,
    p_gercek is not distinct from p_beklenen,
    case when p_gercek is not distinct from p_beklenen
      then 'ok'
      else format('beklenen=%s gerçek=%s', p_beklenen, p_gercek) end
  );
end $$;

-- Yardımcı: verilen SQL'in HATA VERMESİ beklenir (RLS engellemeli).
create or replace function pg_temp.engellenmeli(p_ad text, p_sql text)
returns void language plpgsql as $$
begin
  execute p_sql;
  insert into test_sonuc(ad, gecti, detay) values (p_ad, false, 'geçti ama engellenmeliydi');
exception when others then
  insert into test_sonuc(ad, gecti, detay) values (p_ad, true, 'engellendi: ' || left(SQLERRM, 60));
end $$;

-- Yardımcı: oturumu belirtilen kullanıcıya geçirir.
create or replace function pg_temp.oturum(p_uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
end $$;

create or replace function pg_temp.yonetici()
returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
end $$;

do $$
declare
  v_sahip_a uuid := gen_random_uuid();
  v_sahip_b uuid := gen_random_uuid();
  v_muhasebeci uuid := gen_random_uuid();
  v_salt uuid := gen_random_uuid();
  v_ws_a uuid;
  v_ws_b uuid;
  v_kat_a uuid;
  v_cari_a uuid;
  v_fatura_a uuid;
  v_no text;
  v_cnt int;
  v_num numeric;
begin
  perform pg_temp.yonetici();

  -- ---------- Kurulum: iki ayrı işletme, iki ayrı sahip ----------
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_sahip_a, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','test-sahip-a@example.test','x','{}'::jsonb,'{}'::jsonb, now(), now()),
    (v_sahip_b, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','test-sahip-b@example.test','x','{}'::jsonb,'{}'::jsonb, now(), now()),
    (v_muhasebeci,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','test-muhasebeci@example.test','x','{}'::jsonb,'{}'::jsonb, now(), now()),
    (v_salt, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','test-salt@example.test','x','{}'::jsonb,'{}'::jsonb, now(), now());

  select id into v_ws_a from public.workspaces where owner_id = v_sahip_a;
  select id into v_ws_b from public.workspaces where owner_id = v_sahip_b;

  perform pg_temp.kontrol('Kurulum: yeni kullanıcıya otomatik işletme açıldı', (v_ws_a is not null and v_ws_b is not null), true);

  -- İki işletmeyi de ücretli/aktif yap ki abonelik testleri ayrı yapılabilsin.
  update public.subscriptions set plan='kurumsal', status='aktif' where workspace_id in (v_ws_a, v_ws_b);

  -- A işletmesine muhasebeci ve salt görünüm üyesi ekle.
  insert into public.team_members (workspace_id, member_user_id, invited_email, role, status, invited_by, joined_at)
  values (v_ws_a, v_muhasebeci, 'test-muhasebeci@example.test', 'muhasebeci', 'aktif', v_sahip_a, now()),
         (v_ws_a, v_salt, 'test-salt@example.test', 'salt_gorunum', 'aktif', v_sahip_a, now());

  -- A işletmesine veri.
  insert into public.categories (workspace_id, user_id, type, name, color)
  values (v_ws_a, v_sahip_a, 'gider', 'Test Kategori', '#000') returning id into v_kat_a;
  insert into public.transactions (workspace_id, user_id, date, type, amount, category_id)
  values (v_ws_a, v_sahip_a, current_date, 'gider', 500, v_kat_a);
  insert into public.payrolls (workspace_id, user_id, period, gross_salary, net_salary)
  values (v_ws_a, v_sahip_a, current_date, 1000, 800);

  -- ============================================================
  -- 1) İŞLETME İZOLASYONU — en kritik garanti
  -- ============================================================
  perform pg_temp.oturum(v_sahip_b);
  select count(*) into v_cnt from public.transactions where workspace_id = v_ws_a;
  perform pg_temp.kontrol('İzolasyon: B sahibi A işletmesinin işlemlerini GÖREMEZ', v_cnt, 0);
  select count(*) into v_cnt from public.categories where workspace_id = v_ws_a;
  perform pg_temp.kontrol('İzolasyon: B sahibi A işletmesinin kategorilerini GÖREMEZ', v_cnt, 0);

  perform pg_temp.engellenmeli(
    'İzolasyon: B sahibi A işletmesine kayıt EKLEYEMEZ',
    format('insert into public.transactions (workspace_id, date, type, amount) values (%L, current_date, ''gider'', 1)', v_ws_a)
  );

  perform pg_temp.oturum(v_sahip_a);
  select count(*) into v_cnt from public.transactions where workspace_id = v_ws_a;
  perform pg_temp.kontrol('İzolasyon: A sahibi KENDİ işlemlerini görür', v_cnt, 1);

  -- ============================================================
  -- 2) ROL BAZLI YETKİ
  -- ============================================================
  perform pg_temp.oturum(v_salt);
  select count(*) into v_cnt from public.transactions where workspace_id = v_ws_a;
  perform pg_temp.kontrol('Rol: salt_gorunum OKUYABİLİR', v_cnt, 1);
  perform pg_temp.engellenmeli(
    'Rol: salt_gorunum YAZAMAZ',
    format('insert into public.transactions (workspace_id, date, type, amount) values (%L, current_date, ''gider'', 1)', v_ws_a)
  );
  select count(*) into v_cnt from public.payrolls where workspace_id = v_ws_a;
  perform pg_temp.kontrol('Rol: salt_gorunum BORDRO göremez (hassas veri)', v_cnt, 0);

  perform pg_temp.oturum(v_muhasebeci);
  select count(*) into v_cnt from public.payrolls where workspace_id = v_ws_a;
  perform pg_temp.kontrol('Rol: muhasebeci bordroyu görebilir', v_cnt, 1);
  insert into public.transactions (workspace_id, date, type, amount) values (v_ws_a, current_date, 'gelir', 250);
  perform pg_temp.kontrol('Rol: muhasebeci kayıt ekleyebilir', true, true);

  -- ============================================================
  -- 3) ABONELİK: bitince YAZMA durur, OKUMA sürer
  -- ============================================================
  perform pg_temp.yonetici();
  update public.subscriptions set plan='baslangic', status='suresi_doldu' where workspace_id = v_ws_a;
  perform pg_temp.oturum(v_sahip_a);

  select count(*) into v_cnt from public.transactions where workspace_id = v_ws_a;
  perform pg_temp.kontrol('Abonelik: bitince OKUMA devam eder', v_cnt, 2);
  perform pg_temp.engellenmeli(
    'Abonelik: bitince YAZMA durur',
    format('insert into public.transactions (workspace_id, date, type, amount) values (%L, current_date, ''gider'', 1)', v_ws_a)
  );
  select count(*) into v_cnt from public.payrolls where workspace_id = v_ws_a;
  perform pg_temp.kontrol('Plan: baslangic planında BORDRO kilitli', v_cnt, 0);

  perform pg_temp.yonetici();
  update public.subscriptions set plan='kurumsal', status='aktif' where workspace_id = v_ws_a;

  -- ============================================================
  -- 4) PLAN BAZLI KULLANICI LİMİTİ
  -- ============================================================
  perform pg_temp.yonetici();
  update public.subscriptions set plan='baslangic', status='aktif' where workspace_id = v_ws_b;
  perform pg_temp.engellenmeli(
    'Limit: Başlangıç planında (1 kullanıcı) davet engellenir',
    format('insert into public.team_members (workspace_id, invited_email, role, status, invited_by) values (%L, ''yeni@example.test'', ''muhasebeci'', ''beklemede'', %L)', v_ws_b, v_sahip_b)
  );
  update public.subscriptions set plan='kurumsal', status='aktif' where workspace_id = v_ws_b;

  -- ============================================================
  -- 5) DÖNEM KİLİDİ (işletme bazlı olmalı)
  -- ============================================================
  perform pg_temp.yonetici();
  insert into public.period_locks (workspace_id, user_id, locked_before, updated_at)
  values (v_ws_a, v_sahip_a, current_date, now())
  on conflict (workspace_id) do update set locked_before = excluded.locked_before;

  perform pg_temp.oturum(v_muhasebeci);
  perform pg_temp.engellenmeli(
    'Dönem kilidi: BAŞKA bir ekip üyesi de kilide takılır',
    format('insert into public.transactions (workspace_id, date, type, amount) values (%L, current_date - 10, ''gider'', 1)', v_ws_a)
  );

  perform pg_temp.oturum(v_sahip_b);
  insert into public.transactions (workspace_id, date, type, amount)
  values (v_ws_b, current_date - 10, 'gider', 1);
  perform pg_temp.kontrol('Dönem kilidi: DİĞER işletmeye taşımaz', true, true);

  perform pg_temp.yonetici();
  delete from public.period_locks where workspace_id = v_ws_a;

  -- ============================================================
  -- 6) AYAR TABLOLARI İŞLETME BAZLI
  -- ============================================================
  perform pg_temp.oturum(v_sahip_a);
  insert into public.company_settings (workspace_id, user_id, company_name, updated_at)
  values (v_ws_a, v_sahip_a, 'A Şirketi', now());

  perform pg_temp.oturum(v_sahip_b);
  select count(*) into v_cnt from public.company_settings where workspace_id = v_ws_a;
  perform pg_temp.kontrol('Ayarlar: B sahibi A''nın şirket ayarını GÖREMEZ', v_cnt, 0);

  -- ============================================================
  -- 7) ABONELİĞİ KULLANICI DEĞİŞTİREMEZ
  -- ============================================================
  perform pg_temp.oturum(v_sahip_b);
  update public.subscriptions set plan = 'kurumsal' where workspace_id = v_ws_b;
  get diagnostics v_cnt = row_count;
  perform pg_temp.kontrol('Abonelik: kullanıcı kendi planını YÜKSELTEMEZ (0 satır)', v_cnt, 0);

  -- ============================================================
  -- 8) FATURA: numaralandırma, toplamlar, izolasyon
  -- ============================================================
  perform pg_temp.oturum(v_sahip_a);
  insert into public.customers (workspace_id, name, tax_number) values (v_ws_a, 'Test Cari', '111') returning id into v_cari_a;
  v_no := public.next_invoice_number(v_ws_a);
  insert into public.invoices (workspace_id, customer_id, invoice_number, issue_date, status)
  values (v_ws_a, v_cari_a, v_no, current_date, 'taslak') returning id into v_fatura_a;

  insert into public.invoice_items (workspace_id, invoice_id, description, quantity, unit_price, vat_rate, net_total, vat_amount, line_total, sort_order)
  values (v_ws_a, v_fatura_a, 'Hizmet', 10, 1000, 20, 10000, 2000, 12000, 0),
         (v_ws_a, v_fatura_a, 'Kitap', 2, 500, 1, 1000, 10, 1010, 1);

  select total into v_num from public.invoices where id = v_fatura_a;
  perform pg_temp.kontrol('Fatura: toplam kalemlerden hesaplanır', v_num, 13010::numeric);

  delete from public.invoice_items where invoice_id = v_fatura_a and description = 'Kitap';
  select total into v_num from public.invoices where id = v_fatura_a;
  perform pg_temp.kontrol('Fatura: kalem silinince toplam güncellenir', v_num, 12000::numeric);

  perform pg_temp.engellenmeli(
    'Fatura: aynı numara iki kez kullanılamaz',
    format('insert into public.invoices (workspace_id, invoice_number, issue_date, status) values (%L, %L, current_date, ''taslak'')', v_ws_a, v_no)
  );

  perform pg_temp.oturum(v_sahip_b);
  select count(*) into v_cnt from public.invoices where workspace_id = v_ws_a;
  perform pg_temp.kontrol('İzolasyon: B sahibi A''nın faturalarını GÖREMEZ', v_cnt, 0);
  select count(*) into v_cnt from public.customers where workspace_id = v_ws_a;
  perform pg_temp.kontrol('İzolasyon: B sahibi A''nın carilerini GÖREMEZ', v_cnt, 0);

  -- ============================================================
  -- 9) DAVETLİ KULLANICIYA KİŞİSEL İŞLETME AÇILMAZ
  -- ============================================================
  perform pg_temp.yonetici();
  declare v_davetli uuid := gen_random_uuid();
  begin
    insert into public.team_members (workspace_id, invited_email, role, status, invited_by)
    values (v_ws_b, 'test-davetli@example.test', 'muhasebeci', 'beklemede', v_sahip_b);

    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (v_davetli, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','test-davetli@example.test','x','{}'::jsonb,'{}'::jsonb, now(), now());

    select count(*) into v_cnt from public.workspaces where owner_id = v_davetli;
    perform pg_temp.kontrol('Davet: davetli kullanıcıya kişisel işletme AÇILMAZ', v_cnt, 0);

    select count(*) into v_cnt from public.team_members
      where invited_email = 'test-davetli@example.test' and status = 'aktif' and member_user_id = v_davetli;
    perform pg_temp.kontrol('Davet: kayıt olunca davet otomatik aktifleşir', v_cnt, 1);
  end;

  perform pg_temp.yonetici();
end $$;

-- ---------- Sonuçlar ----------
select
  lpad(sira::text, 2, '0') as "#",
  case when gecti then 'GEÇTİ' else 'KALDI' end as "durum",
  ad as "test",
  case when gecti then '' else detay end as "ayrıntı"
from test_sonuc
order by sira;

select
  count(*) filter (where gecti) as gecen,
  count(*) filter (where not gecti) as kalan,
  count(*) as toplam
from test_sonuc;

-- Kalan test varsa script hata ile biter (CI için).
do $$
declare v_kalan int;
begin
  select count(*) into v_kalan from test_sonuc where not gecti;
  if v_kalan > 0 then
    raise exception 'RLS REGRESYON TESTİ BAŞARISIZ: % test kaldı. Yukarıdaki tabloya bakın.', v_kalan;
  end if;
  raise notice 'Tüm RLS regresyon testleri geçti.';
end $$;

rollback;
