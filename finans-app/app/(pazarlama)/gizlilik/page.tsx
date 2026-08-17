import type { Metadata } from 'next';
import { HukukiTaslakUyarisi } from '../hukuki-taslak-uyarisi';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası ve KVKK Aydınlatma Metni — FinansApp',
  description: 'Kişisel verilerinizin nasıl işlendiği, saklandığı ve korunduğu hakkında bilgi.',
};

export default function GizlilikPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Gizlilik Politikası ve KVKK Aydınlatma Metni</h1>
      <p className="mt-2 text-sm text-muted-foreground">Son güncelleme: [TARİH]</p>

      <div className="mt-8">
        <HukukiTaslakUyarisi />
      </div>

      <div className="prose-sm space-y-6 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="text-lg font-semibold">1. Veri Sorumlusu</h2>
          <p className="mt-2 text-muted-foreground">
            6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca veri
            sorumlusu: <strong className="text-foreground">[ŞİRKET UNVANI]</strong>, [ADRES],
            Vergi Dairesi/No: [VERGİ DAİRESİ / NO], iletişim: [E-POSTA].
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. İşlenen Kişisel Veriler</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li><strong className="text-foreground">Kimlik ve iletişim:</strong> ad-soyad, e-posta adresi, işletme adı.</li>
            <li><strong className="text-foreground">Hesap güvenliği:</strong> şifre özeti (hash), oturum ve cihaz bilgisi, IP adresi.</li>
            <li><strong className="text-foreground">İşletme verisi:</strong> gelir/gider kayıtları, fatura ve cari bilgileri, banka hesap adları ve bakiyeleri, bordro kayıtları, yüklediğiniz belgeler.</li>
            <li><strong className="text-foreground">Ödeme:</strong> abonelik durumu ve fatura geçmişi. <strong className="text-foreground">Kart bilgileriniz tarafımızca saklanmaz</strong>; ödeme sağlayıcısı [ÖDEME SAĞLAYICISI] tarafından işlenir.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. İşleme Amaçları ve Hukuki Sebep</h2>
          <p className="mt-2 text-muted-foreground">
            Verileriniz; hizmetin sunulması, hesabınızın oluşturulması ve güvenliğinin sağlanması,
            abonelik ve faturalandırma süreçlerinin yürütülmesi, destek taleplerinin karşılanması ve
            yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenir. Hukuki sebep, KVKK m.5/2-(c)
            (sözleşmenin kurulması/ifası), m.5/2-(ç) (hukuki yükümlülük) ve m.5/2-(f) (meşru menfaat)
            hükümleridir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Aktarım</h2>
          <p className="mt-2 text-muted-foreground">
            Verileriniz, hizmetin sunulabilmesi için aşağıdaki hizmet sağlayıcılara aktarılabilir:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Barındırma ve veritabanı: [BARINDIRMA SAĞLAYICISI] — sunucu konumu: [BÖLGE]</li>
            <li>Ödeme: [ÖDEME SAĞLAYICISI]</li>
            <li>E-posta gönderimi: [E-POSTA SAĞLAYICISI]</li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            Yurt dışına aktarım söz konusu olduğunda KVKK m.9 kapsamındaki şartlara uyulur.
            <strong className="text-foreground"> [Bu bölüm, kullandığınız sağlayıcıların gerçek konumuna göre hukukçuyla netleştirilmelidir.]</strong>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Saklama Süresi</h2>
          <p className="mt-2 text-muted-foreground">
            Hesabınız aktif olduğu sürece veriler saklanır. Hesap silme talebinizden sonra, ilgili
            mevzuattan doğan saklama yükümlülükleri saklı kalmak üzere [SÜRE] içinde silinir veya
            anonim hale getirilir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Veri Güvenliği</h2>
          <p className="mt-2 text-muted-foreground">
            Veriler aktarım sırasında TLS ile şifrelenir. Her işletmenin verisi veritabanı seviyesinde
            satır bazlı güvenlik politikalarıyla (RLS) birbirinden yalıtılmıştır; bir işletmenin
            kullanıcısı başka bir işletmenin kaydına erişemez. Şifreler geri döndürülemez şekilde
            özetlenerek saklanır.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Çerezler</h2>
          <p className="mt-2 text-muted-foreground">
            Yalnızca hizmetin çalışması için zorunlu çerezler kullanılır: oturum çerezi ve seçili
            işletme tercihi (<code>finansapp_workspace_id</code>). Reklam veya üçüncü taraf takip
            çerezi kullanılmaz.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">8. Haklarınız</h2>
          <p className="mt-2 text-muted-foreground">
            KVKK m.11 uyarınca; verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme,
            düzeltilmesini veya silinmesini isteme, işlemenin sınırlandırılmasını talep etme ve
            zarara uğramanız hâlinde tazminat isteme haklarına sahipsiniz. Taleplerinizi [E-POSTA]
            adresine iletebilirsiniz; en geç 30 gün içinde yanıtlanır.
          </p>
        </section>
      </div>
    </div>
  );
}
