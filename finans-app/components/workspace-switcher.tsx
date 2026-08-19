'use client';

import { useEffect, useState } from 'react';
import { ChevronsUpDown, Check, Plus, Building2, Home, Calculator, Briefcase } from 'lucide-react';
import {
  getUserWorkspaces,
  getCurrentWorkspaceId,
  setCurrentWorkspaceId,
  createWorkspace,
  type WorkspaceSummary,
} from '@/lib/supabase/workspace';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/components/ui/toaster';
import { WORKSPACE_TYPE_OPTIONS, type WorkspaceType } from '@/lib/workspace-types';

/**
 * Sol menünün üstünde gösterilen hesap (workspace) seçici. Kullanıcının
 * erişebildiği tüm hesapları listeler, aralarında geçiş yapmayı ve yeni bir
 * hesap oluşturmayı sağlar (bkz. supabase/migrations/20260817_workspaces.sql).
 *
 * Faz 11 — liste artık TİPE GÖRE GRUPLU. Aynı kişi hem ailesinin bütçesini
 * hem şirketinin defterini tutabildiği için "şu an hangi hesaptayım?"
 * sorusunun bir bakışta cevaplanması gerekiyor: her tipin kendi ikonu ve
 * başlığı var, aktif hesap üstteki düğmede de aynı ikonla gösteriliyor.
 * Veri izolasyonu zaten RLS ile garanti — buradaki ayrım tamamen kullanıcının
 * yanlış hesaba kayıt girmesini önlemek için.
 */

const TYPE_ICONS: Record<WorkspaceType, typeof Building2> = {
  aile: Home,
  sirket: Building2,
  musavir_ofisi: Calculator,
};

const OWN_GROUP_TITLES: Record<WorkspaceType, string> = {
  aile: 'Aile / Bireysel',
  sirket: 'İşletmelerim',
  musavir_ofisi: 'Müşavirlik Ofisim',
};

const GROUP_ORDER: WorkspaceType[] = ['aile', 'sirket', 'musavir_ofisi'];

export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<WorkspaceType>('sirket');

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

  const handleSelect = (workspaceId: string) => {
    setOpen(false);
    if (workspaceId === currentId) return;
    setCurrentWorkspaceId(workspaceId);
    // Sayfalar workspace/hesap id'sini component mount'ında bir kez okuyup
    // state'te tuttuğundan (bkz. lib/supabase/workspace.ts notu), en güvenli
    // yenileme yöntemi tam sayfa reload — router.refresh() client-side
    // state'i temizlemez.
    window.location.reload();
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await createWorkspace(name, newType);
      toast.success(`"${name}" hesabı oluşturuldu.`);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Hesap oluşturulamadı.');
      setCreating(false);
    }
  };

  if (loading || workspaces.length === 0) return null;

  const current = workspaces.find((w) => w.workspaceId === currentId) ?? workspaces[0];
  const canSwitch = workspaces.length > 1;
  const CurrentIcon = TYPE_ICONS[current.type] ?? Building2;

  // Sahip olduklarım tipe göre; başkasının hesapları (muhasebeci/ekip üyesi
  // olduklarım) tek bir "Müşteri işletmeleri" başlığı altında — müşavir için
  // asıl uzun liste burası.
  const ownedByType = GROUP_ORDER.map((type) => ({
    type,
    title: OWN_GROUP_TITLES[type],
    icon: TYPE_ICONS[type],
    items: workspaces.filter((w) => w.isOwner && w.type === type),
  })).filter((g) => g.items.length > 0);

  const clientWorkspaces = workspaces.filter((w) => !w.isOwner);

  const renderRow = (w: WorkspaceSummary, Icon: typeof Building2) => (
    <button
      key={w.workspaceId}
      onClick={() => handleSelect(w.workspaceId)}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-muted"
    >
      <Icon aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{w.name}</span>
      {w.workspaceId === current.workspaceId && (
        <Check className="h-3.5 w-3.5 shrink-0 text-accent" />
      )}
    </button>
  );

  return (
    <div className="relative px-3">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg border border-border/70 bg-background px-2.5 py-2 text-left text-sm transition hover:bg-muted"
      >
        <CurrentIcon aria-hidden className="h-4 w-4 shrink-0 text-accent" />
        <span className="flex-1 truncate font-medium">{current.name}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 z-50 mt-1.5 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            {canSwitch && (
              <div className="max-h-72 overflow-y-auto py-1">
                {ownedByType.map((g) => (
                  <div key={g.type}>
                    <p className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {g.title}
                    </p>
                    {g.items.map((w) => renderRow(w, g.icon))}
                  </div>
                ))}

                {clientWorkspaces.length > 0 && (
                  <div className="mt-1 border-t border-border pt-1">
                    <p className="px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Müşteri işletmeleri ({clientWorkspaces.length})
                    </p>
                    {clientWorkspaces.map((w) => renderRow(w, Briefcase))}
                  </div>
                )}
              </div>
            )}

            <div className={`space-y-1.5 p-2 ${canSwitch ? 'border-t border-border' : ''}`}>
              {/* Yeni hesabın TİPİ burada seçilir; sonradan değiştirmek
                  mümkün ama menünün tamamını etkilediği için baştan doğru
                  seçilmesi daha iyi. */}
              <div className="flex gap-1">
                {WORKSPACE_TYPE_OPTIONS.map((opt) => {
                  const Icon = TYPE_ICONS[opt.key];
                  const active = newType === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setNewType(opt.key)}
                      title={opt.label}
                      aria-pressed={active}
                      className={`flex flex-1 items-center justify-center rounded-lg border px-2 py-1.5 transition ${ active ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:bg-muted' }`}
                    >
                      <Icon aria-hidden className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
                placeholder={newType === 'aile' ? 'Örn. Ailem' : 'Yeni hesap adı'}
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1.5 text-sm font-medium text-accent transition hover:bg-accent/20 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {creating ? 'Oluşturuluyor...' : 'Yeni Hesap Ekle'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
