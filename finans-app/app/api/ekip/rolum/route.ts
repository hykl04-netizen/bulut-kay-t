import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { TeamRole } from '@/lib/team';
import { getSelectedWorkspaceId } from '@/lib/supabase/workspace-server';

export const runtime = 'nodejs';

// Oturum açan kullanıcının bağlı olduğu hesabı ve o hesaptaki rolünü döner.
// Hesap sahibiyse role = 'sahip'. 2. yarıdaki arayüz, bu bilgiye göre
// düzenleme/silme butonlarını ve "Ekip" sayfasına erişimi gizler/gösterir.
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  }

  const workspaceId = await getSelectedWorkspaceId(supabase, user.id);
  if (!workspaceId) {
    return NextResponse.json({ error: 'İşletme bilgisi alınamadı.' }, { status: 500 });
  }

  // Sahiplik artık workspaces.owner_id üzerinden belirleniyor — Faz 1'den
  // sonra bir workspace'in id'si sahibinin auth id'sine eşit olmak zorunda
  // değil (create_workspace() rastgele id üretir).
  const { data: ownerRow } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .maybeSingle();
  const isOwner = (ownerRow as { owner_id: string } | null)?.owner_id === user.id;

  let role: TeamRole = 'sahip';
  if (!isOwner) {
    const { data: memberRow } = await supabase
      .from('team_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('member_user_id', user.id)
      .eq('status', 'aktif')
      .maybeSingle();
    role = (memberRow?.role as TeamRole) ?? 'salt_gorunum';
  }

  return NextResponse.json({
    workspaceId,
    role,
    isOwner,
  });
}
