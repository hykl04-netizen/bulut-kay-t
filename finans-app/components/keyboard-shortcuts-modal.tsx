'use client';

import { X, Keyboard } from 'lucide-react';

interface ShortcutRow {
  keys: string[];
  description: string;
}

const GLOBAL_SHORTCUTS: ShortcutRow[] = [
  { keys: ['?'], description: 'Bu kısayol listesini aç/kapat' },
  { keys: ['Esc'], description: 'Açık modalı / paneli kapat' },
];

const PAGE_SHORTCUTS: ShortcutRow[] = [
  { keys: ['N'], description: 'Yeni kayıt ekle (Gelir/Gider, Fatura/Masraf gibi liste sayfalarında)' },
  { keys: ['/'], description: 'Arama kutusuna odaklan' },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground shadow-sm dark:border-border dark:bg-secondary dark:text-slate-100">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl dark:bg-primary dark:text-slate-100">
        <div className="flex items-center justify-between border-b border-border pb-4 dark:border-border">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Keyboard className="h-5 w-5" />
            Klavye Kısayolları
          </h2>
          <button onClick={onClose} aria-label="Kapat" className="text-muted-foreground hover:text-foreground dark:hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">Genel</p>
            <ul className="space-y-2">
              {GLOBAL_SHORTCUTS.map((row) => (
                <li key={row.description} className="flex items-center justify-between gap-4">
                  <span className="text-foreground dark:text-muted-foreground">{row.description}</span>
                  <span className="flex gap-1">
                    {row.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">Liste Sayfaları</p>
            <ul className="space-y-2">
              {PAGE_SHORTCUTS.map((row) => (
                <li key={row.description} className="flex items-start justify-between gap-4">
                  <span className="text-foreground dark:text-muted-foreground">{row.description}</span>
                  <span className="flex shrink-0 gap-1 pt-0.5">
                    {row.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground dark:text-muted-foreground">
            Not: Bir metin kutusuna yazarken kısayollar devre dışı kalır (Esc hariç).
          </p>
        </div>
      </div>
    </div>
  );
}
