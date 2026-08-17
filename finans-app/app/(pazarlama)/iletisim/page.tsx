import Link from 'next/link';
import type { Metadata } from 'next';
import { Mail, LifeBuoy, Building2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'İletişim — FinansApp',
  description: 'Sorularınız, demo talepleriniz ve destek için bize ulaşın.',
};

/**
 * Faz 7 — iletişim sayfası.
 *
 * Bilinçli olarak form yerine doğrudan e-posta bağlantısı kullanıldı: form
 * eklemek ayrıca spam koruması, sunucu route'u ve e-posta gönderimi gerektirir;
 * bu aşamada `mailto:` yeterli ve hiçbir şey bozulmaz. E-posta altyapısı
 * (lib/email.ts) yapılandırıldıktan sonra istenirse gerçek forma çevrilebilir.
 *
 * [DESTEK E-POSTASI] alanlarını kendi adresinizle değiştirin.
 */

const DESTEK_EPOSTA = 'destek@finansapp.com';

export default function IletisimPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">İletişim</h1>
      <p className="mt-3 text-muted-foreground">
        Sorularınızı, demo taleplerinizi ve geri bildirimlerinizi bekliyoruz. Genellikle bir iş
        günü içinde dönüyoruz.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <a
          href={`mailto:${DESTEK_EPOSTA}?subject=${encodeURIComponent('FinansApp — Soru')}`}
          className="rounded-2xl border border-border bg-card p-6 transition hover:bg-muted/40"
        >
          <Mail className="h-6 w-6 text-accent" />
          <h2 className="mt-3 font-semibold text-foreground">Genel sorular</h2>
          <p className="mt-1 text-sm text-muted-foreground">{DESTEK_EPOSTA}</p>
        </a>

        <a
          href={`mailto:${DESTEK_EPOSTA}?subject=${encodeURIComponent('FinansApp — Kurumsal plan / demo talebi')}`}
          className="rounded-2xl border border-border bg-card p-6 transition hover:bg-muted/40"
        >
          <Building2 className="h-6 w-6 text-accent" />
          <h2 className="mt-3 font-semibold text-foreground">Kurumsal plan ve demo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sınırsız kullanıcı, öncelikli destek ve özel ihtiyaçlar için yazın.
          </p>
        </a>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <LifeBuoy className="h-6 w-6 text-accent" />
        <h2 className="mt-3 font-semibold text-foreground">Önce buraya bakın</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Çoğu sorunun yanıtı{' '}
          <Link href="/yardim" className="text-primary hover:underline">
            yardım merkezinde
          </Link>{' '}
          ve{' '}
          <Link href="/sss" className="text-primary hover:underline">
            sık sorulan sorularda
          </Link>{' '}
          var.
        </p>
      </div>

      <div className="mt-10 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">[ŞİRKET UNVANI]</strong>
          <br />
          [ADRES]
          <br />
          Vergi Dairesi / No: [VERGİ DAİRESİ / NO]
          <br />
          MERSİS: [MERSİS NO]
        </p>
      </div>
    </div>
  );
}
