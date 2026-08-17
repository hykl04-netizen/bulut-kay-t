import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sık Sorulan Sorular — FinansApp',
  description: 'FinansApp hakkında en çok merak edilenler: deneme süresi, veri güvenliği, faturalama.',
};

const GROUPS: { title: string; items: { q: string; a: React.ReactNode }[] }[] = [
  {
    title: 'Başlangıç',
    items: [
      {
        q: 'Ücretsiz deneme nasıl çalışıyor?',
        a: 'Kayıt olduğunuzda işletmeniz 14 gün boyunca Pro planın tüm özellikleriyle açılır. Kart bilgisi istemiyoruz ve deneme kendiliğinden ücretli aboneliğe dönmez.',
      },
      {
        q: 'Kurulum ne kadar sürer?',
        a: 'Kayıt sonrası üç adımlık bir sihirbaz çıkar: işletme türünüzü seçersiniz, size uygun hazır gelir/gider kategorileri yüklenir, isterseniz ilk banka hesabınızı eklersiniz. Birkaç dakika sürer.',
      },
      {
        q: 'Mevcut verilerimi aktarabilir miyim?',
        a: 'Banka ekstrenizi CSV olarak içe aktarabilir, gelir/gider ve fatura kayıtlarını toplu yapıştırma ekranından tablo halinde ekleyebilirsiniz.',
      },
    ],
  },
  {
    title: 'Planlar ve ödeme',
    items: [
      {
        q: 'Deneme bitince verilerime ne olur?',
        a: 'Hiçbir şey silinmez. Bir plan seçmezseniz kayıtlarınızı görmeye ve dışa aktarmaya devam edersiniz; yalnızca yeni kayıt ekleyip düzenleyemezsiniz.',
      },
      {
        q: 'Planımı değiştirebilir veya iptal edebilir miyim?',
        a: 'Evet, istediğiniz zaman. İptal ettiğinizde dönem sonuna kadar kullanmaya devam edersiniz.',
      },
      {
        q: 'Muhasebecim de kullanıcı sayılıyor mu?',
        a: 'Evet. Muhasebeci de planınızdaki kullanıcı hakkından bir koltuk kullanır.',
      },
      {
        q: 'Ödemem alınamazsa hemen kapanır mıyım?',
        a: 'Hayır. Önce bir uyarı gösterilir ve birkaç günlük tolerans süresi tanınır; bu sürede erişiminiz tam olarak devam eder.',
      },
    ],
  },
  {
    title: 'Özellikler',
    items: [
      {
        q: 'Kestiğim faturalar resmi e-Fatura mı?',
        a: (
          <>
            Hayır. Uygulama, markalı PDF olarak indirebileceğiniz ticari fatura üretir. Resmi
            e-Fatura/e-Arşiv, GİB onaylı bir entegratörle çalışmayı gerektirir ve şu an
            kapsam dışındadır.
          </>
        ),
      },
      {
        q: 'Birden fazla işletmem var, hepsini takip edebilir miyim?',
        a: 'Evet. Sol menüdeki işletme seçiciden yeni işletme açıp aralarında geçiş yapabilirsiniz. Her işletmenin verisi tamamen ayrıdır.',
      },
      {
        q: 'Telefonda kullanabilir miyim?',
        a: 'Evet. Tarayıcıdan açıp "ana ekrana ekle" derseniz uygulama gibi çalışır; ayrı bir kurulum gerekmez.',
      },
    ],
  },
  {
    title: 'Güvenlik',
    items: [
      {
        q: 'Verilerim ne kadar güvende?',
        a: 'Her işletmenin verisi veritabanı seviyesinde satır bazlı güvenlik politikalarıyla yalıtılmıştır — bir işletmenin kullanıcısı başka bir işletmenin kaydını hiçbir koşulda göremez. Bağlantılar TLS ile şifrelenir.',
      },
      {
        q: 'Kart bilgilerim saklanıyor mu?',
        a: 'Hayır. Ödeme bilgileri yalnızca ödeme sağlayıcısı tarafından işlenir; bizim sunucularımızda kart verisi tutulmaz.',
      },
      {
        q: 'Yedek alabiliyor muyum?',
        a: 'Evet. İstediğiniz an manuel yedek indirebilir, haftalık veya aylık otomatik yedeklemeyi açabilirsiniz.',
      },
    ],
  },
];

export default function SssPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Sık sorulan sorular</h1>
      <p className="mt-3 text-muted-foreground">
        Aradığınızı bulamadıysanız{' '}
        <Link href="/iletisim" className="text-primary hover:underline">
          bize yazın
        </Link>
        .
      </p>

      <div className="mt-10 space-y-10">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </h2>
            <dl className="mt-4 divide-y divide-border rounded-2xl border border-border">
              {group.items.map((item) => (
                <div key={item.q} className="p-5">
                  <dt className="font-medium text-foreground">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
