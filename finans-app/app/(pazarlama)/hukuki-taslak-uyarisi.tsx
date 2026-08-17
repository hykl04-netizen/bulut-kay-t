import { AlertTriangle } from 'lucide-react';

/**
 * Faz 7 — hukuki metinler için taslak uyarısı.
 *
 * Gizlilik/KVKK ve Kullanım Şartları metinleri BİR HUKUKÇU TARAFINDAN
 * YAZILMAMIŞTIR; sektörde yaygın maddeleri temel alan taslaklardır. Finansal
 * veri işlendiği için yayına almadan önce bir hukuk danışmanına inceletilmesi
 * gerekir (yol haritasında da bu not var).
 *
 * İnceleme tamamlanınca aşağıdaki sabiti `true` yapın — uyarı şeridi kaybolur.
 * Metinlerdeki [KÖŞELİ PARANTEZ] içindeki alanların da gerçek bilgilerle
 * doldurulması gerekir.
 */
export const HUKUKI_METIN_ONAYLANDI = false;

export function HukukiTaslakUyarisi() {
  if (HUKUKI_METIN_ONAYLANDI) return null;

  return (
    <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">Bu metin taslaktır — henüz hukukçu onayından geçmedi.</p>
        <p className="mt-1">
          Yayına almadan önce bir hukuk danışmanına inceletin ve köşeli parantezli alanları
          gerçek bilgilerinizle doldurun. Onaydan sonra{' '}
          <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/50">
            HUKUKI_METIN_ONAYLANDI
          </code>{' '}
          sabitini <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/50">true</code>{' '}
          yapmanız bu uyarıyı kaldırır.
        </p>
      </div>
    </div>
  );
}
