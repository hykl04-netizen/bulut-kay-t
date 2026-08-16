import { NextRequest, NextResponse } from 'next/server';

// Yatırım portföyü için güncel fiyat çekme.
// Yahoo Finance'in anahtar gerektirmeyen (ama resmi/dokümante olmayan)
// "chart" endpoint'ini kullanır: query1.finance.yahoo.com/v8/finance/chart/{ticker}
// NOT: Bu endpoint Yahoo tarafından duyurusuz değiştirilebilir/kapatılabilir.
// Üretimde kritik bir akış bu uca bağlanmamalı; burada sadece "kullanıcı elle
// tetiklediğinde referans fiyat çeker" şeklinde, en kötü ihtimalle hata
// verip elle girişe düşen bir yardımcı özellik olarak kullanılıyor.

export const runtime = 'nodejs';

type AssetType = 'hisse' | 'doviz' | 'kripto' | 'fon' | 'altin';

const GRAM_PER_OUNCE = 31.1034768;

async function fetchYahooPrice(ticker: string): Promise<{ price: number; currency: string } | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FinansAppBot/1.0)' },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  const price = result?.meta?.regularMarketPrice;
  const currency = result?.meta?.currency;
  if (typeof price !== 'number' || !currency) return null;
  return { price, currency };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const assetType = searchParams.get('assetType') as AssetType | null;
  const symbolRaw = searchParams.get('symbol');
  const targetCurrency = (searchParams.get('currency') || 'TRY').toUpperCase();

  if (!assetType || !symbolRaw) {
    return NextResponse.json({ error: 'assetType ve symbol parametreleri gerekli.' }, { status: 400 });
  }
  const symbol = symbolRaw.trim().toUpperCase();

  try {
    if (assetType === 'fon') {
      // TEFAS'taki Türkiye yatırım fonları için anahtarsız/genel bir API
      // bulunmuyor (resmi veri TEFAS'tan scraping ya da ücretli sağlayıcı
      // gerektirir) — bu yüzden fon için otomatik fiyat desteklenmiyor.
      return NextResponse.json(
        { error: 'Yatırım fonları için otomatik fiyat çekme desteklenmiyor, lütfen TEFAS üzerinden kontrol edip elle girin.' },
        { status: 501 }
      );
    }

    if (assetType === 'hisse') {
      const quote = await fetchYahooPrice(symbol);
      if (!quote) {
        return NextResponse.json(
          { error: `"${symbol}" için fiyat bulunamadı. BIST hisseleri için sembolün sonuna ".IS" ekleyin (örn: THYAO.IS).` },
          { status: 404 }
        );
      }
      return NextResponse.json({ price: quote.price, currency: quote.currency, asOf: new Date().toISOString() });
    }

    if (assetType === 'doviz') {
      const ticker = symbol.endsWith('=X') ? symbol : `${symbol}${targetCurrency}=X`;
      const quote = await fetchYahooPrice(ticker);
      if (!quote) {
        return NextResponse.json({ error: `"${symbol}" için döviz kuru bulunamadı.` }, { status: 404 });
      }
      return NextResponse.json({ price: quote.price, currency: targetCurrency, asOf: new Date().toISOString() });
    }

    if (assetType === 'kripto') {
      if (targetCurrency === 'USD') {
        const quote = await fetchYahooPrice(`${symbol}-USD`);
        if (!quote) return NextResponse.json({ error: `"${symbol}" kripto fiyatı bulunamadı.` }, { status: 404 });
        return NextResponse.json({ price: quote.price, currency: 'USD', asOf: new Date().toISOString() });
      }
      // Hedef TRY (ya da başka): önce USD fiyatını al, sonra USD/hedef kuru ile çevir.
      const [cryptoUsd, fx] = await Promise.all([
        fetchYahooPrice(`${symbol}-USD`),
        fetchYahooPrice(`USD${targetCurrency}=X`),
      ]);
      if (!cryptoUsd) return NextResponse.json({ error: `"${symbol}" kripto fiyatı bulunamadı.` }, { status: 404 });
      if (!fx) return NextResponse.json({ error: `USD/${targetCurrency} kuru alınamadı.` }, { status: 404 });
      return NextResponse.json({
        price: Math.round(cryptoUsd.price * fx.price * 100) / 100,
        currency: targetCurrency,
        asOf: new Date().toISOString(),
      });
    }

    if (assetType === 'altin') {
      // GC=F: ons altın vadeli fiyatı (USD). Gram fiyatına çevirip hedef
      // para birimine (genelde TRY) dönüştürüyoruz.
      const [goldUsdOunce, fx] = await Promise.all([
        fetchYahooPrice('GC=F'),
        targetCurrency === 'USD' ? Promise.resolve({ price: 1, currency: 'USD' }) : fetchYahooPrice(`USD${targetCurrency}=X`),
      ]);
      if (!goldUsdOunce) return NextResponse.json({ error: 'Altın fiyatı alınamadı.' }, { status: 404 });
      if (!fx) return NextResponse.json({ error: `USD/${targetCurrency} kuru alınamadı.` }, { status: 404 });
      const pricePerGram = (goldUsdOunce.price / GRAM_PER_OUNCE) * fx.price;
      return NextResponse.json({
        price: Math.round(pricePerGram * 100) / 100,
        currency: targetCurrency,
        asOf: new Date().toISOString(),
        note: 'Ons altın (GC=F) baz alınarak gram fiyatına çevrildi; has/22 ayar gibi ayar farkları yansıtılmaz.',
      });
    }

    return NextResponse.json({ error: 'Geçersiz varlık türü.' }, { status: 400 });
  } catch (err) {
    console.error('Piyasa fiyatı isteği başarısız:', err);
    return NextResponse.json({ error: 'Fiyat servisi şu anda yanıt vermiyor.' }, { status: 502 });
  }
}
