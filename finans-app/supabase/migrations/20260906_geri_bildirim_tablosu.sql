-- 20260906 — Kapalı beta geri bildirimi.
--
-- NEDEN GEREKLİ: iki haftalık testin sonunda "somut veri" isteniyor ama
-- test kullanıcısının bir şey iletebileceği hiçbir yol yoktu; hata
-- bildirimi de kapalıydı (NEXT_PUBLIC_HATA_BILDIRIM_URL boş). Sözlü geri
-- bildirim "iyiydi"ye indirgenir ve hangi ekranda ne olduğu kaybolur.
--
-- İki kaynak aynı tabloya yazıyor:
--   'oneri' / 'hata' / 'soru'  → kullanıcının kendi yazdığı
--   'otomatik_hata'            → tarayıcıda oluşan çalışma zamanı hatası
-- İkincisi önemli: kullanıcı hiçbir şey söylemese bile kırılan yer kayda
-- geçiyor.

create table if not exists public.geri_bildirim (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  tur text not null check (tur in ('oneri', 'hata', 'soru', 'otomatik_hata')),
  mesaj text not null check (length(btrim(mesaj)) between 1 and 4000),
  sayfa text,
  tarayici text,
  ekran text,
  created_at timestamptz not null default now()
);

create index if not exists geri_bildirim_created_idx on public.geri_bildirim (created_at desc);
create index if not exists geri_bildirim_user_idx on public.geri_bildirim (user_id);

alter table public.geri_bildirim enable row level security;

-- user_id istemciden gelmez; sunucu auth.uid() ile doldurur. Böylece kimse
-- başkasının adına geri bildirim yazamaz.
create or replace function public.set_geri_bildirim_sahibi()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

revoke execute on function public.set_geri_bildirim_sahibi() from public, anon, authenticated;

drop trigger if exists trg_geri_bildirim_sahibi on public.geri_bildirim;
create trigger trg_geri_bildirim_sahibi
  before insert on public.geri_bildirim
  for each row execute function public.set_geri_bildirim_sahibi();

drop policy if exists "Kendi geri bildirimini ekleyebilir" on public.geri_bildirim;
create policy "Kendi geri bildirimini ekleyebilir" on public.geri_bildirim
  for insert to authenticated with check (true);

drop policy if exists "Kendi geri bildirimini gorebilir" on public.geri_bildirim;
create policy "Kendi geri bildirimini gorebilir" on public.geri_bildirim
  for select to authenticated using (user_id = (select auth.uid()));
