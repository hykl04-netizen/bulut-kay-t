import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server Component / Server Action içinden Supabase'e erişmek için.
// Her çağrıda yeni bir client oluşturulur (cookie store'a bağlı olduğu için
// singleton yapılamaz) — Supabase'in resmi @supabase/ssr önerisi budur.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Bir Server Component render'ı sırasında çağrılırsa cookie
            // set edilemez (Next.js kısıtı). proxy.ts zaten her istekte
            // session'ı tazelediği için burada sessizce yutmak güvenli.
          }
        },
      },
    }
  )
}
