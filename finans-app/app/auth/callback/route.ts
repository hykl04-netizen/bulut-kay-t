import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * Faz 2 — e-posta doğrulama dönüş noktası.
 *
 * Kayıt e-postasındaki bağlantı önce Supabase'in verify endpoint'ine, oradan
 * da buraya döner. İki olası biçim var, ikisi de destekleniyor:
 *
 *  - `?code=...`        → PKCE akışı (createBrowserClient'ın varsayılanı).
 *                          Kod, tarayıcıdaki "code verifier" cookie'siyle
 *                          birlikte oturuma çevrilir.
 *  - `?token_hash=...&type=signup` → e-posta OTP akışı (bazı Supabase e-posta
 *                          şablonları bu biçimi üretir).
 *
 * Oturum cookie'lerini YAZMASI gerektiği için buradaki client
 * `lib/supabase/server.ts`'teki (setAll'ı no-op olan) client'tan ayrı
 * tanımlanıyor — o client sadece okuma amaçlı.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  // Açık yönlendirme (open redirect) açığı olmasın diye sadece uygulama içi,
  // tek eğik çizgiyle başlayan yollara izin veriliyor.
  const rawNext = searchParams.get('next') ?? '/kurulum';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/kurulum';

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?hata=dogrulama`);
}
