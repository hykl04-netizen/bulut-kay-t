/**
 * Faz 6 — sunucu tarafı e-posta gönderimi (sağlayıcıdan bağımsız).
 *
 * Supabase'in yerleşik e-posta servisi yalnızca kimlik doğrulama (kayıt,
 * şifre sıfırlama, davet) e-postaları içindir ve sadece proje ekibindeki
 * adreslere gönderir. Ürün e-postaları (muhasebeci aylık özeti gibi) için
 * ayrı bir sağlayıcı gerekir.
 *
 * GEREKLİ ORTAM DEĞİŞKENLERİ:
 *   EPOSTA_SAGLAYICI  'resend' (varsayılan) — ileride başka sağlayıcı eklenirse burada dallanır
 *   EPOSTA_API_KEY    sağlayıcının API anahtarı
 *   EPOSTA_GONDEREN   doğrulanmış gönderen adresi, örn. "FinansApp <bildirim@alanadiniz.com>"
 *
 * Anahtar tanımlı değilse `sendEmail` gönderim YAPMAZ ve `skipped` döner —
 * çağıran taraf bunu hata olarak değil "yapılandırılmamış" olarak ele almalı.
 * Bu sayede ortam değişkeni eklenmeden de uygulama çalışır.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export type EmailResult =
  | { ok: true; id?: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; reason: string };

export function isEmailConfigured(): boolean {
  return Boolean(process.env.EPOSTA_API_KEY && process.env.EPOSTA_GONDEREN);
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.EPOSTA_API_KEY;
  const from = process.env.EPOSTA_GONDEREN;
  const provider = (process.env.EPOSTA_SAGLAYICI ?? 'resend').toLowerCase();

  if (!apiKey || !from) {
    return { ok: false, skipped: true, reason: 'EPOSTA_API_KEY veya EPOSTA_GONDEREN tanımlı değil.' };
  }

  if (provider !== 'resend') {
    return { ok: false, skipped: true, reason: `Desteklenmeyen e-posta sağlayıcısı: ${provider}` };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        ...(message.text ? { text: message.text } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, skipped: false, reason: `Sağlayıcı hatası (${res.status}): ${body.slice(0, 200)}` };
    }

    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, skipped: false, reason: err instanceof Error ? err.message : 'Bilinmeyen hata' };
  }
}
