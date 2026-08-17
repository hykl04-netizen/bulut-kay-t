import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Oturum GEREKTİRMEYEN yollar. Faz 2'de model tersine çevrildi: eskiden
// korunacak sayfalar tek tek sayılıyordu ve listeye eklenmeyen her yeni sayfa
// (/ayarlar, /oturumlar, /aktivite-gecmisi, /donem-kilitleme, /ekip,
// /katagoriler) sunucu tarafında korumasız kalıyordu. Artık varsayılan
// KORUMALI — sadece aşağıdaki yollar herkese açık, sonradan eklenen her sayfa
// otomatik olarak oturum ister.
const PUBLIC_PREFIXES = [
  '/login',
  '/kayit-ol',
  '/sifremi-unuttum',
  '/sifre-guncelle',
  '/auth', // e-posta doğrulama dönüş route'u (/auth/callback)
]

// Oturum açmış kullanıcının görmesi anlamsız olan sayfalar — panele yönlendirilir.
const GUEST_ONLY_PAGES = ['/login', '/kayit-ol']

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
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

  const { pathname } = request.nextUrl

  // API route'ları kendi yetkilendirmesini yapıyor (cron'lar CRON_SECRET ile,
  // /api/ekip oturum + rol kontrolüyle). Buradan /login'e yönlendirmek onları
  // bozardı — sadece oturum tazelenip geçiliyor.
  if (pathname.startsWith('/api')) {
    await supabase.auth.getUser()
    return response
  }

  // ÖNEMLİ: getSession() değil getUser() kullanılıyor. getSession() cookie'deki
  // JWT'ye sorgusuzca güvenir; getUser() Supabase Auth sunucusuna sorup token'ı
  // gerçekten doğrular. Sunucu taraflı bir koruma için bu fark kritik.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !matchesPrefix(pathname, PUBLIC_PREFIXES)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (user && GUEST_ONLY_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
