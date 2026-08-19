import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

/** Öneri 9 — 404 sayfası. Önceden Next.js'in sade varsayılanı görünüyordu. */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-foreground">Sayfa bulunamadı</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/"
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Panele dön
          </Link>
          <Link
            href="/yardim"
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm text-foreground hover:bg-muted"
          >
            Yardım merkezi
          </Link>
        </div>
      </div>
    </div>
  );
}
