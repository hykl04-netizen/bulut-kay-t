'use client';

import Link from 'next/link';
import { Landmark, Wallet, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

/**
 * Yatay kaydırılan hesap kartları — bankacılık uygulamalarındaki kart
 * şeridinin karşılığı.
 *
 * Neden dikey liste değil: hesap sayısı genelde 2–5. Yatay şerit bunları
 * tek bakışta veriyor ve panelin dikey alanını yemiyor; altındaki hareket
 * listesi ekranın asıl içeriği olarak kalıyor.
 */

export interface AccountCard {
  id: string;
  name: string;
  bankName?: string | null;
  balance: number;
  currency?: string;
  kind?: 'banka' | 'kasa';
}

export function AccountStrip({
  accounts,
  addHref = '/banka-hesaplari',
}: {
  accounts: AccountCard[];
  addHref?: string;
}) {
  return (
    <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
      {accounts.map((a) => {
        const Icon = a.kind === 'kasa' ? Wallet : Landmark;
        return (
          <Link
            key={a.id}
            href={`${addHref}#${a.id}`}
            className="group w-[12.5rem] shrink-0 snap-start sm:w-[15rem] rounded-xl border border-border bg-card p-4 transition hover:border-accent/40"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <Icon aria-hidden className="h-4 w-4 text-accent" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                {a.bankName && (
                  <p className="truncate text-xs text-muted-foreground">{a.bankName}</p>
                )}
              </div>
            </div>
            <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">
              {formatCurrency(a.balance, a.currency ?? 'TRY')}
            </p>
          </Link>
        );
      })}

      <Link
        href={addHref}
        className="flex w-[7.5rem] shrink-0 snap-start sm:w-[9rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border p-4 text-muted-foreground transition hover:border-accent/40 hover:text-foreground"
      >
        <Plus aria-hidden className="h-5 w-5" />
        <span className="text-xs font-medium">Hesap ekle</span>
      </Link>
    </div>
  );
}
