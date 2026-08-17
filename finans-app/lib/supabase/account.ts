import { getCurrentWorkspaceId } from './workspace';

/**
 * @deprecated Yerine doğrudan `getCurrentWorkspaceId` (bkz.
 * `lib/supabase/workspace.ts`) kullanılması önerilir. Bu fonksiyon, Faz 1
 * (çoklu şirket/workspace altyapısı) eklenirken var olan ~15 çağrı noktasını
 * (sayfalar + layout'taki tekrarlayan-işlem otomasyonu) tek tek değiştirmeden
 * bozmamak için burada bırakıldı — artık tek bir "hesap" değil, kullanıcının
 * o an SEÇİLİ workspace'ini (birden fazla işletmesi olabilir) döner. Yeni
 * kod doğrudan `getCurrentWorkspaceId` çağırmalı.
 */
export async function getCurrentAccountId(userId: string): Promise<string> {
  return getCurrentWorkspaceId(userId);
}
