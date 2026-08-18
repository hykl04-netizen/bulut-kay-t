'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/error-reporting';

/**
 * Öneri 9 — kök düzen (root layout) çökerse devreye giren son çare.
 *
 * Bu bileşen kendi <html>/<body> etiketlerini render etmek ZORUNDA, çünkü
 * kök düzenin kendisi çalışmadığı durumda gösterilir. Bu yüzden proje
 * bileşenleri/tema değişkenleri yerine satır içi stil kullanılıyor.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { source: 'global', digest: error.digest });
  }, [error]);

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#f8fafc',
          color: '#0f172a',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Uygulama açılamadı</h1>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
            Beklenmedik bir hata oluştu. Verilerinizde bir kayıp yok. Sayfayı yenilemeyi deneyin;
            sorun sürerse destek ekibine yazın.
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12 }}>
              Hata kodu: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              background: '#1b2559',
              color: '#fff',
              border: 0,
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  );
}
