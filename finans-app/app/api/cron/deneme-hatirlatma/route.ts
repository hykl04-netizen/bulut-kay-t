import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isEmailConfigured, sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Öneri 7 — deneme süresi bitiş hatırlatması.
 *
 * Günlük çalışır. Deneme bitişine 3 gün ve 1 gün kala, bir de bittiği gün
 * işletme sahibine e-posta gönderir. Hangi hatırlatmanın gönderildiği
 * `subscriptions.last_trial_reminder` alanında tutulur — cron her gün çalışsa
 * bile aynı e-posta tekrar gitmez.
 *
 * NEDEN GEREKLİ: Deneme uyarısı yalnızca panelde görünüyordu; giriş yapmayan
 * kullanıcı denemesinin bittiğini hiç öğrenmiyordu.
 *
 * GEREKLİ ORTAM DEĞİŞKENLERİ: CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY,
 * EPOSTA_API_KEY, EPOSTA_GONDEREN, NEXT_PUBLIC_APP_URL
 */

type Reminder = '3_gun' | '1_gun' | 'bitti';

/** Kalan güne göre gönderilmesi gereken hatırlatma (yoksa null). */
function reminderFor(daysLeft: number): Reminder | null {
  if (daysLeft <= 0) return 'bitti';
  if (daysLeft === 1) return '1_gun';
  if (daysLeft <= 3) return '3_gun';
  return null;
}

/** Aynı veya daha geç bir hatırlatma zaten gönderildiyse tekrar gönderme. */
const ORDER: Reminder[] = ['3_gun', '1_gun', 'bitti'];
function shouldSend(target: Reminder, alreadySent: Reminder | null): boolean {
  if (!alreadySent) return true;
  return ORDER.indexOf(target) > ORDER.indexOf(alreadySent);
}

function buildEmail(reminder: Reminder, workspaceName: string, appUrl: string | null) {
  const link = appUrl ? `${appUrl}/abonelik` : null;
  const button = link
    ? `<p style="margin-top:24px"><a href="${link}" style="background:#1b2559;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-size:14px">Planları incele</a></p>`
    : '';

  const copy: Record<Reminder, { subject: string; heading: string; body: string }> = {
    '3_gun': {
      subject: `${workspaceName} — ücretsiz denemenize 3 gün kaldı`,
      heading: 'Denemenize 3 gün kaldı',
      body: 'Bir plan seçerseniz hiçbir kesinti olmadan devam edersiniz. Seçmezseniz de hiçbir kaydınız silinmez.',
    },
    '1_gun': {
      subject: `${workspaceName} — ücretsiz denemeniz yarın bitiyor`,
      heading: 'Denemeniz yarın bitiyor',
      body: 'Yarından itibaren yeni kayıt ekleyip düzenleyemezsiniz. Mevcut verilerinizi görüntülemeye ve dışa aktarmaya devam edebilirsiniz.',
    },
    bitti: {
      subject: `${workspaceName} — ücretsiz denemeniz sona erdi`,
      heading: 'Denemeniz sona erdi',
      body: 'Verileriniz duruyor ve okunabilir; yalnızca yeni kayıt ekleme ve düzenleme durdu. Bir plan seçerek kaldığınız yerden devam edebilirsiniz.',
    },
  };

  const c = copy[reminder];
  return {
    subject: c.subject,
    html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 4px;color:#0f172a;font-size:20px">${c.heading}</h2>
      <p style="margin:0 0 16px;color:#64748b;font-size:14px">${workspaceName}</p>
      <p style="color:#334155;font-size:15px;line-height:1.6">${c.body}</p>
      ${button}
      <p style="margin-top:28px;color:#94a3b8;font-size:12px">
        Bu e-postayı ${workspaceName} işletmesinin sahibi olduğunuz için aldınız.
      </p>
    </div>`,
  };
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY eksik.' }, { status: 500 });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json({ skipped: true, reason: 'E-posta sağlayıcısı yapılandırılmamış.' });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? null;

  const { data: trials, error } = await admin
    .from('subscriptions')
    .select('workspace_id, trial_ends_at, last_trial_reminder')
    .eq('status', 'deneme')
    .not('trial_ends_at', 'is', null);

  if (error) {
    return NextResponse.json({ error: 'Abonelikler okunamadı.' }, { status: 500 });
  }
  if (!trials || trials.length === 0) {
    return NextResponse.json({ sent: 0, note: 'Deneme sürecinde işletme yok.' });
  }

  const workspaceIds = trials.map((t) => t.workspace_id as string);
  const { data: workspaces } = await admin
    .from('workspaces')
    .select('id, name, owner_id')
    .in('id', workspaceIds);

  const wsById = new Map(
    (workspaces ?? []).map((w) => [w.id as string, { name: w.name as string, ownerId: w.owner_id as string }])
  );

  const results: { workspace: string; reminder: Reminder; status: string }[] = [];
  const now = Date.now();

  for (const trial of trials) {
    const ws = wsById.get(trial.workspace_id as string);
    if (!ws) continue;

    const daysLeft = Math.ceil(
      (new Date(trial.trial_ends_at as string).getTime() - now) / (1000 * 60 * 60 * 24)
    );
    const reminder = reminderFor(daysLeft);
    if (!reminder) continue;
    if (!shouldSend(reminder, (trial.last_trial_reminder as Reminder | null) ?? null)) continue;

    // Sahibin e-posta adresi auth tarafında; service role ile okunuyor.
    const { data: owner } = await admin.auth.admin.getUserById(ws.ownerId);
    const email = owner?.user?.email;
    if (!email) continue;

    const { subject, html } = buildEmail(reminder, ws.name, appUrl);
    const result = await sendEmail({ to: email, subject, html });

    if (result.ok) {
      await admin
        .from('subscriptions')
        .update({ last_trial_reminder: reminder })
        .eq('workspace_id', trial.workspace_id);
    }

    results.push({ workspace: ws.name, reminder, status: result.ok ? 'gönderildi' : result.reason });
  }

  return NextResponse.json({ sent: results.filter((r) => r.status === 'gönderildi').length, results });
}
