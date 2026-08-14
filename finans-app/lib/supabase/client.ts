import { createClient } from '@supabase/supabase-js'

// .env.local dosyasındaki gizli anahtarları çekiyoruz
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Projenin her yerinde kullanacağımız veritabanı bağlantısını dışa aktarıyoruz
export const supabase = createClient(supabaseUrl, supabaseKey)