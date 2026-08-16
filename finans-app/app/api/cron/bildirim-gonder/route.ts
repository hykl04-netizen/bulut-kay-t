import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { getDueInfo } from '@/lib/due-date';
import { buildBudgetRows } from '@/lib/budget';

// Vercel Cron tarafından günlük tetiklenir; vadesi yaklaşan/gecikmiş fatura ve
// borçlar ile bütçe aşımları için, push bildirimi tercihi açık olan ve en az
// bir cihazdan abone olmuş kullanıcılara Web Push bildirimi gönderir.
//
// Gerekli ortam değişkenleri (Vercel > Project Settings > Environment Variables):
//   - SUPABASE_SERVICE_ROLE_KEY (yedekleme cron'uyla aynı — RLS'i atlayıp tüm
//     kullanıcıları taramak için gerekli)
//   - CRON_SECRET (yedekleme cron'uyla aynı secret kullanılabilir)
//   - VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY (bir kere üretilir,
//     `npx web-push generate-vapid-keys` ile de üretilebilir)
//   - VAPID_SUBJECT (örn. "mailto:destek@example.com" — push servislerinin
//     istediği bir iletişim adresi, zorunlu)
//
// Zamanlama vercel.json'da tanımlı. Aynı hatırlatmanın aynı gün tekrar
// gönderilmemesi için her gönderim `push_notification_log`'a
// (user_id, ref_type, ref_id, sent_for_date) olarak kaydedilir — bu route
// birden fazla kez tetiklense bile idempotent kalır.

export const runtime = 'nodejs';
export const maxDuration = 60;

// Hangi vade durumları push bildirimi tetikler — her gün spam olmaması için
// sadece "gecikmiş", "bugün" ve "3 gün veya daha az kaldı" durumlarında
// gönderilir (30 günlük tüm ufuk boyunca değil).
const NOTIFIABLE_TONES = new Set(['overdue', 'today', 'soon']);

