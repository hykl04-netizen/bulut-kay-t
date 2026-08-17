import type { Metadata } from 'next';
import { HukukiTaslakUyarisi } from '../hukuki-taslak-uyarisi';

export const metadata: Metadata = {
  title: 'Kullanım Şartları — FinansApp',
  description: 'FinansApp hizmetinin kullanım koşulları, abonelik ve sorumluluk esasları.',
};

export default function KullanimSartlariPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Kullanım Şartları</h1>
      <p className="mt-2 text-sm text-muted-foreground">Son güncelleme: [TARİH]</p>

      <div className="mt-8">
        <HukukiTaslakUyarisi />
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="text-lg font-semibold">1. Taraflar ve Kapsam</h2>
          <p className="mt-2 text-muted-foreground">
            Bu şartlar, <strong className="text-foreground">[ŞİRKET UNVANI]</strong> (&quot;FinansApp&quot;)
            tarafından sunulan çevrimiçi finans yönetimi hizmetinin kullanımını düzenler. Hesap
            oluşturarak bu şartları kabul etmiş sayılırsınız.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Hesap ve Sorumluluk</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Hesap bilgilerinizin gizliliğinden ve hesabınız üzerinden yapılan işlemlerden siz sorumlusunuz.</li>
            <li>Girdiğiniz verilerin doğruluğu size aittir.</li>
            <li>İşletmenize davet ettiğiniz kullanıcıların erişim yetkisini yönetmek sizin sorumluluğunuzdadır.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Hizmetin Niteliği — Önemli Uyarı</h2>
          <p className="mt-2 text-muted-foreground">
            FinansApp bir <strong className="text-foreground">kayıt ve takip aracıdır</strong>; mali
            müşavirlik, muhasebe, vergi veya yatırım danışmanlığı hizmeti değildir. Uygulamadaki
            hesaplamalar, raporlar ve uyarılar bilgilendirme amaçlıdır; resmi beyan, vergi
            hesaplaması veya yatırım kararı için tek başına esas alınmamalıdır. Mali ve hukuki
            konularda yetkili bir uzmana danışmanız gerekir.
          </p>
          <p className="mt-2 text-muted-foreground">
            Uygulama içinde oluşturulan faturalar{' '}
            <strong className="text-foreground">resmi e-Fatura/e-Arşiv belgesi değildir</strong>;
            ticari/bilgilendirme amaçlı belgelerdir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Abonelik, Deneme ve Ödeme</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Yeni işletmeler [SÜRE] günlük ücretsiz deneme ile başlar; deneme kendiliğinden ücretli aboneliğe dönüşmez.</li>
            <li>Ücretli abonelikler [DÖNEM] olarak faturalandırılır ve iptal edilene kadar yenilenir.</li>
            <li>Ödeme alınamazsa kısa bir tolerans süresi tanınır; sonrasında yeni kayıt ekleme/düzenleme durur.</li>
            <li><strong className="text-foreground">Abonelik sona erse dahi mevcut verilerinizi görüntülemeye ve dışa aktarmaya devam edebilirsiniz.</strong></li>
            <li>İade koşulları: [İADE POLİTİKASI].</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Kabul Edilmeyen Kullanım</h2>
          <p className="mt-2 text-muted-foreground">
            Hizmeti hukuka aykırı amaçlarla kullanmak, başkalarının verilerine yetkisiz erişmeye
            çalışmak, sistemin işleyişini bozacak yükler oluşturmak veya tersine mühendislik yapmak
            yasaktır.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Hizmet Sürekliliği</h2>
          <p className="mt-2 text-muted-foreground">
            Hizmetin kesintisiz olması için makul çaba gösterilir; ancak bakım, altyapı sağlayıcısı
            kaynaklı arıza veya mücbir sebep hâllerinde kesinti yaşanabilir. Planlı bakımlar önceden
            duyurulmaya çalışılır.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Sorumluluğun Sınırı</h2>
          <p className="mt-2 text-muted-foreground">
            Yürürlükteki mevzuatın izin verdiği ölçüde, FinansApp&apos;in toplam sorumluluğu, talebin
            doğduğu tarihten önceki [SÜRE] içinde ödediğiniz abonelik bedeliyle sınırlıdır. Dolaylı
            zararlar ve kâr kaybı kapsam dışındadır.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">8. Fesih</h2>
          <p className="mt-2 text-muted-foreground">
            Hesabınızı dilediğiniz zaman kapatabilirsiniz. Bu şartların ihlali hâlinde hizmet
            erişiminiz askıya alınabilir veya sonlandırılabilir; bu durumda verilerinizi dışa
            aktarmanız için makul bir süre tanınır.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">9. Değişiklikler ve Uygulanacak Hukuk</h2>
          <p className="mt-2 text-muted-foreground">
            Şartlarda değişiklik yapılması hâlinde önemli değişiklikler e-posta veya uygulama içi
            bildirimle duyurulur. Bu şartlara Türkiye Cumhuriyeti hukuku uygulanır;
            uyuşmazlıklarda [YETKİLİ MAHKEME/İCRA DAİRELERİ] yetkilidir.
          </p>
        </section>
      </div>
    </div>
  );
}
