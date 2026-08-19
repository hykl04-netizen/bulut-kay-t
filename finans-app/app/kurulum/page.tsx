'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ArrowRight, ArrowLeft, Building2, Tags, Landmark, Loader2, Home, Users2, Calculator } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentWorkspaceId } from '@/lib/supabase/workspace';
import {
  getTemplate,
  templatesForType,
  defaultTemplateKey,
  insertCategories,
  createFirstBankAccount,
  completeOnboarding,
  setWorkspaceType,
} from '@/lib/onboarding';
import { WORKSPACE_TYPE_OPTIONS, type WorkspaceType } from '@/lib/workspace-types';
import { toast } from '@/components/ui/toaster';

/**
 * Faz 2 — kurulum sihirbazı.
 *
 * Yeni bir workspace'in `onboarded_at` alanı boş olduğu sürece dashboard
 * layout'u kullanıcıyı buraya yönlendirir. Üç adım:
 *   1) Hesap türü    → Faz 11: aile / işletme / müşavir ofisi.
 *                      Menünün ve kategori şablonlarının tamamını belirler.
 *   2) İşletme türü  → hazır kategori şablonu belirlenir
 *   3) Kategoriler   → şablon önizlenir, istenmeyenler çıkarılabilir
 *   4) Banka/kasa    → ilk hesap (atlanabilir)
 *
 * Hesap türü ADIM 1'de sorulur çünkü sonraki her adımın içeriğini o belirler:
 * aile seçen biri "Pazaryeri Komisyonu" kategorisi görmemeli.
 *
 * Sihirbaz, sol menü olmadan tam ekran çalışır (bilinçli olarak
 * app/(dashboard) grubunun DIŞINDA duruyor).
 */

type Step = 1 | 2 | 3 | 4;

