// finans-app/components/backup-modal.tsx
'use client';

import { useState } from 'react';
import { exportAllDataAsJSON } from '@/lib/backup';

export function BackupModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setLoading(true);
    setMsg(null);
    const res = await exportAllDataAsJSON();
    setLoading(false);
    if (res.success) {
      setMsg({ type: 'success', text: 'Yedek JSON dosyası başarıyla indirildi!' });
    } else {
      setMsg({ type: 'error', text: 'Yedek alınırken bir hata oluştu.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:text-slate-100">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Veri Yedekleme</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Tüm gelir-gider, borç, fatura ve yatırım verilerinizi tek bir JSON dosyası olarak cihazınıza indirebilirsiniz.
        </p>

        {msg && (
          <div
            className={`mt-4 rounded-lg p-3 text-sm ${
              msg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {loading ? 'İndiriliyor...' : '📥 Tüm Verileri İndir (JSON)'}
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}