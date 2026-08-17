'use client';

import Link from 'next/link';
import { Check, Lock } from 'lucide-react';
import { PLANS, TRIAL_DAYS } from '@/lib/plans';

/**
 * Faz 7 — herkese açık fiyatlandırma sayfası.
 *
 * Plan bilgileri `lib/plans.ts`'ten okunuyor — uygulama içindeki /abonelik
 * sayfasıyla TEK KAYNAKTAN besleniyor ki fiyat iki yerde ayrı ayrı
 * güncellenmek zorunda kalmasın.
 *
 * NOT: Fiyatlar hâlâ yer tutucu. Ödeme sağlayıcısı seçilip ürünler
 * tanımlandığında lib/plans.ts güncellenince burası da otomatik değişir.
 */
export default function FiyatlandirmaPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Fiyatlandırma</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Her plan {TRIAL_DAYS} gün ücretsiz denemeyle başlar. Kart bilgisi istemiyoruz, deneme
          kendiliğinden ücrete dönmez.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const highlighted = plan.key === 'pro';
          return (
            <div
              key={plan.key}
              className={`flex flex-col rounded-2xl border p-6 ${
                highlighted ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border bg-card'
              }`}
            >
              {highlighted && (
                <span className="mb-3 w-fit rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-white">
                  En çok tercih edilen
                </span>
              )}
              <h2 className="text-lg font-semibold text-foreground">{plan.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

              <p className="mt-5 text-3xl font-bold text-foreground">
                {plan.monthlyPrice === null ? (
                  'Bize ulaşın'
                ) : (
                  <>
                    {plan.monthlyPrice.toLocaleString('tr-TR')} ₺
                    <span className="text-base font-normal text-muted-foreground"> / ay</span>
                  </>
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {plan.userLimit === null ? 'Sınırsız kullanıcı' : `${plan.userLimit} kullanıcıya kadar`}
              </p>

              <ul className="mt-6 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
                {plan.lockedModules.includes('bordro') && (
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                    Bordro modülü dahil değil
                  </li>
                )}
              </ul>

              <Link
                href={plan.monthlyPrice === null ? '/iletisim' : '/kayit-ol'}
                className={`mt-6 w-full rounded-lg px-4 py-2.5 text-center text-sm font-medium transition ${
                  highlighted
                    ? 'bg-primary text-white hover:bg-secondary'
                    : 'border border-border text-foreground hover:bg-muted'
                }`}
              >
                {plan.monthlyPrice === null ? 'Bize ulaşın' : 'Ücretsiz denemeye başla'}
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold text-foreground">Sık sorulanlar</h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div>
            <dt className="font-medium text-foreground">Deneme süresi bitince ne olur?</dt>
            <dd className="mt-1 text-muted-foreground">
              Otomatik ücretlendirme yapılmaz. Bir plan seçmezseniz kayıtlarınızı görmeye ve dışa
              aktarmaya devam edersiniz; yalnızca yeni kayıt ekleyip düzenleyemezsiniz.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Planımı sonradan değiştirebilir miyim?</dt>
            <dd className="mt-1 text-muted-foreground">
              Evet, istediğiniz zaman yükseltip düşürebilirsiniz.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Muhasebecim de kullanıcı sayılır mı?</dt>
            <dd className="mt-1 text-muted-foreground">
              Evet, planınızdaki kullanıcı hakkından bir koltuk kullanır.
            </dd>
          </div>
        </dl>
        <Link href="/sss" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Tüm soruları görün
        </Link>
      </div>
    </div>
  );
}
