'use client';

// Fiş/fatura fotoğrafından tutar, tarih ve satıcı bilgisini otomatik okuyup
// forma aktaran buton. `/api/ocr-fis` route'unu çağırır (sunucu tarafında
// Anthropic API'ye vision isteği atar, anahtar istemciye hiç gelmez).

import { useRef, useState } from 'react';
import { ScanLine, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/toaster';

export interface OcrResult {
  title: string | null;
  amount: number | null;
  date: string | null;
}

interface OcrReceiptButtonProps {
  onExtracted: (result: OcrResult) => void;
  className?: string;
}

export function OcrReceiptButton({ onExtracted, className = '' }: OcrReceiptButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // aynı dosyayı tekrar seçebilmek için

    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen bir görsel dosyası seçin (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Görsel 10MB sınırını aşıyor.');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/ocr-fis', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error ?? 'Fiş okunamadı. Lütfen bilgileri elle girin.');
        return;
      }

      const result: OcrResult = data;
      if (!result.title && !result.amount && !result.date) {
        toast.info('Fişten bilgi çıkarılamadı. Lütfen alanları elle doldurun.');
        return;
      }

      onExtracted(result);
      toast.success('Fiş okundu, alanlar dolduruldu — kontrol etmeyi unutmayın.');
    } catch {
      toast.error('Bağlantı hatası oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand-gold/60 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-brand-gold transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanLine className="h-3.5 w-3.5" />}
        {isLoading ? 'Fiş okunuyor...' : 'Fişten Otomatik Doldur'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
        disabled={isLoading}
      />
    </>
  );
}
