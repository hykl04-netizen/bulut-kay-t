'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentWorkspaceId, getWorkspaceType } from '@/lib/supabase/workspace';
import type { WorkspaceType } from '@/lib/workspace-types';

/**
 * Seçili hesabın tipini döner (aile / sirket / musavir_ofisi).
 *
 * NEDEN AYRI BİR HOOK: hesap tipi menüyü zaten şekillendiriyordu, ama
 * SAYFA İÇİ metinler hep işletme diliyle yazılıydı — aile hesabına geçen
 * kullanıcı, üst çubukta "Hesap Ayarları" yazarken sayfanın içinde
 * "Şirket Ayarları" görüyordu. Metni doğru seçebilmek için her sayfanın
 * tipi bilmesi gerekiyor.
 *
 * Sonuç modül düzeyinde önbelleğe alınır: her sayfa geçişinde iki ek
 * sorgu (workspace listesi + tip) atmak, tıklamayla açılan ekranı
 * gözle görülür şekilde geciktiriyordu. Hesap değiştirme zaten tam sayfa
 * yenilemesi yapıyor (bkz. WorkspaceSwitcher), o yüzden önbellek bayat
 * kalmaz.
 */

let cached: WorkspaceType | null = null;
let inflight: Promise<WorkspaceType> | null = null;

async function load(): Promise<WorkspaceType> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return 'sirket';
      const wsId = await getCurrentWorkspaceId(user.id);
      const type = await getWorkspaceType(wsId);
      cached = type;
      return type;
    } catch {
      return 'sirket';
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Hesap tipi değiştiğinde önbelleği düşür (ayarlar ekranı çağırır). */
export function resetWorkspaceTypeCache() {
  cached = null;
}

export function useWorkspaceType(): { type: WorkspaceType; loading: boolean } {
  const [type, setType] = useState<WorkspaceType>(cached ?? 'sirket');
  const [loading, setLoading] = useState(cached === null);

  useEffect(() => {
    let cancelled = false;
    load().then((t) => {
      if (cancelled) return;
      setType(t);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { type, loading };
}
