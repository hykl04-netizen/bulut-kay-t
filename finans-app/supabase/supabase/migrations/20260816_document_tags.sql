-- Belge arşivinde etiketleme ve arama desteği.
-- Var olan sabit `category` alanının yanına, kullanıcının kendi
-- belirlediği serbest metin etiketleri eklenebilsin diye `documents`
-- tablosuna bir metin dizisi (text[]) kolonu ekleniyor. GIN indeksi,
-- etiket bazlı filtrelemeyi (örn. `tags && array[...]`) hızlandırır.

alter table public.documents
  add column if not exists tags text[] not null default '{}';

create index if not exists documents_tags_gin_idx on public.documents using gin (tags);
