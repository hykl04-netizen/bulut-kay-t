'use client';

import { useEffect, useState } from 'react';
import { ChevronsUpDown, Check, Plus, Building2 } from 'lucide-react';
import {
  getUserWorkspaces,
  getCurrentWorkspaceId,
  setCurrentWorkspaceId,
  createWorkspace,
  type WorkspaceSummary,
} from '@/lib/supabase/workspace';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/components/ui/toaster';

/**
 * Sol menünün üstünde gösterilen işletme (workspace) seçici. Kullanıcının
 * erişebildiği tüm workspace'leri listeler, aralarında geçiş yapmayı ve
 * "Yeni İşletme Ekle" ile ikinci/üçüncü bir workspace oluşturmayı sağlar
 * (bkz. supabase/migrations/20260817_workspaces.sql).
 *
 * Kullanıcının tek workspace'i varsa (henüz kimse ikinci bir işletme
 * eklemediyse) sadece adını, tıklanamaz şekilde gösterir — gereksiz bir
 * seçici karmaşası eklemez.
 */
export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

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
    // state'te tuttuğundan (bkz. lib/supabase/account.ts notu), en güvenli
    // yenileme yöntemi tam sayfa reload — router.refresh() client-side
    // state'i temizlemez.
    window.location.reload();
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await createWorkspace(name);
      toast.success(`"${name}" işletmesi oluşturuldu.`);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'İşletme oluşturulamadı.');
      setCreating(false);
    }
  };

  if (loading || workspaces.length === 0) return null;

  const current = workspaces.find((w) => w.workspaceId === currentId) ?? workspaces[0];
  const canSwitch = workspaces.length > 1;

  return (
    <div className="relative px-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-border/70 bg-background px-2.5 py-2 text-left text-sm hover:bg-muted transition"
      >
        <Building2 className="w-4 h-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate font-medium">{current.name}</span>
        <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 z-50 mt-1.5 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            {canSwitch && (
              <div className="max-h-64 overflow-y-auto py-1">
                {workspaces.map((w) => (
                  <button
                    key={w.workspaceId}
                    onClick={() => handleSelect(w.workspaceId)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition"
                  >
                    <span className="flex-1 truncate">{w.name}</span>
                    {w.workspaceId === current.workspaceId && (
                      <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className={`p-2 space-y-1.5 ${canSwitch ? 'border-t border-border' : ''}`}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
                placeholder="Yeni işletme adı"
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1.5 text-sm font-medium text-accent hover:bg-accent/20 transition disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {creating ? 'Oluşturuluyor...' : 'Yeni İşletme Ekle'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