function toneMessage(title: string, tone: string, days: number): string {
  if (tone === 'overdue') return `${title}: vadesi ${Math.abs(days)} gün geçti.`;
  if (tone === 'today') return `${title}: vadesi bugün doluyor.`;
  return `${title}: vadeye ${days} gün kaldı.`;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY eksik.' }, { status: 500 });
  }
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return NextResponse.json(
      { error: 'Push bildirimleri yapılandırılmamış: VAPID_PRIVATE_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_SUBJECT eksik.' },
      { status: 500 }
    );
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Sadece en az bir cihazdan abone olmuş kullanıcıları işleriz.
  const { data: subscriptions, error: subsError } = await admin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth_key');
  if (subsError) {
    return NextResponse.json({ error: subsError.message }, { status: 500 });
  }
  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ checked: 0, sent: 0, note: 'Abone yok.' });
  }

  const subsByUser = new Map<string, typeof subscriptions>();
  for (const s of subscriptions) {
    subsByUser.set(s.user_id, [...(subsByUser.get(s.user_id) ?? []), s]);
  }
  const userIds = Array.from(subsByUser.keys());

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [prefsRes, billsRes, debtsRes, budgetsRes, categoriesRes, txRes] = await Promise.all([
    admin.from('notification_preferences').select('*').in('user_id', userIds),
    admin.from('bills').select('id, user_id, title, due_date').eq('status', 'odenmedi').not('due_date', 'is', null).in('user_id', userIds),
    admin.from('debts').select('id, user_id, counterparty, due_date, direction').eq('status', 'acik').not('due_date', 'is', null).in('user_id', userIds),
    admin.from('budgets').select('user_id, category_id, monthly_limit').in('user_id', userIds),
    admin.from('categories').select('id, user_id, name, color, type').in('user_id', userIds).eq('type', 'gider'),
    admin.from('transactions').select('user_id, type, amount, date, category_id').in('user_id', userIds),
  ]);

  const prefsByUser = new Map((prefsRes.data ?? []).map((p) => [p.user_id, p]));

  let sentCount = 0;
  const errors: { user_id: string; error: string }[] = [];

  async function sendToUser(userId: string, refType: string, refId: string, title: string, body: string, url: string) {
    // Aynı hatırlatma bugün zaten gönderildiyse atla (idempotent).
    const { data: existing } = await admin
      .from('push_notification_log')
      .select('id')
      .eq('user_id', userId)
      .eq('ref_type', refType)
      .eq('ref_id', refId)
      .eq('sent_for_date', todayStr)
      .maybeSingle();
    if (existing) return;

    const userSubs = subsByUser.get(userId) ?? [];
    let anySuccess = false;
    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          JSON.stringify({ title, body, url })
        );
        anySuccess = true;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Abonelik artık geçersiz (kullanıcı izni kaldırmış/uygulamayı kaldırmış) — temizle.
          await admin.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          errors.push({ user_id: userId, error: err instanceof Error ? err.message : 'Bilinmeyen hata' });
        }
      }
    }
    if (anySuccess) {
      sentCount++;
      await admin.from('push_notification_log').insert({
        user_id: userId, ref_type: refType, ref_id: refId, sent_for_date: todayStr,
      });
    }
  }

  // 1) Fatura/Masraf ve Borç hatırlatmaları
  for (const userId of userIds) {
    const prefs = prefsByUser.get(userId);
    const showUpcoming = prefs?.show_upcoming_payments ?? true;
    if (!showUpcoming) continue;

    const bills = (billsRes.data ?? []).filter((b) => b.user_id === userId);
    for (const b of bills) {
      const info = getDueInfo(b.due_date, false);
      if (!info || !NOTIFIABLE_TONES.has(info.tone)) continue;
      await sendToUser(userId, 'fatura', b.id, 'Fatura/Masraf Hatırlatma', toneMessage(b.title, info.tone, info.days), '/fatura-masraf');
    }

    const debts = (debtsRes.data ?? []).filter((d) => d.user_id === userId && d.direction === 'borc');
    for (const d of debts) {
      const info = getDueInfo(d.due_date, false);
      if (!info || !NOTIFIABLE_TONES.has(info.tone)) continue;
      await sendToUser(userId, 'borc', d.id, 'Borç Hatırlatma', toneMessage(d.counterparty, info.tone, info.days), '/borc-alacak');
    }
  }

  // 2) Bütçe aşımı özeti — kullanıcı başına günde en fazla 1 bildirim.
  for (const userId of userIds) {
    const prefs = prefsByUser.get(userId);
    const showBudget = prefs?.show_budget_alerts ?? true;
    if (!showBudget) continue;

    const userCategories = (categoriesRes.data ?? []).filter((c) => c.user_id === userId);
    const userBudgets = (budgetsRes.data ?? []).filter((b) => b.user_id === userId);
    const userTx = (txRes.data ?? []).filter((t) => t.user_id === userId);
    if (userBudgets.length === 0) continue;

    const overRows = buildBudgetRows(
      userCategories,
      userBudgets.map((b) => ({ category_id: b.category_id, monthly_limit: Number(b.monthly_limit) })),
      userTx.map((t) => ({ type: t.type, amount: Number(t.amount), date: t.date, category_id: t.category_id }))
    ).filter((r) => r.tone === 'over');

    if (overRows.length === 0) continue;
    const body = overRows.length === 1
      ? `"${overRows[0].categoryName}" kategorisi bütçe limitini aştı.`
      : `${overRows.length} kategori bütçe limitini aştı: ${overRows.map((r) => r.categoryName).join(', ')}.`;
    await sendToUser(userId, 'budget_summary', 'daily', 'Bütçe Aşımı', body, '/butce');
  }

  return NextResponse.json({ checked: userIds.length, sent: sentCount, errors });
}
