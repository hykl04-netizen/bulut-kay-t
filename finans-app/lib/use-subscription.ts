'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase/client';
import { getCurrentWorkspaceId } from './supabase/workspace';
import { getSubscription, type Subscription } from './plans';

/**
 * Seçili workspace'in aboneliğini okuyan paylaşılan hook. Sol menü (kilitli
 * modülleri göstermek için), uyarı şeridi ve /abonelik sayfası bunu kullanır.
 *
 * Abonelik satırı yoksa (migration çalıştırılmadıysa) `subscription` null
 * kalır ve `lib/plans.ts`'teki yardımcılar hiçbir kısıtlama uygulamaz.
 */
export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
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
      const workspaceId = await getCurrentWorkspaceId(user.id);
      if (cancelled) return;
      const sub = await getSubscription(workspaceId);
      if (cancelled) return;
      setSubscription(sub);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { subscription, loading };
}
