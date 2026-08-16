export interface MarketPriceResult {
  price: number;
  currency: string;
  asOf: string;
  note?: string;
}

export interface MarketPriceError {
  error: string;
}

export async function fetchMarketPrice(
  assetType: 'hisse' | 'doviz' | 'kripto' | 'fon' | 'altin',
  symbol: string,
  currency: string
): Promise<MarketPriceResult | MarketPriceError> {
  try {
    const params = new URLSearchParams({ assetType, symbol, currency });
    const res = await fetch(`/api/piyasa-fiyati?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      return { error: data?.error ?? 'Fiyat alınamadı.' };
    }
    return data as MarketPriceResult;
  } catch {
    return { error: 'Bağlantı hatası oluştu.' };
  }
}

export function isMarketPriceError(result: MarketPriceResult | MarketPriceError): result is MarketPriceError {
  return 'error' in result;
}
