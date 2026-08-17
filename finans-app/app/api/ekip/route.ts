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

/** Çağıran kullanıcının kimliğini ve (varsa) hesap sahibi/yönetici yetkisini doğrular. */
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
  if (roleErr) {
    return { error: NextResponse.json({ error: 'Yetki kontrolü başarısız.' }, { status: 500 }) } as const;
  }
  if (!canManage) {
    return {
      error: NextResponse.json(
        { error: 'Ekip üyelerini yönetmek için sahip veya yönetici rolüne sahip olmanız gerekiyor.' },
        { status: 403 }
      ),
    } as const;
  }

  return { supabase, user, accountId: accountId as string } as const;
}

// Hesabın ekip üyelerini listeler (davet bekleyenler dahil).
export async function GET() {
  if (EKIP_DISABLED) {
    return NextResponse.json({ error: 'Ekip yönetimi bu hesapta kapalı.' }, { status: 403 });
  }
  const result = await requireTeamManager();
  if ('error' in result) return result.error;
  const { supabase, accountId } = result;

  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('workspace_id', accountId)
    .order('invited_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Ekip listesi alınamadı.' }, { status: 500 });
  }

  return NextResponse.json({ members: data ?? [] });
}

// Yeni bir ekip üyesi davet eder.
export async function POST(request: NextRequest) {
  if (EKIP_DISABLED) {
    return NextResponse.json({ error: 'Ekip yönetimi bu hesapta kapalı.' }, { status: 403 });
  }
  const result = await requireTeamManager();
  if ('error' in result) return result.error;
  const { supabase, user, accountId } = result;

  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const role = body.role as InvitableRole | undefined;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin.' }, { status: 400 });
  }
  if (!role || !INVITABLE_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Geçersiz rol.' }, { status: 400 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Davet özelliği yapılandırılmamış: sunucuda SUPABASE_SERVICE_ROLE_KEY eksik.' },
      { status: 500 }
    );
  }

  // Aynı hesaba aynı e-posta için zaten bekleyen/aktif bir kayıt var mı?
  const { data: existingRow } = await supabase
    .from('team_members')
    .select('id, status')
    .eq('workspace_id', accountId)
    .eq('invited_email', email)
    .maybeSingle();

  if (existingRow?.status === 'aktif') {
    return NextResponse.json({ error: 'Bu kişi zaten ekipte aktif bir üye.' }, { status: 409 });
  }

  // Kullanıcı zaten Supabase'de kayıtlı mı diye kontrol et (varsa doğrudan
  // aktif üye olarak ekleyeceğiz; inviteUserByEmail zaten-kayıtlı bir
  // e-posta için hata döner).
  let existingAuthUserId: string | null = null;
  try {
    const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    existingAuthUserId = listData?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
  } catch {
    // listUsers başarısız olursa davet akışına normal şekilde devam ediyoruz.
  }

  if (!existingAuthUserId) {
    const redirectTo = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/sifre-guncelle`
      : undefined;
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (inviteErr && !inviteErr.message?.toLowerCase().includes('already')) {
      return NextResponse.json({ error: `Davet e-postası gönderilemedi: ${inviteErr.message}` }, { status: 502 });
    }
  }

  const { data: upserted, error: upsertErr } = await admin
    .from('team_members')
    .upsert(
      {
        workspace_id: accountId,
        member_user_id: existingAuthUserId,
        invited_email: email,
        role,
        status: existingAuthUserId ? 'aktif' : 'beklemede',
        invited_by: user.id,
        joined_at: existingAuthUserId ? new Date().toISOString() : null,
      },
      { onConflict: 'workspace_id,invited_email' }
    )
    .select()
    .single();

  if (upsertErr) {
    return NextResponse.json({ error: 'Ekip üyesi kaydedilemedi.' }, { status: 500 });
  }

  return NextResponse.json({ member: upserted }, { status: 201 });
}
