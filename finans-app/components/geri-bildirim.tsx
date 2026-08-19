'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquarePlus, Loader2 } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toaster';
import { supabase } from '@/lib/supabase/client';

/**
 * Kapalı beta geri bildirim kutusu.
 *
 * NEDEN VAR: iki haftalık testin sonunda somut veri isteniyor. Sözlü geri
 * bildirim "iyiydi"ye indirgenir; hangi ekranda, ne yapmaya çalışırken
 * ne olduğu kaybolur. Bu yüzden mesajla birlikte SAYFA YOLU, ekran
 * ölçüsü ve tarayıcı bilgisi otomatik ekleniyor — test kullanıcısının
 * bunları yazmasını beklemek gerçekçi değil.
 *
 * Ayrıca tarayıcıda oluşan çalışma zamanı hataları da aynı tabloya
 * kendiliğinden düşüyor (aşağıdaki effect). Kullanıcı hiçbir şey
 * söylemese bile kırılan yer kayda geçiyor.
 */

type Tur = 'oneri' | 'hata' | 'soru';

const TURLER: { key: Tur; label: string }[] = [
  { key: 'hata', label: 'Bir şey bozuk' },
  { key: 'oneri', label: 'Önerim var' },
  { key: 'soru', label: 'Anlamadım' },
];

async function kaydet(payload: {
  tur: Tur | 'otomatik_hata';
  mesaj: string;
  sayfa: string;
}) {
  await supabase.from('geri_bildirim').insert({
    tur: payload.tur,
    mesaj: payload.mesaj.slice(0, 4000),
    sayfa: payload.sayfa,
    tarayici: typeof navigator === 'undefined' ? null : navigator.userAgent.slice(0, 500),
    ekran:
      typeof window === 'undefined'
        ? null
        : `${window.innerWidth}x${window.innerHeight}`,
  });
}

export function GeriBildirim() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tur, setTur] = useState<Tur>('hata');
  const [mesaj, setMesaj] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);

  // Otomatik hata yakalama. Aynı hatayı defalarca yazmamak için basit bir
  // tekrar filtresi var — tek bir bozuk render saniyede onlarca olay
  // üretebiliyor ve tablo çöp doluyor.
  const gorulen = useRef<Set<string>>(new Set());
  useEffect(() => {
    const yaz = (mesaj: string) => {
      const anahtar = mesaj.slice(0, 200);
      if (gorulen.current.has(anahtar)) return;
      gorulen.current.add(anahtar);
      void kaydet({ tur: 'otomatik_hata', mesaj, sayfa: window.location.pathname }).catch(() => {});
    };

    const onError = (e: ErrorEvent) => {
      yaz(`${e.message}\n${e.filename}:${e.lineno}:${e.colno}`);
    };
    const onReject = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      yaz(`Yakalanmamış hata: ${r instanceof Error ? `${r.message}\n${r.stack ?? ''}` : String(r)}`);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onReject);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onReject);
    };
  }, []);

  const gonder = async () => {
    if (!mesaj.trim()) return;
    setGonderiliyor(true);
    try {
      await kaydet({ tur, mesaj: mesaj.trim(), sayfa: pathname });
      toast.success('Teşekkürler, iletildi.');
      setMesaj('');
      setOpen(false);
    } catch {
      toast.error('Gönderilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <MessageSquarePlus className="h-4 w-4 shrink-0" />
        Geri bildirim gönder
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Geri bildirim">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {TURLER.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTur(t.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  tur === t.key
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="geri-bildirim-mesaj" className="mb-1.5 block text-sm text-muted-foreground">
              Ne yapmaya çalışıyordunuz, ne oldu?
            </label>
            <textarea
              id="geri-bildirim-mesaj"
              rows={5}
              value={mesaj}
              onChange={(e) => setMesaj(e.target.value)}
              placeholder="Örn. Fatura kesip kaydete bastım, sayfa beyaz kaldı."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Hangi ekranda olduğunuz ({pathname}) ve cihaz bilgisi otomatik ekleniyor — yazmanıza
              gerek yok.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={gonder}
              disabled={gonderiliyor || !mesaj.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {gonderiliyor && <Loader2 className="h-4 w-4 animate-spin" />}
              Gönder
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
