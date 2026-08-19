'use client';

// Basit, provider'sız global toast sistemi. `toast.success/error/info(...)`
// herhangi bir yerden (event listener'lar dahil) çağrılabilir; <Toaster />
// bileşeni tek bir yerde (kök layout) render edilip güncellemeleri dinler.

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
let listeners: Listener[] = [];
let counter = 0;

function emit() {
  listeners.forEach((listener) => listener(items));
}

function dismiss(id: number) {
  items = items.filter((item) => item.id !== id);
  emit();
}

function show(type: ToastType, message: string, durationMs = 5000) {
  const id = ++counter;
  items = [...items, { id, type, message }];
  emit();
  if (durationMs > 0) {
    setTimeout(() => dismiss(id), durationMs);
  }
  return id;
}

export const toast = {
  success: (message: string) => show('success', message),
  error: (message: string) => show('error', message, 7000),
  info: (message: string) => show('info', message),
  dismiss,
};

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const STYLES: Record<ToastType, string> = {
  success:
    'border-l-emerald-500 [&_.toast-icon]:text-emerald-500',
  error:
    'border-l-rose-500 [&_.toast-icon]:text-rose-500',
  info:
    'border-l-brand-gold [&_.toast-icon]:text-brand-gold',
};

export function Toaster() {
  const [visible, setVisible] = useState<ToastItem[]>(items);

  useEffect(() => {
    listeners.push(setVisible);
    return () => {
      listeners = listeners.filter((listener) => listener !== setVisible);
    };
  }, []);

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      role="region"
      aria-live="polite"
    >
      {visible.map((item) => {
        const Icon = ICONS[item.type];
        return (
          <div
            key={item.id}
            className={`animate-in slide-in-from-bottom-2 fade-in flex items-start gap-3 rounded-xl border border-border/80 border-l-4 bg-card p-4 text-sm shadow-lg dark:border-border ${STYLES[item.type]}`}
          >
            <Icon className="toast-icon h-5 w-5 shrink-0 mt-0.5" />
            <p className="flex-1 text-foreground leading-snug">{item.message}</p>
            <button
              onClick={() => dismiss(item.id)}
              aria-label="Bildirimi kapat"
              className="shrink-0 text-muted-foreground hover:text-foreground dark:hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
