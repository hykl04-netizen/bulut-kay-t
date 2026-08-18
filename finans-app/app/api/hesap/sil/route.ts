import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Öneri 8 — KVKK m.11: hesap silme (unutulma hakkı).
 *
 * Gizlilik metninde "talebiniz üzerine silinir" taahhüdü vardı ama bunu yapacak
 * bir mekanizma yoktu. Bu route, kullanıcının KENDİ hesabını silmesini sağlar.
 *
 * NE SİLİNİR: auth kullanıcısı silinince `workspaces.owner_id` üzerindeki
 * ON DELETE CASCADE zinciri devreye girer ve sahip olunan tüm işletmelerin
 * verisi (işlemler, faturalar, cariler, belgeler, abonelik…) birlikte silinir.
 * Kullanıcının BAŞKASININ işletmesindeki ekip üyeliği de kaldırılır.
 *
 * NE SİLİNMEZ: Başkasına ait işletmelerin verisi. Kullanıcı o işletmelerde
 * sadece üyeydi; şirketin muhasebe kaydını silmek ona ait bir hak değil.
 *
 * GÜVENLİK: Yalnızca oturum sahibinin kendi hesabını siler — istekte kullanıcı
 * kimliği ALINMAZ, oturumdan okunur. Ayrıca onay metni doğrulanır.
 */

const CONFIRM_PHRASE = 'HESABIMI SIL';

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  }

  let body: { confirm?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 });
  }

  // Türkçe klavyede "İ" farkı olabildiği için normalize ederek karşılaştırıyoruz.
  const typed = (body.confirm ?? '').trim().toLocaleUpperCase('tr').replace(/İ/g, 'I');
  if (typed !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: `Onaylamak için "${CONFIRM_PHRASE}" yazmanız gerekiyor.` },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Hesap silme yapılandırılmamış: sunucuda SUPABASE_SERVICE_ROLE_KEY eksik.' },
      { status: 500 }
    );
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // 1) Sahip olunan işletmelerin depolanmış yedek dosyalarını temizle.
  //    (Storage, veritabanı CASCADE zincirine dahil değil.)
  const { data: ownedWorkspaces } = await admin
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id);

  for (const ws of ownedWorkspaces ?? []) {
    const workspaceId = ws.id as string;
    const { data: files } = await admin.storage.from('yedekler').list(workspaceId);
    if (files && files.length > 0) {
      await admin.storage.from('yedekler').remove(files.map((f) => `${workspaceId}/${f.name}`));
    }
  }

  // 2) Başkalarının işletmelerindeki ekip üyeliklerini kaldır.
  await admin.from('team_members').delete().eq('member_user_id', user.id);

  // 3) Auth kullanıcısını sil — workspaces.owner_id CASCADE zincirini tetikler.
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json(
      { error: `Hesap silinemedi: ${deleteError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    deletedWorkspaces: ownedWorkspaces?.length ?? 0,
  });
}
