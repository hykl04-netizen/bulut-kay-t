'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { reportError } from '@/lib/error-reporting';

/**
 * Öneri 9 — sayfa seviyesi hata sınırı.
 *
 * Daha önce hiç hata sayfası yoktu; beklenmedik bir hatada kullanıcı boş ekran
 * görüyordu ve sizin haberiniz olmuyordu. Artık anlaşılır bir ekran gösteriliyor
 * ve hata `lib/error-reporting.ts` üzerinden raporlanıyor.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { source: 'sayfa', digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/40">
          <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-foreground">Bir şeyler ters gitti</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bu sayfa yüklenirken beklenmedik bir hata oluştu. Verilerinizde bir kayıp yok.
        </p>
        {error.digest && (
          <p className="mt-3 text-xs text-muted-foreground">
            Destek için hata kodu: <code className="rounded bg-muted px-1.5 py-0.5">{error.digest}</code>
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={reset}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-secondary"
          >
            <RotateCw className="h-4 w-4" />
            Tekrar dene
          </button>
          <Link
            href="/"
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm text-foreground hover:bg-muted"
          >
            Panele dön
          </Link>
        </div>
      </div>
    </div>
  );
}
