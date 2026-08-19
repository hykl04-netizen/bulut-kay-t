'use client';

// window.confirm() yerine Promise tabanlı, tema uyumlu bir onay modalı.
// Kullanım: `if (!(await confirmDialog('Emin misiniz?'))) return;`
// Var olan `if (!confirm('...')) return;` deseniyle bire bir aynı akışı korur,
// tek fark `await` eklenmesi.

import { useEffect, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** true ise kırmızı/tehlike vurgusu (silme gibi geri alınamaz işlemler) kullanılır. */
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

let setStateRef: ((state: ConfirmState | null) => void) | null = null;

export function confirmDialog(options: ConfirmOptions | string): Promise<boolean> {
  const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
  return new Promise((resolve) => {
    if (!setStateRef) {
      // Host henüz mount olmadıysa güvenli tarafta kal: sessizce reddet.
      resolve(false);
      return;
    }
    setStateRef({ ...opts, resolve });
  });
}

export function ConfirmDialogHost() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const close = (result: boolean) => {
    state?.resolve(result);
    setState(null);
  };

  useEffect(() => {
    setStateRef = setState;
    return () => {
      setStateRef = null;
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!state) return null;

  const Icon = state.danger ? AlertTriangle : HelpCircle;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-primary/50 dark:bg-black/60 backdrop-blur-sm p-4"
      onClick={() => close(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div
            className={`rounded-full p-2 ${
              state.danger
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                : 'bg-accent/15 text-brand-gold'
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-foreground dark:text-white">
            {state.title ?? 'Emin misiniz?'}
          </h3>
        </div>

        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          {state.message}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => close(false)}
            className="rounded-xl px-4 py-2 text-sm text-muted-foreground hover:bg-secondary transition"
          >
            {state.cancelLabel ?? 'Vazgeç'}
          </button>
          <button
            onClick={() => close(true)}
            autoFocus
            className={`btn-gold-cta rounded-xl px-4 py-2 text-sm font-medium text-primary-foreground transition ${ state.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary hover:opacity-90 ' }`}
          >
            {state.confirmLabel ?? 'Onayla'}
          </button>
        </div>
      </div>
    </div>
  );
}
