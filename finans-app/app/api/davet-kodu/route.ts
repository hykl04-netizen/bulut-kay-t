import { NextResponse } from 'next/server';

/**
 * Kapalı beta davet kodu doğrulaması.
 *
 * NEDEN SUNUCUDA: kodu NEXT_PUBLIC_ bir değişkene koysaydık tarayıcı
 * paketinin içine gömülürdü ve kaynağa bakan herkes okurdu. Kod burada,
 * sunucuya özel `DAVET_KODU` ortam değişkeninde duruyor; istemciye
 * yalnızca "doğru/yanlış" dönüyor.
 *
 * DÜRÜST SINIRI: bu bir kapı değil, bir hız kesici. Supabase'in kayıt
 * uç noktası hâlâ açık; ne yaptığını bilen biri doğrudan çağırabilir.
 * Gerçek kilit için Supabase panelinden "Allow new users to sign up"
 * kapatılmalı — kapalı betada hesapları zaten elle açıyoruz, o yüzden
 * bunu yapmak hiçbir şeyi kaybettirmez.
 *
 * DAVET_KODU tanımlı DEĞİLSE kayıt serbest kalır: ortam değişkeni
 * unutuldu diye kimse kapıda kalmasın.
 */
export async function POST(request: Request) {
  const beklenen = process.env.DAVET_KODU?.trim();
  if (!beklenen) return NextResponse.json({ gecerli: true, kapaliBeta: false });

  let kod = '';
  try {
    const govde = (await request.json()) as { kod?: unknown };
    kod = typeof govde.kod === 'string' ? govde.kod.trim() : '';
  } catch {
    kod = '';
  }

  const gecerli = kod.toLowerCase() === beklenen.toLowerCase();
  return NextResponse.json({ gecerli, kapaliBeta: true }, { status: gecerli ? 200 : 403 });
}

/** Kayıt sayfası, davet kodu alanını gösterip göstermeyeceğini buradan öğrenir. */
export async function GET() {
  return NextResponse.json({ kapaliBeta: Boolean(process.env.DAVET_KODU?.trim()) });
}
