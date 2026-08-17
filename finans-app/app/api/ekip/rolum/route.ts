import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { TeamRole } from '@/lib/team';

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

  const { data: accountId, error: accountErr } = await supabase.rpc('get_account_id_for_user', {
    p_user_id: user.id,
  });
  if (accountErr || !accountId) {
    return NextResponse.json({ error: 'Hesap bilgisi alınamadı.' }, { status: 500 });
  }

  let role: TeamRole = 'sahip';
  if (accountId !== user.id) {
    const { data: memberRow } = await supabase
      .from('team_members')
      .select('role')
      .eq('account_id', accountId)
      .eq('member_user_id', user.id)
      .eq('status', 'aktif')
      .maybeSingle();
    role = (memberRow?.role as TeamRole) ?? 'salt_gorunum';
  }

  return NextResponse.json({
    accountId,
    role,
    isOwner: accountId === user.id,
  });
}
