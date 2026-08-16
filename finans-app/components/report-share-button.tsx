// components/report-share-button.tsx
'use client';

import { Download } from 'lucide-react';

interface ReportShareButtonProps {
  targetElementId: string;
  reportTitle?: string;
}

export function ReportShareButton({ targetElementId, reportTitle = 'Finansal Rapor' }: ReportShareButtonProps) {
  const handleShareOrDownload = async () => {
    const element = document.getElementById(targetElementId);
    if (!element) return;

    try {
      const htmlToImage = await import('html-to-image');
      const dataUrl = await htmlToImage.toPng(element, { backgroundColor: '#ffffff' });
      
      const link = document.createElement('a');
      link.download = `${reportTitle.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Görsel oluşturulurken hata:', err);
      alert('Rapor görseli indirilemedi.');
    }
  };

  return (
    <button
      onClick={handleShareOrDownload}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-white shadow transition hover:bg-secondary dark:bg-secondary dark:text-foreground dark:hover:bg-slate-200"
    >
      <Download className="h-4 w-4" />
      Grafiği İndir
    </button>
  );
}