import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { INVITABLE_ROLES, type InvitableRole } from '@/lib/team';

export const runtime = 'nodejs';

// Tek kullanıcılı hesaplar için ekip yönetimi kapatıldı (bkz. app/(dashboard)/ekip/page.tsx).
// Kod silinmedi, ileride açılabilir.
const EKIP_DISABLED = true;

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

async function requireTeamManager() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 }) } as const;
  }

  const { data: accountId, error: accountErr } = await supabase.rpc('get_account_id_for_user', {
    p_user_id: user.id,
  });
  if (accountErr || !accountId) {
    return { error: NextResponse.json({ error: 'Hesap bilgisi alınamadı.' }, { status: 500 }) } as const;
  }

  const { data: canManage, error: roleErr } = await supabase.rpc('has_account_role', {
    p_account_id: accountId,
    p_allowed_roles: ['yonetici'],
  });
  if (roleErr || !canManage) {
    return {
      error: NextResponse.json(
        { error: 'Ekip üyelerini yönetmek için sahip veya yönetici rolüne sahip olmanız gerekiyor.' },
        { status: 403 }
      ),
    } as const;
  }

  return { user, accountId: accountId as string } as const;
}

// Bir ekip üyesinin rolünü değiştirir.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (EKIP_DISABLED) {
    return NextResponse.json({ error: 'Ekip yönetimi bu hesapta kapalı.' }, { status: 403 });
  }
  const result = await requireTeamManager();
  if ('error' in result) return result.error;
  const { accountId } = result;
  const { id } = await params;

  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 });
  }

  const role = body.role as InvitableRole | undefined;
  if (!role || !INVITABLE_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Geçersiz rol.' }, { status: 400 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Sunucuda SUPABASE_SERVICE_ROLE_KEY eksik.' }, { status: 500 });
  }

  const { data: updated, error } = await admin
    .from('team_members')
    .update({ role })
    .eq('id', id)
    .eq('workspace_id', accountId) // başka workspace'in üyesini asla güncelleyemesin
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: 'Üye bulunamadı veya güncellenemedi.' }, { status: 404 });
  }

  return NextResponse.json({ member: updated });
}

// Bir ekip üyesini hesaptan çıkarır (erişimi anında kesilir — RLS,
// team_members satırı silindiği an artık has_account_role false döner).
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (EKIP_DISABLED) {
    return NextResponse.json({ error: 'Ekip yönetimi bu hesapta kapalı.' }, { status: 403 });
  }
  const result = await requireTeamManager();
  if ('error' in result) return result.error;
  const { accountId } = result;
  const { id } = await params;

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Sunucuda SUPABASE_SERVICE_ROLE_KEY eksik.' }, { status: 500 });
  }

  const { error } = await admin.from('team_members').delete().eq('id', id).eq('workspace_id', accountId);

  if (error) {
    return NextResponse.json({ error: 'Üye çıkarılamadı.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
