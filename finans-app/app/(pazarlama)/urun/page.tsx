import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRightLeft,
  Receipt,
  FilePlus2,
  Landmark,
  BarChart3,
  Users,
  ShieldCheck,
  Smartphone,
  ArrowRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'FinansApp — Küçük işletmeler için finans yönetimi',
  description:
    'Gelir/gider, fatura, borç-alacak, bordro ve raporlar tek panelde. 14 gün ücretsiz deneyin, kart bilgisi istemiyoruz.',
};

const FEATURES = [
  {
    icon: ArrowRightLeft,
    title: 'Gelir ve gider takibi',
    body: 'Kategorili kayıt, tekrarlayan işlemler ve banka ekstresinden toplu içe aktarma.',
  },
  {
    icon: FilePlus2,
    title: 'Fatura kesme',
    body: 'Cari kartları, kalem bazlı KDV hesabı ve markalı PDF fatura çıktısı.',
  },
  {
    icon: Receipt,
    title: 'Gelen fatura ve masraf',
    body: 'Vadesi yaklaşan ödemeler, fiş fotoğrafından otomatik okuma ve arşiv.',
  },
  {
    icon: Landmark,
    title: 'Banka, yatırım ve varlıklar',
    body: 'Hesap bakiyeleri, döviz ve yatırım araçlarının güncel değeriyle takibi.',
  },
  {
    icon: BarChart3,
    title: 'Raporlar',
    body: 'Nakit akışı, kategori dağılımı ve bütçe aşımı uyarıları; PDF/Excel dışa aktarma.',
  },
  {
    icon: Users,
    title: 'Ekip ve muhasebeci',
    body: 'Rol bazlı erişim; mali müşavirinize kendi girişini verin, aylık özeti otomatik gitsin.',
  },
];

export default function UrunPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-accent">Küçük işletmeler için</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-foreground sm:text-5xl">
            İşletmenizin parasını tek panelden yönetin
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Gelir, gider, fatura, borç-alacak, bordro ve raporlar bir arada. Excel tablolarını ve
            dağınık dosyaları bırakın; muhasebecinizle aynı ekrana bakın.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/kayit-ol"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-secondary transition"
            >
              14 gün ücretsiz deneyin
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/fiyatlandirma"
              className="inline-flex items-center rounded-lg border border-border px-6 py-3 font-medium text-foreground hover:bg-muted transition"
            >
              Fiyatları gör
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Kart bilgisi istemiyoruz.</p>
        </div>
      </section>

      {/* Özellikler */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-foreground">Neler yapabilirsiniz</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-2xl border border-border bg-card p-5">
                  <Icon className="h-6 w-6 text-accent" />
                  <h3 className="mt-3 font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Güven */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-border p-6">
            <ShieldCheck className="h-6 w-6 text-accent" />
            <h3 className="mt-3 font-semibold text-foreground">Veriniz size ait</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Her işletmenin verisi veritabanı seviyesinde birbirinden yalıtılmıştır. Aboneliğiniz
              biterse kayıtlarınızı okumaya ve dışa aktarmaya devam edebilirsiniz — verinizi rehin
              tutmuyoruz.
            </p>
          </div>
          <div className="rounded-2xl border border-border p-6">
            <Smartphone className="h-6 w-6 text-accent" />
            <h3 className="mt-3 font-semibold text-foreground">Telefonda da çalışır</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Tarayıcıdan &quot;ana ekrana ekle&quot; deyip uygulama gibi kullanabilirsiniz; ayrı
              bir kurulum gerekmez.
            </p>
          </div>
        </div>
      </section>

      {/* Kapanış */}
      <section className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-12 sm:px-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Bugün kurmaya başlayın</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Kayıt olun, işletme türünüzü seçin, hazır kategorilerle dakikalar içinde başlayın.
            </p>
          </div>
          <Link
            href="/kayit-ol"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-secondary transition"
          >
            Ücretsiz hesap oluştur
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
