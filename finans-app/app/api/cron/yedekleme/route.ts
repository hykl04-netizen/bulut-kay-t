import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Vercel Cron tarafından periyodik (günlük) tetiklenir; her çağrıda,
// sıklığı (haftalık/aylık) dolmuş kullanıcılar için otomatik JSON yedeği
// oluşturup private `yedekler` storage bucket'ına yükler.
//
// Gerekli ortam değişkenleri (Vercel > Project Settings > Environment Variables):
//   - SUPABASE_SERVICE_ROLE_KEY (Supabase Dashboard > Project Settings > API — "service_role" anahtarı, ASLA istemciye gönderilmez)
//   - CRON_SECRET (rastgele bir metin; Vercel Cron istekleri buna göre doğrulanır)
// NEXT_PUBLIC_SUPABASE_URL zaten mevcut ortam değişkenlerinde var.
//
// Zamanlama vercel.json'da tanımlı: her gün 03:00 UTC'de çalışır; bu route
// içeride hangi kullanıcının o gün "sırası geldiğini" kendisi hesaplar
// (weekly: son yedekten 7+ gün, monthly: 30+ gün geçmişse).

export const runtime = 'nodejs';
export const maxDuration = 60;

const FREQUENCY_DAYS: Record<string, number> = { weekly: 7, monthly: 30 };

// Yedeklenen tablolar `lib/backup.ts` ile ORTAK — otomatik yedek ile elle
// alınan yedek aynı kapsamda olsun ve geri yükleme ikisinde de çalışsın.
// Eskiden burada yalnızca 6 tablo vardı; banka hesapları, bütçeler, belgeler,
// bordro, cariler ve faturalar otomatik yedeğe hiç girmiyordu.
import { BACKUP_TABLES } from '@/lib/backup';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Yedekleme yapılandırılmamış: SUPABASE_SERVICE_ROLE_KEY eksik.' },
      { status: 500 }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: dueUsers, error: settingsError } = await admin
    .from('backup_settings')
    .select('workspace_id, user_id, frequency, last_backup_at')
    .neq('frequency', 'off');

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  const now = new Date();
  const results: { workspace_id: string; status: 'yedeklendi' | 'atlandı' | 'hata'; detail?: string }[] = [];

  for (const setting of dueUsers ?? []) {
    const intervalDays = FREQUENCY_DAYS[setting.frequency];
    const lastBackup = setting.last_backup_at ? new Date(setting.last_backup_at) : null;
    const dueSince = lastBackup
      ? (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    if (dueSince < intervalDays) {
      results.push({ workspace_id: setting.workspace_id, status: 'atlandı' });
      continue;
    }

    try {
      const tableResults = await Promise.all(
        BACKUP_TABLES.map((table) => admin.from(table).select('*').eq('workspace_id', setting.workspace_id))
      );
      const failed = tableResults.find((r) => r.error);
      if (failed?.error) throw new Error(failed.error.message);

      const payload = {
        version: 2,
        exportDate: now.toISOString(),
        automatic: true,
        workspaceId: setting.workspace_id,
        data: Object.fromEntries(BACKUP_TABLES.map((table, i) => [table, tableResults[i].data ?? []])),
      };

      // Depolama yolu da işletme bazlı — eskiden user_id klasörüne yazılıyordu
      // ve iki işletmesi olan kullanıcının yedekleri birbirinin üzerine biniyordu.
      const filePath = `${setting.workspace_id}/${now.toISOString().split('T')[0]}.json`;
      const { error: uploadError } = await admin.storage
        .from('yedekler')
        .upload(filePath, JSON.stringify(payload, null, 2), {
          contentType: 'application/json',
          upsert: true,
        });
      if (uploadError) throw new Error(uploadError.message);

      await admin
        .from('backup_settings')
        .update({ last_backup_at: now.toISOString() })
        .eq('workspace_id', setting.workspace_id);

      results.push({ workspace_id: setting.workspace_id, status: 'yedeklendi' });
    } catch (err) {
      console.error(`Otomatik yedekleme hatası (workspace ${setting.workspace_id}):`, err);
      results.push({ workspace_id: setting.workspace_id, status: 'hata', detail: err instanceof Error ? err.message : 'Bilinmeyen hata' });
    }
  }

  return NextResponse.json({ checked: dueUsers?.length ?? 0, results });
}