export default function KurulumPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');

  const [step, setStep] = useState<Step>(1);
  const [workspaceType, setWorkspaceTypeState] = useState<WorkspaceType>('sirket');
  const [templateKey, setTemplateKey] = useState<string>('genel');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [balance, setBalance] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      const id = await getCurrentWorkspaceId(user.id);
      if (cancelled) return;

      const { data } = await supabase
        .from('workspaces')
        .select('name, type')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;

      const row = data as { name: string; type: string | null } | null;
      const existingType = (row?.type as WorkspaceType | null) ?? 'sirket';

      setWorkspaceId(id);
      setWorkspaceName(row?.name ?? 'Hesabım');
      setWorkspaceTypeState(existingType);
      setTemplateKey(defaultTemplateKey(existingType));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const template = getTemplate(templateKey);
  const selectedCategories = (template?.categories ?? []).filter((c) => !excluded.has(c.name));

  const toggleCategory = (name: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Şablon değişince önceki seçim dışı bırakmalar anlamını yitirir.
  const chooseTemplate = (key: string) => {
    setTemplateKey(key);
    setExcluded(new Set());
  };

  // Hesap türü değişince şablon listesi tamamen değişir.
  const chooseType = (type: WorkspaceType) => {
    setWorkspaceTypeState(type);
    setTemplateKey(defaultTemplateKey(type));
    setExcluded(new Set());
  };

  const visibleTemplates = templatesForType(workspaceType);

  const finish = async () => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      // Hesap türü önce yazılır: menü filtresi ve sonraki oturumlar buna bakar.
      await setWorkspaceType(workspaceId, workspaceType);

      // Şablonun tamamı değil, kullanıcının BIRAKTIĞI kategoriler eklenir.
      await insertCategories(workspaceId, selectedCategories);

      if (accountName.trim()) {
        const parsedBalance = Number(balance.replace(',', '.'));
        await createFirstBankAccount(workspaceId, {
          name: accountName,
          bankName,
          currentBalance: Number.isFinite(parsedBalance) ? parsedBalance : 0,
        });
      }

      await completeOnboarding(workspaceId);
      toast.success('Kurulum tamamlandı. İyi çalışmalar!');
      router.replace('/');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kurulum tamamlanamadı.');
      setSaving(false);
    }
  };

  const skipAll = async () => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      // Kurulum atlansa bile hesap türü kaydedilir — menünün doğru
      // filtrelenmesi için gereken tek bilgi bu.
      await setWorkspaceType(workspaceId, workspaceType);
      await completeOnboarding(workspaceId);
      router.replace('/');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'İşlem tamamlanamadı.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const steps = [
    { n: 1 as Step, label: 'Hesap türü', icon: Home },
    { n: 2 as Step, label: workspaceType === 'aile' ? 'Bütçe türü' : 'İşletme türü', icon: Building2 },
    { n: 3 as Step, label: 'Kategoriler', icon: Tags },
    { n: 4 as Step, label: 'Banka / Kasa', icon: Landmark },
  ];

  const TYPE_ICONS = { aile: Home, sirket: Users2, musavir_ofisi: Calculator } as const;

  return (
    <div className="min-h-screen bg-muted py-8 px-4">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">{workspaceName} kurulumu</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Birkaç adımda hazır olun — hepsini sonradan değiştirebilirsiniz.
          </p>
        </div>

        {/* Adım göstergesi */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const active = step === s.n;
            const done = step > s.n;
            return (
              <div key={s.n} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition ${ active ? 'bg-primary text-primary-foreground' : done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-card text-muted-foreground border border-border' }`}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  {s.label}
                </div>
                {i < steps.length - 1 && <div className="w-4 h-px bg-border" />}
              </div>
            );
          })}
        </div>

        <div className="bg-card rounded-2xl shadow-xl border border-border p-6 sm:p-8">
          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold text-foreground mb-1">Bu hesabı ne için kullanacaksınız?</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Seçiminiz menüyü belirler. Aile hesabında fatura kesme, cari ve bordro ekranları
                hiç görünmez. Sonradan hesap ayarlarından değiştirebilirsiniz.
              </p>
              <div className="space-y-2.5">
                {WORKSPACE_TYPE_OPTIONS.map((opt) => {
                  const Icon = TYPE_ICONS[opt.key];
                  const active = workspaceType === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => chooseType(opt.key)}
                      className={`w-full rounded-xl border p-4 text-left transition ${ active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted' }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Icon className="h-4.5 w-4.5 text-accent" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">{opt.label}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">{opt.description}</p>
                        </div>
                        {active && <Check className="h-5 w-5 shrink-0 text-primary" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-lg font-semibold text-foreground mb-1">
                {workspaceType === 'aile'
                  ? 'Hazır bütçe setiniz'
                  : 'İşletmeniz hangisine yakın?'}
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Seçiminize göre hazır bir gelir/gider kategori seti yükleyeceğiz.
              </p>
              <div className="space-y-2.5">
                {visibleTemplates.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => chooseTemplate(t.key)}
                    className={`w-full text-left rounded-xl border p-4 transition ${ templateKey === t.key ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted' }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{t.label}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>
                      </div>
                      {templateKey === t.key && <Check className="w-5 h-5 text-primary shrink-0" />}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && template && (
            <>
              <h2 className="text-lg font-semibold text-foreground mb-1">Başlangıç kategorileri</h2>
              <p className="text-sm text-muted-foreground mb-5">
                İstemediklerinizi çıkarabilirsiniz. Sonradan /kategoriler sayfasından yenilerini
                ekleyebilirsiniz.
              </p>
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {template.categories.map((c) => {
                  const on = !excluded.has(c.name);
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => toggleCategory(c.name)}
                      className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                        on ? 'border-border bg-background' : 'border-dashed border-border opacity-50'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="flex-1 text-left text-foreground">{c.name}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          c.type === 'gelir'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}
                      >
                        {c.type === 'gelir' ? 'Gelir' : 'Gider'}
                      </span>
                      {on && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {selectedCategories.length} kategori eklenecek.
              </p>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="text-lg font-semibold text-foreground mb-1">İlk banka veya kasa hesabınız</h2>
              <p className="text-sm text-muted-foreground mb-5">
                İsteğe bağlı — boş bırakıp geçebilirsiniz.
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="hesapAdi" className="block text-sm font-medium text-foreground mb-1">
                    Hesap Adı
                  </label>
                  <input
                    id="hesapAdi"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Örn. Ana Hesap, Kasa"
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label htmlFor="bankaAdi" className="block text-sm font-medium text-foreground mb-1">
                    Banka (isteğe bağlı)
                  </label>
                  <input
                    id="bankaAdi"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Örn. Ziraat Bankası"
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label htmlFor="bakiye" className="block text-sm font-medium text-foreground mb-1">
                    Güncel Bakiye (₺)
                  </label>
                  <input
                    id="bakiye"
                    inputMode="decimal"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
            </>
          )}

          {/* Gezinme */}
          <div className="flex items-center justify-between gap-3 mt-8 pt-5 border-t border-border">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as Step)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Geri
              </button>
            ) : (
              <button
                type="button"
                onClick={skipAll}
                disabled={saving}
                className="text-sm text-muted-foreground hover:text-foreground transition"
              >
                Kurulumu atla
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as Step)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
              >
                Devam
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition"
              >
                {saving ? 'Kaydediliyor...' : 'Kurulumu Tamamla'}
                {!saving && <Check className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
