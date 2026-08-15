import { createBrowserClient } from '@supabase/ssr'

// .env.local dosyasındaki gizli anahtarları çekiyoruz
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Projenin her yerinde kullanacağımız veritabanı bağlantısını dışa aktarıyoruz.
// createBrowserClient (eski createClient'ın aksine) oturumu localStorage yerine
// cookie'de tutar — böylece proxy.ts (sunucu tarafı) da aynı oturumu okuyup
// sayfa korumasını yapabilir.
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)