'use client';

import { useEffect, useState } from 'react';
import type { TeamRole } from '@/lib/team';

interface TeamRoleState {
  role: TeamRole | null;
  accountId: string | null;
  isOwner: boolean;
  loading: boolean;
}

/**
 * Oturum açan kullanıcının bağlı olduğu hesabı ve o hesaptaki rolünü döner
 * (`/api/ekip/rolum` route'unu çağırır). Yüklenirken role=null döner —
 * bu sırada yetki gerektiren butonları GÖSTERMEK (varsayılan olarak tam
 * yetkili gibi davranmak) yerine gizli tutmak daha güvenlidir; sayfalar
 * `loading` durumunu kontrol ederek buna göre davranmalı.
 */
export function useTeamRole(): TeamRoleState {
  const [state, setState] = useState<TeamRoleState>({
    role: null,
    accountId: null,
    isOwner: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ekip/rolum');
        if (!res.ok) throw new Error('rol alınamadı');
        const data = await res.json();
        if (cancelled) return;
        setState({ role: data.role, accountId: data.accountId, isOwner: data.isOwner, loading: false });
      } catch {
        if (cancelled) return;
        // Hata durumunda en kısıtlı role düş — sahip/yönetici gerektiren
        // hiçbir arayüz yanlışlıkla gösterilmesin.
        setState({ role: 'salt_gorunum', accountId: null, isOwner: false, loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
