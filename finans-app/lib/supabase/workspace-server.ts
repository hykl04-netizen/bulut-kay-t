import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

const CURRENT_WORKSPACE_COOKIE = 'finansapp_workspace_id';

/**
 * Faz 4 — sunucu tarafında "şu an seçili işletme"yi çözer.
 *
 * NEDEN GEREKLİ: `/api/ekip/*` route'ları eskiden `get_account_id_for_user()`
 * çağırıyordu; o fonksiyon kullanıcının üye olduğu ilk workspace'i `limit 1`
 * ile seçer. Tek workspace varken sorun değildi, ama artık bir kullanıcı hem
 * kendi işletmesine sahip olup hem birkaç işletmeye üye olabiliyor — bu
 * durumda route'lar RASTGELE bir işletme üzerinde işlem yapardı.
 *
 * Artık istemcinin seçtiği workspace (WorkspaceSwitcher'ın yazdığı
 * `finansapp_workspace_id` cookie'si) okunuyor ve kullanıcının o workspace'e
 * gerçekten erişimi olduğu `has_account_role` ile DOĞRULANIYOR. Cookie yoksa
 * ya da geçersizse eski davranışa (`get_account_id_for_user`) düşülüyor.
 *
 * Cookie'ye güvenilmediğine dikkat: değeri yalnızca bir ipucu, yetki kararı
 * her zaman sunucudaki role kontrolüyle veriliyor.
 */
export async function getSelectedWorkspaceId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(CURRENT_WORKSPACE_COOKIE)?.value;

  if (cookieValue) {
    const { data: hasAccess } = await supabase.rpc('has_account_role', {
      p_account_id: cookieValue,
      p_allowed_roles: ['yonetici', 'muhasebeci', 'salt_gorunum'],
    });
    if (hasAccess) return cookieValue;
  }

  const { data: fallback } = await supabase.rpc('get_account_id_for_user', {
    p_user_id: userId,
  });
  return (fallback as string | null) ?? null;
}
