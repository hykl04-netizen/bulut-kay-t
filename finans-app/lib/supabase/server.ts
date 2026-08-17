import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// API route'larda çağıran kullanıcının oturumunu (cookie üzerinden) okuyan
// client. Bu client RLS'e tabidir (anon key kullanır) — yani sadece
// kullanıcının kendi erişebildiği satırları görür. Yönetici işlemleri
// (örn. kullanıcı davet etme) için bunun yerine service role client
// kullanılmalı (bkz. app/api/ekip/route.ts).
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // API route içinde cookie yazmaya gerek yok (oturum zaten proxy.ts
          // tarafından tazeleniyor); no-op bırakılıyor.
        },
      },
    }
  );
}
