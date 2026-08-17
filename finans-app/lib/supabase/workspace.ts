import { supabase } from './client';
import type { TeamRole } from '@/lib/team';

const CURRENT_WORKSPACE_COOKIE = 'finansapp_workspace_id';
const COOKIE_MAX_AGE_DAYS = 365;

export interface WorkspaceSummary {
  workspaceId: string;
  name: string;
  role: TeamRole;
  isOwner: boolean;
}

/**
 * Oturum açan kullanıcının erişebildiği TÜM workspace'leri (sahip olduğu +
 * ekip üyesi olduğu) döner. RLS'e takılmadan çalışan `get_user_workspaces()`
 * SECURITY DEFINER fonksiyonunu çağırır (bkz.
 * supabase/migrations/20260817_workspaces.sql). Migration henüz
 * çalıştırılmadıysa (fonksiyon yoksa) sessizce boş dizi döner —
 * `getCurrentWorkspaceId` bu durumda eski tek-hesap davranışına düşer.
 */
export async function getUserWorkspaces(): Promise<WorkspaceSummary[]> {
  const { data, error } = await supabase.rpc('get_user_workspaces');
  if (error || !data) return [];
  return (data as Array<{ workspace_id: string; name: string; role: string; is_owner: boolean }>).map(
    (row) => ({
      workspaceId: row.workspace_id,
      name: row.name,
      role: row.role as TeamRole,
      isOwner: row.is_owner,
    })
  );
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

/**
 * Şu an seçili workspace id'sini döner: kullanıcı daha önce bir workspace
 * seçtiyse (tarayıcı cookie'sinde saklı) ve hâlâ erişimi varsa onu, yoksa
 * sahip olduğu ilk workspace'i (yoksa erişebildiği herhangi birini) döner.
 *
 * `userId` parametresi çağrı noktalarındaki mevcut imzayla uyum için
 * korunuyor; RPC `auth.uid()` kullandığından fiilen
 * sorgu için gerekmiyor ama migration/RPC hiç çalışmazsa (henüz
 * uygulanmadıysa) güvenli varsayılan olarak buraya düşülüyor — böylece eski
 * tek-workspace davranışı hiçbir zaman bozulmaz.
 */
export async function getCurrentWorkspaceId(userId: string): Promise<string> {
  const workspaces = await getUserWorkspaces();
  if (workspaces.length === 0) return userId;

  const savedId = readCookie(CURRENT_WORKSPACE_COOKIE);
  if (savedId && workspaces.some((w) => w.workspaceId === savedId)) {
    return savedId;
  }

  const defaultWorkspace = workspaces.find((w) => w.isOwner) ?? workspaces[0];
  return defaultWorkspace.workspaceId;
}

/**
 * Aktif workspace seçimini değiştirir (cookie'ye yazar). Çağıran taraf,
 * sayfaların taze workspace ile yeniden veri çekmesi için genelde ardından
 * tam bir sayfa yenilemesi tetiklemeli (bkz. `WorkspaceSwitcher`) — mevcut
 * sayfalar workspace/hesap id'sini component mount'ında bir kez okuyup
 * state'te tuttuğundan, cookie değişikliğini kendiliğinden fark etmezler.
 */
export function setCurrentWorkspaceId(workspaceId: string) {
  writeCookie(CURRENT_WORKSPACE_COOKIE, workspaceId);
}

/** Yeni bir workspace (işletme) oluşturur ve otomatik olarak aktif seçim yapar. */
export async function createWorkspace(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_workspace', { p_name: name });
  if (error || !data) {
    throw new Error(error?.message ?? 'İşletme oluşturulamadı.');
  }
  const workspaceId = data as string;
  setCurrentWorkspaceId(workspaceId);
  return workspaceId;
}
