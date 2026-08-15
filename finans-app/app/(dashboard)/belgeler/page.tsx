// app/(dashboard)/belgeler/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { FileUpload } from '@/components/file-upload';
import { FileText, Plus, Trash2, ExternalLink, Calendar, Filter, Search, X } from 'lucide-react';

interface DocumentItem {
  id: string;
  title: string;
  category: string;
  file_url: string;
  document_date: string;
  notes: string;
}

const CATEGORIES = ['Tümü', 'Fatura', 'Fiş', 'Maaş Bordrosu', 'Vergi', 'Diğer'];

export default function BelgelerPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtreleme ve Sıralama State'leri
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // desc: en yeni, asc: en eski
  const [searchQuery, setSearchQuery] = useState('');

  // Form State'leri
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Fatura');
  const [fileUrl, setFileUrl] = useState('');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
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
      alert('Lütfen bir dosya / fotoğraf yükleyin.');
      return;
    }

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsSubmitting(false);
      alert('Oturumunuz sona ermiş görünüyor. Lütfen sayfayı yenileyip tekrar giriş yapın.');
      return;
    }

    const { error } = await supabase.from('documents').insert({
      user_id: user.id,
      title,
      category,
      file_url: fileUrl,
      document_date: documentDate,
      notes,
    });

    if (!error) {
      // Formu sıfırla ve kapat
      setTitle('');
      setFileUrl('');
      setNotes('');
      setIsModalOpen(false);
      await fetchDocuments();
    } else {
      alert('Belge kaydedilirken hata oluştu.');
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu belgeyi silmek istediğinize emin misiniz?')) return;

    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (!error) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    }
  };

  // Filtreleme ve Sıralama Mantığı
  const filteredDocuments = documents
    .filter((doc) => {
      const matchesCategory = selectedCategory === 'Tümü' || doc.category === selectedCategory;
      const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (doc.notes && doc.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Belgeler & Arşiv</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Faturalarınızı, fişlerinizi, bordrolarınızı ve önemli evraklarınızı tek yerde saklayın.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <Plus className="h-4 w-4" />
          Yeni Belge Yükle
        </button>
      </div>

      {/* Filtreleme ve Arama Çubuğu */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        {/* Kategoriler */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="mr-1 h-4 w-4 text-slate-400" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Arama ve Sıralama */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-60">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Belge ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="desc">En Yeni Tarih</option>
            <option value="asc">En Eski Tarih</option>
          </select>
        </div>
      </div>

      {/* Belge Kartları Listesi */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">Belgeler yükleniyor...</div>
      ) : filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
          <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">Kayıtlı belge bulunamadı.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {doc.category}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    {doc.document_date}
                  </div>
                </div>

                <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">{doc.title}</h3>
                {doc.notes && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{doc.notes}</p>}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  <ExternalLink className="h-4 w-4" />
                  Dosyayı Görüntüle
                </a>

                <button
                  onClick={() => handleDelete(doc.id)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                  title="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Yeni Belge Ekleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="text-lg font-bold">Yeni Belge / Fatura Yükle</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddDocument} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Belge Başlığı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Elektrik Faturası - Ağustos"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:text-white"
                  >
                    {CATEGORIES.filter((c) => c !== 'Tümü').map((cat) => (
                      <option key={cat} value={cat} className="dark:bg-slate-900">{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Belge Tarihi</label>
                  <input
                    type="date"
                    required
                    value={documentDate}
                    onChange={(e) => setDocumentDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Cloudinary Dosya Yükleme Bileşeni */}
              <FileUpload onUploadSuccess={(url) => setFileUrl(url)} label="Fatura / Belge Dosyası (Görsel veya PDF)" />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Notlar (İsteğe bağlı)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ek açıklamalar..."
                  className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !fileUrl}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
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