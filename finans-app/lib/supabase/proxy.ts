import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Oturum gerektiren sayfalar. '/' (özet panel) dahil — misafir kullanıcı
// hiçbir dashboard sayfasını görmemeli.
const PROTECTED_PREFIXES = [
  '/',
  '/gelir-gider',
  '/borc-alacak',
  '/fatura-masraf',
  '/banka-hesaplari',
  '/yatirim',
  '/varlik',
  '/bordro',
  '/butce',
  '/belgeler',
  '/raporlar',
  '/kategoriler',
]

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) =>
    prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ÖNEMLİ: getSession() değil getUser() kullanılıyor. getSession() cookie'deki
  // JWT'ye sorgusuzca güvenir; getUser() Supabase Auth sunucusuna sorup token'ı
  // gerçekten doğrular. Sunucu taraflı bir koruma için bu fark kritik.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}
