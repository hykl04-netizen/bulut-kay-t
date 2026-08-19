'use client';

import { useEffect, useState } from 'react';
import { Home, Building2, Calculator, Loader2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentWorkspaceId, getWorkspaceType } from '@/lib/supabase/workspace';
import { setWorkspaceType } from '@/lib/onboarding';
import { WORKSPACE_TYPE_OPTIONS, type WorkspaceType } from '@/lib/workspace-types';
import { toast } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Faz 11 — hesap türü değiştirici (Ayarlar sayfasında).
 *
 * Tür, sol menünün tamamını belirler; kurulum sihirbazından geçmiş eski
 * hesapların bunu sonradan değiştirebilmesi gerekiyor (aksi halde mevcut
 * kullanıcılar aile görünümüne hiç ulaşamazdı).
 *
 * "Aile"ye geçiş, hesapta yetkili bir muhasebeci varsa DB tetikleyicisi
 * tarafından reddedilir (KVKK — bkz. 20260826_workspace_types.sql). Buradaki
 * hata mesajı doğrudan o tetikleyiciden gelir; arayüzde ayrıca kontrol
 * etmiyoruz ki tek bir doğruluk kaynağı kalsın.
 */

const ICONS: Record<WorkspaceType, typeof Home> = {
  aile: Home,
  sirket: Building2,
  musavir_ofisi: Calculator,
};

export function WorkspaceTypeCard() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [current, setCurrent] = useState<WorkspaceType>('sirket');
  const [draft, setDraft] = useState<WorkspaceType>('sirket');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const id = await getCurrentWorkspaceId(user.id);
      if (cancelled) return;
      const type = await getWorkspaceType(id);
      if (cancelled) return;
      setWorkspaceId(id);
      setCurrent(type);
      setDraft(type);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (!workspaceId || draft === current) return;
    setSaving(true);
    try {
      await setWorkspaceType(workspaceId, draft);
      toast.success('Hesap türü güncellendi. Menü yenileniyor…');
      // Menü, tipi mount'ta bir kez okuyor — tam yenileme gerekiyor.
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Hesap türü değiştirilemedi.');
      setDraft(current);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Hesap Türü</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sol menüde hangi ekranların görüneceğini belirler. Verileriniz silinmez — yalnızca
          görünürlük değişir.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {WORKSPACE_TYPE_OPTIONS.map((opt) => {
          const Icon = ICONS[opt.key];
          const active = draft === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setDraft(opt.key)}
              aria-pressed={active}
              className={`rounded-xl border p-3 text-left transition ${ active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted' }`}
            >
              <Icon aria-hidden className="h-4 w-4 text-accent" />
              <p className="mt-2 text-sm font-medium text-foreground">{opt.label}</p>
            </button>
          );
        })}
      </div>

      {draft === 'aile' && current !== 'aile' && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Aile hesabında fatura kesme, cari, bordro ve dönem kilitleme ekranları gizlenir. Hesapta
          yetkili bir muhasebeci varsa önce erişimini kaldırmanız gerekir.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving || draft === current}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {draft === current ? 'Kayıtlı' : 'Türü Değiştir'}
        </button>
      </div>
    </div>
  );
}
