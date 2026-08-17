'use client';

import Link from 'next/link';
import { Check, Lock, AlertTriangle, Clock, Sparkles } from 'lucide-react';
import { useSubscription } from '@/lib/use-subscription';
import {
  PLANS,
  STATUS_LABELS,
  TRIAL_DAYS,
  accessState,
  effectivePlan,
  getPlan,
  trialDaysLeft,
} from '@/lib/plans';

/**
 * Faz 3 — abonelik / faturalandırma sayfası.
 *
 * Ödeme sağlayıcısı (iyzico veya Stripe) henüz seçilmediği için "Yükselt"
 * düğmeleri şimdilik pasif. Sağlayıcı bağlandığında bu düğmeler
 * `/api/abonelik/odeme-basiat` route'una gidip sağlayıcının ödeme sayfasına
 * yönlendirecek; abonelik durumu webhook üzerinden güncellenecek.
 */
export default function AbonelikPage() {
  const { subscription, loading } = useSubscription();

  if (loading) {
    return <p className="text-muted-foreground">Yükleniyor...</p>;
  }

  const current = effectivePlan(subscription);
  const state = accessState(subscription);
  const daysLeft = trialDaysLeft(subscription);
  const currentPlan = getPlan(current);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Abonelik</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Planınızı görüntüleyin ve işletmenize uygun pakete geçin.
        </p>
      </div>

      {/* Mevcut durum */}
      <div className="rounded-2xl border border-border bg-card p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Mevcut plan</p>
            <p className="text-xl font-semibold text-foreground mt-0.5">{currentPlan.label}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              state === 'aktif'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                : state === 'deneme'
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400'
                  : state === 'tolerans'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
            }`}
          >
            {subscription ? STATUS_LABELS[subscription.status] : 'Aktif'}
          </span>
        </div>

        {state === 'deneme' && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            Ücretsiz denemenizin bitmesine <strong className="text-foreground">{daysLeft} gün</strong> kaldı.
            Deneme süresince tüm Pro özellikleri açık.
          </p>
        )}

        {state === 'tolerans' && (
          <p className="mt-3 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            Son ödemeniz alınamadı. Kısa bir süre daha tam erişiminiz var — kart bilgilerinizi
            güncellerseniz kesinti yaşanmaz.
          </p>
        )}

        {state === 'kisitli' && (
          <p className="mt-3 flex items-start gap-2 text-sm text-rose-700 dark:text-rose-400">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            Aboneliğiniz sona erdi. <strong>Verileriniz duruyor ve okunabilir</strong>, ancak yeni
            kayıt ekleyip düzenleyemezsiniz. Bir plan seçerek kaldığınız yerden devam edebilirsiniz.
          </p>
        )}
      </div>

      {/* Planlar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === current;
          return (
            <div
              key={plan.key}
              className={`rounded-2xl border p-5 flex flex-col ${
                isCurrent ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border bg-card'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-foreground">{plan.label}</h2>
                {isCurrent && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-white">
                    Mevcut
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{plan.tagline}</p>

              <p className="mt-4 text-2xl font-bold text-foreground">
                {plan.monthlyPrice === null ? (
                  'Bize ulaşın'
                ) : (
                  <>
                    {plan.monthlyPrice.toLocaleString('tr-TR')} ₺
                    <span className="text-sm font-normal text-muted-foreground"> / ay</span>
                  </>
                )}
              </p>

              <ul className="mt-4 space-y-1.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
                {plan.lockedModules.includes('bordro') && (
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                    Bordro modülü dahil değil
                  </li>
                )}
              </ul>

              <button
                type="button"
                disabled
                title="Ödeme sağlayıcısı entegrasyonu tamamlanınca aktif olacak."
                className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCurrent ? 'Mevcut planınız' : 'Yakında'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-border bg-card/50 p-4">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Her yeni işletme <strong className="text-foreground">{TRIAL_DAYS} gün ücretsiz</strong>{' '}
            Pro denemesiyle başlar; kart bilgisi istenmez. Ödeme altyapısı bağlanana kadar plan
            değişiklikleri devre dışıdır — sorularınız için{' '}
            <Link href="/ayarlar" className="text-primary hover:underline">
              şirket ayarlarından
            </Link>{' '}
            bize ulaşabilirsiniz.
          </span>
        </p>
      </div>
    </div>
  );
}
