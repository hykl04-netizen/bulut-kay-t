import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * Faz 3 — ödeme sağlayıcısı webhook'u (SAĞLAYICIDAN BAĞIMSIZ İSKELET).
 *
 * Ödeme sağlayıcısı (iyzico veya Stripe) henüz seçilmedi. Bu route, sağlayıcı
 * seçildiğinde yalnızca iki noktanın doldurulmasıyla çalışır hale gelecek
 * şekilde yazıldı:
 *
 *   1) `verifySignature()` — sağlayıcının imza doğrulaması
 *      (Stripe: `stripe.webhooks.constructEvent`, iyzico: kendi hash şeması).
 *   2) `parseEvent()`      — sağlayıcının olay gövdesini aşağıdaki ortak
 *                            `SubscriptionUpdate` biçimine çevirme.
 *
 * Geri kalan her şey (yetkilendirme, veritabanı güncellemesi, tolerans süresi
 * mantığı) sağlayıcıdan bağımsız ve hazır.
 *
 * NEDEN SERVICE ROLE: `subscriptions` tablosunda yalnızca SELECT politikası
 * var — kullanıcı kendi planını değiştiremesin diye. Yazma sadece buradan,
 * servis anahtarıyla yapılır.
 *
 * GEREKLİ ORTAM DEĞİŞKENLERİ:
 *   SUPABASE_SERVICE_ROLE_KEY   (zaten mevcut — /api/ekip ve cron'lar kullanıyor)
 *   ODEME_WEBHOOK_SECRET        (sağlayıcı panelinde tanımlanan imza sırrı)
 */

type SubscriptionStatus = 'deneme' | 'aktif' | 'odeme_bekliyor' | 'iptal' | 'suresi_doldu';

interface SubscriptionUpdate {
  workspaceId: string;
  plan?: 'baslangic' | 'pro' | 'kurumsal';
  status: SubscriptionStatus;
  currentPeriodEnd?: string | null;
  provider: 'iyzico' | 'stripe';
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
}

/** Ödeme başarısız olduğunda tamamen kilitlemeden önce tanınan süre. */
const GRACE_DAYS = 5;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

/**
 * TODO(sağlayıcı seçilince): gerçek imza doğrulaması.
 * Şu an sırrın varlığını ve eşleşmesini kontrol ediyor — sır tanımlı değilse
 * route bilinçli olarak 501 döner, yani yanlışlıkla açık kalmaz.
 */
function verifySignature(request: NextRequest, rawBody: string): boolean {
  const secret = process.env.ODEME_WEBHOOK_SECRET;
  if (!secret) return false;
  const signature = request.headers.get('x-webhook-signature');
  void rawBody; // imza hesabında kullanılacak
  return signature === secret;
}

/**
 * TODO(sağlayıcı seçilince): sağlayıcının olay gövdesini ortak biçime çevir.
 * Beklenen eşleme:
 *   ödeme başarılı / abonelik yenilendi → 'aktif'
 *   ödeme başarısız                     → 'odeme_bekliyor'  (+ GRACE_DAYS)
 *   abonelik iptal edildi               → 'iptal'
 *   dönem bitti, yenilenmedi            → 'suresi_doldu'
 */
function parseEvent(payload: unknown): SubscriptionUpdate | null {
  const body = payload as Partial<SubscriptionUpdate> | null;
  if (!body || typeof body.workspaceId !== 'string' || typeof body.status !== 'string') {
    return null;
  }
  return body as SubscriptionUpdate;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!process.env.ODEME_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Ödeme sağlayıcısı henüz yapılandırılmadı (ODEME_WEBHOOK_SECRET eksik).' },
      { status: 501 }
    );
  }

  if (!verifySignature(request, rawBody)) {
    return NextResponse.json({ error: 'Geçersiz imza.' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON gövdesi.' }, { status: 400 });
  }

  const update = parseEvent(payload);
  if (!update) {
    return NextResponse.json({ error: 'Olay çözümlenemedi.' }, { status: 400 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Sunucuda SUPABASE_SERVICE_ROLE_KEY eksik.' }, { status: 500 });
  }

  const graceUntil =
    update.status === 'odeme_bekliyor'
      ? new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const { error } = await admin
    .from('subscriptions')
    .update({
      ...(update.plan ? { plan: update.plan } : {}),
      status: update.status,
      current_period_end: update.currentPeriodEnd ?? null,
      grace_until: graceUntil,
      provider: update.provider,
      provider_customer_id: update.providerCustomerId ?? null,
      provider_subscription_id: update.providerSubscriptionId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', update.workspaceId);

  if (error) {
    return NextResponse.json({ error: 'Abonelik güncellenemedi.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
