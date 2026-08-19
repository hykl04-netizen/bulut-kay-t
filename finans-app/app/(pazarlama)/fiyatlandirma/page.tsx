'use client';

import Link from 'next/link';
import { Check, Lock, Home, Building2, Calculator } from 'lucide-react';
import { PLANS, TRIAL_DAYS, AILE_PAKETI, MUSAVIR_PAKETI } from '@/lib/plans';

/**
 * Herkese açık fiyatlandırma sayfası.
 *
 * YAPISI NEDEN BÖYLE: üç persona üç farklı satış biçimiyle satılıyor —
 * aile ücretsiz, işletme kademeli, müşavir mükellef başına. Bunları tek
 * bir 3×3 tabloya sıkıştırmak dokuz kutuluk bir ızgara üretiyordu; KOBİ
 * SaaS'ında dönüşümü en çok düşüren şey okunamayan fiyat sayfası.
 * Gerekçenin tamamı lib/plans.ts'te.
 *
 * Plan bilgileri lib/plans.ts'ten okunuyor — uygulama içindeki /abonelik
 * sayfasıyla tek kaynaktan besleniyor.
 *
 * NOT: Fiyatlar hâlâ yer tutucu; ödeme sağlayıcısı seçilince güncellenecek.
 */
export default function FiyatlandirmaPage() {
  const tl = (n: number) => `${n.toLocaleString('tr-TR')} ₺`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Fiyatlandırma</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Aile bütçesi tarafı tamamen ücretsiz. İşletme ve mali müşavir planları {TRIAL_DAYS} gün
          ücretsiz denemeyle başlar — kart bilgisi istemiyoruz, deneme kendiliğinden ücrete dönmez.
        </p>
      </div>

      {/* AİLE — ücretsiz. Fiyat merdiveninin dışında, ayrı bir şeritte
          duruyor ki "hangi kademeyi almalıyım" sorusunu hiç doğurmasın. */}
      <section className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Home aria-hidden className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              <h2 className="text-lg font-semibold text-foreground">{AILE_PAKETI.label}</h2>
              <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-medium text-white">
                Ücretsiz
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{AILE_PAKETI.tagline}</p>
          </div>
          <Link
            href="/kayit-ol"
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Ücretsiz başla
          </Link>
        </div>

        <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {AILE_PAKETI.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-foreground">
              <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">{AILE_PAKETI.note}</p>
      </section>

      {/* İŞLETME — kademeli. Kullanıcı sayısı ve modül derinliği gerçekten
          farklılaştığı için burada kademe doğru eksen. */}
      <section className="mt-12">
        <div className="flex items-center gap-2">
          <Building2 aria-hidden className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">İşletmeniz için</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Fatura kesme, cari hesaplar, alacak takibi, bordro ve nakit akışı.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const highlighted = plan.key === 'pro';
            return (
              <div
                key={plan.key}
                className={`flex flex-col rounded-2xl border p-6 ${highlighted ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card'}`}
              >
                {highlighted && (
                  <span className="mb-3 w-fit rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground">
                    En çok tercih edilen
                  </span>
                )}
                <h3 className="text-lg font-semibold text-foreground">{plan.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

                <p className="mt-5 text-3xl font-bold text-foreground">
                  {plan.monthlyPrice === null ? (
                    'Bize ulaşın'
                  ) : (
                    <>
                      {tl(plan.monthlyPrice)}
                      <span className="text-base font-normal text-muted-foreground"> / ay</span>
                    </>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.userLimit === null
                    ? 'Sınırsız kullanıcı'
                    : `${plan.userLimit} kullanıcıya kadar`}
                </p>

                <ul className="mt-6 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    Aile bütçesi hesabı dahil
                  </li>
                  {plan.lockedModules.includes('bordro') && (
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Lock aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                      Bordro modülü dahil değil
                    </li>
                  )}
                </ul>

                <Link
                  href={plan.monthlyPrice === null ? '/iletisim' : '/kayit-ol'}
                  className={`mt-6 w-full rounded-lg px-4 py-2.5 text-center text-sm font-medium transition ${highlighted ? 'bg-primary text-primary-foreground hover:opacity-90' : 'border border-border text-foreground hover:bg-muted'}`}
                >
                  {plan.monthlyPrice === null ? 'Bize ulaşın' : 'Ücretsiz denemeye başla'}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* MÜŞAVİR — mükellef başına. Kademe burada yanlış eksen olurdu:
          8 mükellefli ofisle 80 mükellefli ofis aynı ürünü kullanmıyor. */}
      <section className="mt-12 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Calculator aria-hidden className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">{MUSAVIR_PAKETI.label}</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{MUSAVIR_PAKETI.tagline}</p>
          </div>
          <Link
            href="/kayit-ol"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Ücretsiz denemeye başla
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-3xl font-bold text-foreground">
            {tl(MUSAVIR_PAKETI.basePrice)}
            <span className="text-base font-normal text-muted-foreground"> / ay</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {MUSAVIR_PAKETI.includedClients} mükellef dahil · sonrası mükellef başına{' '}
            <strong className="font-medium text-foreground">
              {tl(MUSAVIR_PAKETI.perClientPrice)}
            </strong>{' '}
            / ay
          </p>
        </div>

        <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {MUSAVIR_PAKETI.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-foreground">
              <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              {f}
            </li>
          ))}
          <li className="flex items-start gap-2 text-sm text-foreground">
            <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            Aile bütçesi hesabı dahil
          </li>
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Mükellef sayınız ay içinde değişirse fark bir sonraki döneme yansır.
        </p>
      </section>

      <div className="mt-12 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold text-foreground">Sık sorulanlar</h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div>
            <dt className="font-medium text-foreground">Aile hesabı gerçekten ücretsiz mi?</dt>
            <dd className="mt-1 text-muted-foreground">
              Evet. Süre sınırı yok, kart bilgisi istemiyoruz ve deneme bitince kilitlenmiyor.
              Ücretli bir işletme ya da müşavir planınız varsa aile hesabınız da o planın
              özelliklerine yükselir.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Deneme süresi bitince ne olur?</dt>
            <dd className="mt-1 text-muted-foreground">
              Otomatik ücretlendirme yapılmaz. Bir plan seçmezseniz kayıtlarınızı görmeye ve dışa
              aktarmaya devam edersiniz; yalnızca yeni kayıt ekleyip düzenleyemezsiniz. Aile
              hesabınız bundan etkilenmez.
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
              Evet, işletme planınızdaki kullanıcı hakkından bir koltuk kullanır. Aile
              hesaplarına muhasebeci eklenemez.
            </dd>
          </div>
        </dl>
        <Link
          href="/sss"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Tüm soruları görün
        </Link>
      </div>
    </div>
  );
}
