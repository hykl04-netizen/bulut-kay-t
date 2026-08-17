'use client';

import { useEffect, useState } from 'react';
import { Briefcase, ArrowRight, Loader2 } from 'lucide-react';
import {
  getUserWorkspaces,
  getCurrentWorkspaceId,
  setCurrentWorkspaceId,
  type WorkspaceSummary,
} from '@/lib/supabase/workspace';
import { supabase } from '@/lib/supabase/client';
import { ROLE_LABELS } from '@/lib/team';

/**
 * Faz 6 — muhasebecinin "müşterilerim" görünümü.
 *
 * Bir mali müşavir birden fazla işletmeye ekip üyesi olarak davet edilmiş
 * olabilir. Sol menüdeki işletme seçici zaten geçiş yapmayı sağlıyor; bu sayfa
 * ona toplu bir bakış ve tek tıkla geçiş sunuyor.
 *
 * Sahip olduğu kendi işletmesi bilinçli olarak ayrı gösteriliyor — muhasebeci
 * kendi şirketini de FinansApp'te tutuyor olabilir.
 */
export default function MusterilerimPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }
      const [list, current] = await Promise.all([getUserWorkspaces(), getCurrentWorkspaceId(user.id)]);
      if (cancelled) return;
      setWorkspaces(list);
      setCurrentId(current);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const switchTo = (workspaceId: string) => {
    if (workspaceId === currentId) return;
    setCurrentWorkspaceId(workspaceId);
    // Tam sayfa yenilemesi gerekiyor: sayfalar workspace id'sini mount'ta bir
    // kez okuyor, ayrıca layout'taki rol ve abonelik hook'ları istemci tarafı
    // gezinmede yeniden çalışmıyor (WorkspaceSwitcher ile aynı gerekçe).
    window.location.reload();
  };

  const clients = workspaces.filter((w) => !w.isOwner);
  const own = workspaces.filter((w) => w.isOwner);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Briefcase className="h-7 w-7 text-brand-gold" />
        <h1 className="text-3xl font-bold text-foreground">Müşterilerim</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Erişiminiz olan işletmeler. Birine geçtiğinizde tüm sayfalar o işletmenin verilerini gösterir.
      </p>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="font-medium text-foreground">Henüz başka bir işletmeye davet edilmediniz.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Bir müşteriniz sizi muhasebeci olarak eklediğinde işletmesi burada görünür.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Müşteri işletmeleri
          </h2>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {clients.map((w) => (
              <li key={w.workspaceId}>
                <button
                  onClick={() => switchTo(w.workspaceId)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{w.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{ROLE_LABELS[w.role]}</p>
                  </div>
                  {w.workspaceId === currentId ? (
                    <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-white">
                      Aktif
                    </span>
                  ) : (
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {own.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Kendi işletmeleriniz
          </h2>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {own.map((w) => (
              <li key={w.workspaceId}>
                <button
                  onClick={() => switchTo(w.workspaceId)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition"
                >
                  <p className="truncate font-medium text-foreground">{w.name}</p>
                  {w.workspaceId === currentId ? (
                    <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-white">
                      Aktif
                    </span>
                  ) : (
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
