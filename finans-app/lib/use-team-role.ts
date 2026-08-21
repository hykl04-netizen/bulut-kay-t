'use client';

import { useEffect, useState } from 'react';
import type { TeamRole } from '@/lib/team';

interface TeamRoleState {
  role: TeamRole | null;
  workspaceId: string | null;
  isOwner: boolean;
  loading: boolean;
  /**
   * Rol SORGULANAMADI mı? Güvenli varsayılan hâlâ 'salt_gorunum' — ama
   * bunu sessizce yapmak, hesabın sahibine hiçbir açıklama olmadan
   * "Salt Görüntüleme" rozeti gösterip bütün ekleme düğmelerini
   * kilitliyordu. Arayüz bu bayrağa bakıp "yetki doğrulanamadı" diyebilsin.
   */
  hata: boolean;
}

/**
 * Oturum açan kullanıcının SEÇİLİ işletmesini ve o işletmedeki rolünü döner
 * (`/api/ekip/rolum` route'unu çağırır). Yüklenirken role=null döner —
 * bu sırada yetki gerektiren butonları GÖSTERMEK (varsayılan olarak tam
 * yetkili gibi davranmak) yerine gizli tutmak daha güvenlidir; sayfalar
 * `loading` durumunu kontrol ederek buna göre davranmalı.
 */
export function useTeamRole(): TeamRoleState {
  const [state, setState] = useState<TeamRoleState>({
    role: null,
    workspaceId: null,
    isOwner: false,
    loading: true,
    hata: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ekip/rolum');
        if (!res.ok) throw new Error('rol alınamadı');
        const data = await res.json();
        if (cancelled) return;
        setState({
          role: data.role,
          workspaceId: data.workspaceId,
          isOwner: data.isOwner,
          loading: false,
          hata: false,
        });
      } catch {
        if (cancelled) return;
        // Hata durumunda en kısıtlı role düş — sahip/yönetici gerektiren
        // hiçbir arayüz yanlışlıkla gösterilmesin.
        setState({ role: 'salt_gorunum', workspaceId: null, isOwner: false, loading: false, hata: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
