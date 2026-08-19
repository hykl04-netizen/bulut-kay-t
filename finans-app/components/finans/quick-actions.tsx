'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

/**
 * Hero'nun altındaki yuvarlak hızlı işlem düğmeleri.
 *
 * Bankacılık uygulamalarının açılış ekranındaki "para gönder / QR / FAST"
 * şeridinin karşılığı. Amaç: en sık yapılan 4 işlemi menüde aramaya gerek
 * kalmadan tek dokunuşa indirmek. Dörtten fazlası bu deseni bozar —
 * beşinci bir eylem eklemek isteniyorsa biri çıkmalı.
 */

export interface QuickAction {
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  /** Vurgulu (birincil) eylem — en fazla biri. */
  primary?: boolean;
}

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:max-w-lg">
      {actions.slice(0, 4).map((a) => {
        const Icon = a.icon;
        const circle = a.primary
          ? 'bg-primary text-primary-foreground'
          : 'bg-accent/10 text-accent';

        const inner = (
          <>
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full transition group-hover:scale-105 ${circle}`}
            >
              <Icon aria-hidden className="h-5 w-5" />
            </span>
            <span className="text-center text-[11px] font-medium leading-tight text-muted-foreground">
              {a.label}
            </span>
          </>
        );

        const shell =
          'group flex flex-col items-center gap-1.5 rounded-xl p-1.5 transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

        return a.href ? (
          <Link key={a.label} href={a.href} className={shell}>
            {inner}
          </Link>
        ) : (
          <button key={a.label} type="button" onClick={a.onClick} className={shell}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}
