import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { TeamRole } from '@/lib/team';

export const runtime = 'nodejs';

const CURRENT_WORKSPACE_COOKIE = 'finansapp_workspace_id';

/**
 * Oturum açan kullanıcının seçili hesabını ve o hesaptaki rolünü döner.
 *
 * NEDEN YENİDEN YAZILDI: eski sürüm hesabı `get_account_id_for_user()` ile
 * buluyordu; o fonksiyon hiçbir şey bulamayınca KULLANICI ID'sini geri
 * veriyordu — "workspace id = kullanıcı id" varsayımı Faz 1 öncesinden
 * kalmaydı ve artık yanlış. Yeni açılan her hesapta workspace id rastgele
 * olduğu için bu dallanma "sahip değil" sonucunu üretiyor, oradan da
 * team_members'ta kayıt bulunamayınca role 'salt_gorunum'a düşüyordu.
 * Sonuç: her yeni kullanıcı kendi hesabında salt görüntüleme oluyor ve
 * ekleme düğmeleri sessizce çalışmıyordu.
 *
 * Artık rol, istemcinin de kullandığı TEK kaynaktan geliyor:
 * `get_user_workspaces()`. Sahip için zaten 'sahip' döndürüyor. Böylece
 * sunucu ile istemci farklı sonuçlara varamaz.
 *
 * Seçim sırası istemcideki `getCurrentWorkspaceId` ile birebir aynı:
 * geçerliyse cookie, yoksa sahip olunan ilk hesap, o da yoksa erişilen
 * herhangi biri.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  }

  const { data, error } = await supabase.rpc('get_user_workspaces');
  if (error) {
    return NextResponse.json({ error: 'Hesap bilgisi alınamadı.' }, { status: 500 });
  }

  const rows = (data ?? []) as {
    workspace_id: string;
    role: string;
    is_owner: boolean;
  }[];

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Erişebildiğiniz bir hesap yok.' }, { status: 404 });
  }

  const cookieStore = await cookies();
  const secilen = cookieStore.get(CURRENT_WORKSPACE_COOKIE)?.value;

  const hedef =
    rows.find((r) => r.workspace_id === secilen) ?? rows.find((r) => r.is_owner) ?? rows[0];

  return NextResponse.json({
    workspaceId: hedef.workspace_id,
    role: hedef.role as TeamRole,
    isOwner: hedef.is_owner,
  });
}
