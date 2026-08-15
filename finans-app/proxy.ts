import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

// Next.js 16'da "middleware" adı "proxy" olarak değişti (davranış aynı).
// Bkz: node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // _next statikleri, favicon, PWA ikonları/manifest ve resim dosyaları
    // proxy'den muaf — gereksiz Supabase çağrısı yapılmasın.
    '/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest).*)',
  ],
}
