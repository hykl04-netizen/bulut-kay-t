'use client';

import { useEffect, useState } from 'react';
import { Briefcase, ArrowRight } from 'lucide-react';
import {
  getUserWorkspaces,
  getCurrentWorkspaceId,
  setCurrentWorkspaceId,
  type WorkspaceSummary,
} from '@/lib/supabase/workspace';
import { supabase } from '@/lib/supabase/client';
import { ROLE_LABELS } from '@/lib/team';
import { PageLoading } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

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
      <PageLoading />
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        icon={Briefcase}
        title="Müşterilerim"
        description="Erişiminiz olan işletmeler. Birine geçtiğinizde tüm sayfalar o işletmenin verilerini gösterir."
      />

      {clients.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Henüz başka bir işletmeye davet edilmediniz."
          description="Bir müşteriniz sizi muhasebeci olarak eklediğinde işletmesi burada görünür."
        />
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
                    <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground">
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
                    <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground">
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
