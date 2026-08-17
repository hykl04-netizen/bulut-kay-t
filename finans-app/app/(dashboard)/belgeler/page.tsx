// app/(dashboard)/belgeler/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { FileUpload } from '@/components/file-upload';
import { FileText, Plus, Trash2, ExternalLink, Calendar, Filter, Search, X, Tag } from 'lucide-react';
import { toast } from '@/components/ui/toaster';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { getCurrentAccountId } from '@/lib/supabase/account';
import { useTeamRole } from '@/lib/use-team-role';
import { canEditData } from '@/lib/team';

interface DocumentItem {
  id: string;
  title: string;
  category: string;
  file_url: string;
  document_date: string;
  notes: string;
  tags: string[] | null;
}

/** Serbest metni virgül/enter ile ayırıp normalize edilmiş (küçük harf, boşluksuz)
 * benzersiz etiket listesine çevirir. */
function parseTagsInput(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,\n]/)
        .map((t) => t.trim())
        .filter(Boolean)
    )
  );
}

const CATEGORIES = ['Tümü', 'Fatura', 'Fiş', 'Maaş Bordrosu', 'Vergi', 'Diğer'];

export default function BelgelerPage() {
  const { role, loading: roleLoading } = useTeamRole();
  const canEdit = roleLoading || !role || canEditData(role);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtreleme ve Sıralama State'leri
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // desc: en yeni, asc: en eski
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Form State'leri
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Fatura');
  const [fileUrl, setFileUrl] = useState('');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addTagsFromInput = () => {
    if (!tagInput.trim()) return;
    setTags((prev) => Array.from(new Set([...prev, ...parseTagsInput(tagInput)])));
    setTagInput('');
  };

  const fetchDocuments = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const accountId = await getCurrentAccountId(user.id);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('workspace_id', accountId)
        .order('document_date', { ascending: false });

      if (!error && data) {
        setDocuments(data);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchDocuments();
    });
  }, []);


  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileUrl) {
      toast.error('Lütfen bir dosya / fotoğraf yükleyin.');
      return;
    }

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsSubmitting(false);
      toast.error('Oturumunuz sona ermiş görünüyor. Lütfen sayfayı yenileyip tekrar giriş yapın.');
      return;
    }
    const accountId = await getCurrentAccountId(user.id);

    const { error } = await supabase.from('documents').insert({
      workspace_id: accountId,
      title,
      category,
      file_url: fileUrl,
      document_date: documentDate,
      notes,
      tags,
    });

    if (!error) {
      // Formu sıfırla ve kapat
      setTitle('');
      setFileUrl('');
      setNotes('');
      setTags([]);
      setTagInput('');
      setIsModalOpen(false);
      await fetchDocuments();
    } else {
      console.error('Belge kaydedilemedi:', error.message);
      toast.error(
        error.message?.includes('column') && error.message?.includes('tags')
          ? 'Belge kaydedilemedi: etiket alanı için migration çalıştırılmamış olabilir (bkz. yapılacaklar listesi).'
          : 'Belge kaydedilirken hata oluştu.'
      );
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog('Bu belgeyi silmek istediğinize emin misiniz?'))) return;

    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (!error) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    }
  };

  // Tüm belgelerde geçen benzersiz etiketler — filtre çubuğundaki rozetler için.
  const allTags = Array.from(new Set(documents.flatMap((d) => d.tags ?? []))).sort((a, b) =>
    a.localeCompare(b, 'tr')
  );

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  // Filtreleme ve Sıralama Mantığı
  const filteredDocuments = documents
    .filter((doc) => {
      const matchesCategory = selectedCategory === 'Tümü' || doc.category === selectedCategory;
      const docTags = doc.tags ?? [];
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        doc.title.toLowerCase().includes(q) ||
        (doc.notes && doc.notes.toLowerCase().includes(q)) ||
        docTags.some((t) => t.toLowerCase().includes(q));
      // Seçili etiketlerden en az biri belgede varsa eşleşir (OR mantığı) —
      // kategori filtresi gibi "hiçbiri seçili değilse hepsini göster".
      const matchesTags = selectedTags.length === 0 || selectedTags.some((t) => docTags.includes(t));
      return matchesCategory && matchesSearch && matchesTags;
    })
    .sort((a, b) => {
      const dateA = new Date(a.document_date).getTime();
      const dateB = new Date(b.document_date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="space-y-6">
      {/* Başlık ve Ekle Butonu */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Belgeler & Arşiv</h1>
          <p className="mt-1 text-muted-foreground dark:text-muted-foreground">
            Faturalarınızı, fişlerinizi, bordrolarınızı ve önemli evraklarınızı tek yerde saklayın.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-gold-cta inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-secondary dark:bg-secondary dark:text-foreground dark:hover:bg-slate-200"
          >
            <Plus className="h-4 w-4" />
            Yeni Belge Yükle
          </button>
        )}
      </div>

      {/* Filtreleme ve Arama Çubuğu */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm dark:border-border md:flex-row md:items-center md:justify-between">
        {/* Kategoriler */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="mr-1 h-4 w-4 text-muted-foreground" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                selectedCategory === cat
                  ? 'bg-primary text-white dark:bg-secondary dark:text-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-slate-200 dark:bg-secondary dark:text-muted-foreground dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Arama ve Sıralama */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-60">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Belge ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted py-2 pl-9 pr-4 text-sm focus:border-accent focus:outline-none dark:border-border dark:text-foreground"
            />
          </div>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
            className="rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-border dark:text-foreground"
          >
            <option value="desc">En Yeni Tarih</option>
            <option value="asc">En Eski Tarih</option>
          </select>
        </div>
      </div>

      {/* Etiket Filtreleri */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-3 dark:border-border">
          <Tag className="mr-1 h-4 w-4 text-muted-foreground" />
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTagFilter(tag)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                selectedTags.includes(tag)
                  ? 'bg-brand-gold text-accent-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-slate-200 dark:bg-secondary dark:text-muted-foreground dark:hover:bg-slate-700'
              }`}
            >
              #{tag}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="ml-1 text-xs font-medium text-muted-foreground hover:underline"
            >
              Temizle
            </button>
          )}
        </div>
      )}

      {/* Belge Kartları Listesi */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Belgeler yükleniyor...</div>
      ) : filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 dark:border-border">
          <FileText className="h-12 w-12 text-muted-foreground dark:text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-muted-foreground dark:text-muted-foreground">Kayıtlı belge bulunamadı.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md dark:border-border"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-block rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground dark:bg-secondary dark:text-muted-foreground">
                    {doc.category}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {doc.document_date}
                  </div>
                </div>

                <h3 className="mt-3 text-base font-bold text-foreground dark:text-foreground">{doc.title}</h3>
                {doc.notes && <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground line-clamp-2">{doc.notes}</p>}
                {doc.tags && doc.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {doc.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[11px] font-medium text-brand-gold dark:text-brand-gold-light"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border pt-4 dark:border-border">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  <ExternalLink className="h-4 w-4" />
                  Dosyayı Görüntüle
                </a>

                {canEdit && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Yeni Belge Ekleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-border pb-4 dark:border-border">
              <h2 className="text-lg font-bold">Yeni Belge / Fatura Yükle</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-muted-foreground dark:hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddDocument} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Belge Başlığı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Elektrik Faturası - Ağustos"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-border dark:text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-border dark:text-foreground"
                  >
                    {CATEGORIES.filter((c) => c !== 'Tümü').map((cat) => (
                      <option key={cat} value={cat} className="dark:bg-popover dark:text-popover-foreground">{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Belge Tarihi</label>
                  <input
                    type="date"
                    required
                    value={documentDate}
                    onChange={(e) => setDocumentDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-border dark:text-foreground"
                  />
                </div>
              </div>

              {/* Cloudinary Dosya Yükleme Bileşeni */}
              <FileUpload onUploadSuccess={(url) => setFileUrl(url)} label="Fatura / Belge Dosyası (Görsel veya PDF)" />

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Etiketler (İsteğe bağlı)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addTagsFromInput();
                      }
                    }}
                    placeholder="Örn: elektrik, 2026 (Enter veya virgülle ekle)"
                    className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-border dark:text-foreground"
                  />
                  <button
                    type="button"
                    onClick={addTagsFromInput}
                    className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted dark:text-slate-100 dark:hover:bg-secondary"
                  >
                    Ekle
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2 py-1 text-xs font-medium text-brand-gold dark:text-brand-gold-light"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                          className="hover:text-rose-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground dark:text-muted-foreground">Notlar (İsteğe bağlı)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ek açıklamalar..."
                  className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-border dark:text-foreground"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-secondary dark:text-muted-foreground dark:hover:bg-secondary"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !fileUrl}
                  className="btn-gold-cta rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-secondary disabled:opacity-50 dark:bg-secondary dark:text-foreground dark:hover:bg-slate-200"
                >
                  {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}