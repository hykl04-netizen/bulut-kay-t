// components/file-upload.tsx
'use client';

import { useState, useRef } from 'react';
import { UploadCloud, Loader2, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

const STORAGE_BUCKET = 'belgeler';

interface FileUploadProps {
  onUploadSuccess: (url: string) => void;
  label?: string;
  /** Düzenleme modunda: kayda daha önce eklenmiş belge varsa URL'i buradan verin. */
  initialUrl?: string | null;
}

export function FileUpload({ onUploadSuccess, label = "Fiş / Fatura Fotoğrafı Ekle", initialUrl = null }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Sadece görsel ve PDF'lere izin ver
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Lütfen sadece görsel veya PDF yükleyin.');
      return;
    }

    // 5MB Sınırı
    if (file.size > 5 * 1024 * 1024) {
      setError('Dosya boyutu 5MB sınırını aşamaz.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
        setIsUploading(false);
        return;
      }

      // Kullanıcı bazlı klasör + rastgele dosya adı (çakışmayı önler)
      const fileExt = file.name.split('.').pop();
      const randomName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${randomName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        setError(`Yükleme başarısız oldu: ${uploadError.message}`);
        setIsUploading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      setUploadedUrl(publicUrlData.publicUrl);
      onUploadSuccess(publicUrlData.publicUrl);
    } catch {
      setError('Bağlantı hatası oluştu.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      
      {!uploadedUrl ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 py-6 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          {isUploading ? (
            <div className="flex flex-col items-center text-emerald-600">
              <Loader2 className="mb-2 h-6 w-6 animate-spin" />
              <span className="text-sm font-medium">Yükleniyor...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-slate-500 dark:text-slate-400">
              <UploadCloud className="mb-2 h-6 w-6" />
              <span className="text-sm">Tıklayın veya dokunun</span>
              <span className="text-xs mt-1">PNG, JPG, PDF (Max. 5MB)</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/20">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">
              {initialUrl && uploadedUrl === initialUrl ? 'Belge ekli' : 'Dosya başarıyla eklendi'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={uploadedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-100"
            >
              <ImageIcon className="h-4 w-4" />
              Görüntüle
            </a>
            <button
              type="button"
              onClick={() => setUploadedUrl(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Değiştir
            </button>
          </div>
        </div>
      )}
      
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  );
}