import { NextRequest, NextResponse } from 'next/server';

// Fiş/fatura görselinden tutar, tarih ve satıcı bilgisini otomatik çıkarır.
// Sunucu tarafında çalışır (API anahtarı istemciye asla gönderilmez).
// Gerekli ortam değişkeni: ANTHROPIC_API_KEY (Vercel > Project Settings > Environment Variables)

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — OCR için makul bir üst sınır
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

interface ExtractedReceipt {
  title: string | null;
  amount: number | null;
  date: string | null; // YYYY-MM-DD
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OCR özelliği yapılandırılmamış. Sunucuda ANTHROPIC_API_KEY ortam değişkeni eksik.' },
      { status: 500 }
    );
  }

  let file: File | null;
  try {
    const formData = await request.formData();
    file = formData.get('file') as File | null;
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Sadece JPG, PNG, WEBP veya HEIC görsel kabul edilir.' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Görsel 10MB sınırını aşıyor.' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const todayIso = new Date().toISOString().split('T')[0];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 300,
        system:
          'Sen bir fiş/fatura okuma asistanısın. Sana verilen görseldeki bilgileri çıkarıp SADECE ' +
          'geçerli bir JSON nesnesi döndür — başka hiçbir açıklama, markdown ya da kod bloğu ekleme. ' +
          'Şema: {"title": string|null, "amount": number|null, "date": string|null}. ' +
          '"title" satıcı/mağaza adı ya da harcama açıklaması olsun (kısa, örn. "Migros" veya "Elektrik Faturası"). ' +
          '"amount" toplam tutarı (KDV dahil, ondalık nokta ile, para birimi sembolü olmadan) sayı olarak ver. ' +
          `"date" fişte yazan tarihi YYYY-MM-DD formatında ver; okunamıyorsa null bırak (bugünün tarihini varsayma, bugün: ${todayIso}). ` +
          'Hiçbir alan net okunamıyorsa o alanı null yap. Görselde fiş/fatura yoksa hepsini null yap.',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: file.type, data: base64 },
              },
              { type: 'text', text: 'Bu fiş/faturadan tutar, tarih ve satıcı bilgisini çıkar.' },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API hatası:', response.status, errText);
      return NextResponse.json({ error: 'OCR servisi şu anda yanıt vermiyor. Lütfen tekrar deneyin.' }, { status: 502 });
    }

    const data = await response.json();
    const textBlock = (data?.content ?? []).find((b: { type: string }) => b.type === 'text');
    const raw: string = textBlock?.text ?? '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();

    let parsed: ExtractedReceipt;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'Fiş içeriği okunamadı. Lütfen bilgileri elle girin.' }, { status: 422 });
    }

    // Basit doğrulama / temizlik
    const amount =
      typeof parsed.amount === 'number' && Number.isFinite(parsed.amount) && parsed.amount > 0
        ? Math.round(parsed.amount * 100) / 100
        : null;
    const dateOk = typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date);

    return NextResponse.json({
      title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim().slice(0, 120) : null,
      amount,
      date: dateOk ? parsed.date : null,
    } satisfies ExtractedReceipt);
  } catch (err) {
    console.error('OCR isteği başarısız:', err);
    return NextResponse.json({ error: 'Bağlantı hatası oluştu.' }, { status: 500 });
  }
}
