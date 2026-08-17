/**
 * Faz 8 — yardım merkezi içeriği.
 *
 * İçerik bilinçli olarak koda gömüldü: ayrı bir CMS kurmak bu aşamada gereksiz
 * karmaşıklık. Makale eklemek için bu diziye bir kayıt eklemek yeterli —
 * /yardim ve /yardim/[slug] sayfaları otomatik günceller.
 *
 * Video eklemek isterseniz `videoUrl` alanını doldurun; makale sayfası
 * bağlantıyı gösterir (gömülü oynatıcı yerine bağlantı tercih edildi ki
 * üçüncü taraf izleme çerezi gelmesin).
 */

export interface HelpSection {
  heading?: string;
  paragraphs?: string[];
  steps?: string[];
  note?: string;
}

export interface HelpArticle {
  slug: string;
  title: string;
  summary: string;
  category: 'baslangic' | 'kayitlar' | 'fatura' | 'ekip' | 'hesap';
  videoUrl?: string;
  sections: HelpSection[];
}

export const HELP_CATEGORIES: { key: HelpArticle['category']; label: string }[] = [
  { key: 'baslangic', label: 'Başlangıç' },
  { key: 'kayitlar', label: 'Kayıtlar ve kategoriler' },
  { key: 'fatura', label: 'Fatura kesme' },
  { key: 'ekip', label: 'Ekip ve muhasebeci' },
  { key: 'hesap', label: 'Hesap ve abonelik' },
];

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: 'ilk-kurulum',
    title: 'İlk kurulumu tamamlama',
    summary: 'Kayıt sonrası çıkan üç adımlık sihirbazla dakikalar içinde başlayın.',
    category: 'baslangic',
    sections: [
      {
        paragraphs: [
          'Kayıt olduktan sonra ilk girişte kurulum sihirbazı açılır. Sihirbazı atlayabilirsiniz; ama hazır kategorilerle başlamak sonradan tek tek kategori eklemekten çok daha hızlıdır.',
        ],
      },
      {
        heading: 'Adımlar',
        steps: [
          'İşletme türünüzü seçin (Hizmet/Danışmanlık, E-ticaret, Perakende veya Genel).',
          'Yüklenecek kategorileri gözden geçirin; işinize uymayanları tek tıkla çıkarın.',
          'Varsa ilk banka veya kasa hesabınızı girin. Bu adım isteğe bağlıdır.',
        ],
      },
      {
        note: 'Sonradan yeni bir işletme açarsanız (sol menüdeki işletme seçici) o işletme için sihirbaz yeniden çalışır — her işletme kendi kategori setiyle başlar.',
      },
    ],
  },
  {
    slug: 'kategori-ekleme',
    title: 'Kategori ekleme ve düzenleme',
    summary: 'Gelir ve gider kayıtlarınızı anlamlı gruplara ayırın.',
    category: 'kayitlar',
    sections: [
      {
        heading: 'Yeni kategori eklemek',
        steps: [
          'Sol menüden Kategoriler sayfasını açın.',
          'Tür olarak Gelir ya da Gider seçin.',
          'Kategori adını yazıp bir renk seçin ve Ekle deyin.',
        ],
      },
      {
        heading: 'İpucu',
        paragraphs: [
          'Çok fazla kategori oluşturmak raporları okumayı zorlaştırır. 8–15 arası kategori çoğu küçük işletme için yeterlidir; ayrıntıyı kayıt açıklamasına yazabilirsiniz.',
        ],
      },
      {
        note: 'Kategori renkleri raporlardaki grafiklerde de kullanılır — birbirine yakın renkler seçmemeye çalışın.',
      },
    ],
  },
  {
    slug: 'gelir-gider-kaydi',
    title: 'Gelir ve gider kaydı girme',
    summary: 'Tek tek veya toplu olarak kayıt ekleme yolları.',
    category: 'kayitlar',
    sections: [
      {
        heading: 'Tek kayıt',
        steps: [
          'Gelir/Gider sayfasını açın ve Yeni Kayıt deyin.',
          'Tarih, tür, kategori ve tutarı girin.',
          'KDV dahil bir tutarı ayrıştırmak isterseniz formdaki KDV Hesapla aracını kullanın.',
        ],
      },
      {
        heading: 'Toplu kayıt',
        paragraphs: [
          'Excel ya da bir listeden kopyaladığınız satırları Toplu Yapıştır penceresine yapıştırabilirsiniz. Sistem sütunları eşleştirir, hatalı satırları ayrı gösterir ve yalnızca geçerli olanları ekler.',
        ],
      },
      {
        heading: 'Banka ekstresi',
        paragraphs: [
          'Banka Hesapları sayfasından CSV ekstre içe aktarabilirsiniz. İçe aktarırken bir varsayılan kategori seçerseniz kayıtlar doğrudan sınıflandırılmış gelir.',
        ],
      },
    ],
  },
  {
    slug: 'fatura-kesme',
    title: 'Nasıl fatura keserim?',
    summary: 'Cari kartı oluşturup kalem bazlı KDV hesaplı fatura üretin.',
    category: 'fatura',
    sections: [
      {
        heading: 'Önce cari',
        steps: [
          'Cariler sayfasından müşterinizi ekleyin.',
          'Ünvan zorunludur; vergi numarası ve adres fatura PDF’ine olduğu gibi yazdırılır.',
        ],
      },
      {
        heading: 'Faturayı oluşturmak',
        steps: [
          'Kesilen Faturalar sayfasından Yeni Fatura deyin. Fatura numarası otomatik üretilir.',
          'Cariyi, düzenleme ve vade tarihini seçin.',
          'Kalemleri girin. Birim fiyatlar KDV hariç yazılır; her satırın KDV oranı ayrı seçilebilir.',
          'Taslak olarak kaydedin veya doğrudan Gönderildi işaretleyin.',
          'PDF düğmesiyle markalı çıktıyı indirip müşterinize iletin.',
        ],
      },
      {
        heading: 'Durum takibi',
        paragraphs: [
          'Gönderilmiş bir faturanın vadesi geçtiğinde listede otomatik olarak Gecikti görünür — ayrıca bir işlem yapmanız gerekmez. Ödeme alınca Ödendi işaretleyin.',
        ],
      },
      {
        note: 'Bu faturalar resmi e-Fatura/e-Arşiv belgesi değildir; ticari/bilgilendirme amaçlı belgelerdir. İptal edilen fatura numaraları yeniden kullanılmaz.',
      },
    ],
  },
  {
    slug: 'muhasebeci-davet',
    title: 'Muhasebecimi nasıl davet ederim?',
    summary: 'Mali müşavirinize kendi girişini verin, aylık özeti otomatik gitsin.',
    category: 'ekip',
    sections: [
      {
        steps: [
          'Sol menüden Muhasebeci Erişimi sayfasını açın.',
          'Muhasebecinizin e-posta adresini yazıp Davet Gönder deyin.',
          'Davet e-postasındaki bağlantıdan şifresini belirleyip giriş yapar.',
        ],
      },
      {
        heading: 'Muhasebeci ne yapabilir?',
        paragraphs: [
          'Tüm kayıtlarınızı görebilir ve düzenleyebilir; ancak ekip yönetemez ve abonelik ayarlarınıza dokunamaz.',
        ],
      },
      {
        note: 'Muhasebeci de planınızdaki kullanıcı hakkından bir koltuk kullanır. Her ayın başında ona bir önceki ayın özeti otomatik e-postayla gider.',
      },
    ],
  },
  {
    slug: 'ikinci-isletme',
    title: 'İkinci bir işletme eklemek',
    summary: 'Birden fazla şirketi tek hesapla, verileri karıştırmadan yönetin.',
    category: 'hesap',
    sections: [
      {
        steps: [
          'Sol menünün üstündeki işletme adına tıklayın.',
          'Yeni işletme adını yazıp Yeni İşletme Ekle deyin.',
          'Açılan kurulum sihirbazıyla o işletmenin kategorilerini seçin.',
        ],
      },
      {
        heading: 'Veriler karışır mı?',
        paragraphs: [
          'Hayır. Her işletmenin verisi veritabanı seviyesinde ayrıdır; bir işletmede açtığınız kayıt diğerinde hiçbir koşulda görünmez. Aynı menüden işletmeler arasında geçiş yapabilirsiniz.',
        ],
      },
    ],
  },
  {
    slug: 'abonelik-ve-deneme',
    title: 'Deneme süresi ve abonelik',
    summary: 'Deneme bitince ne olur, plan nasıl değişir?',
    category: 'hesap',
    sections: [
      {
        paragraphs: [
          'Her yeni işletme 14 gün boyunca Pro planın tüm özellikleriyle açılır. Kart bilgisi istenmez ve deneme kendiliğinden ücretli aboneliğe dönmez.',
        ],
      },
      {
        heading: 'Deneme bitince',
        paragraphs: [
          'Hiçbir kaydınız silinmez. Bir plan seçmezseniz verilerinizi görmeye ve dışa aktarmaya devam edersiniz; yalnızca yeni kayıt ekleyip düzenleyemezsiniz. Panelin üstünde bunu açıklayan bir uyarı görürsünüz.',
        ],
      },
      {
        heading: 'Ödeme alınamazsa',
        paragraphs: [
          'Hemen kapatılmazsınız. Birkaç günlük tolerans süresi boyunca erişiminiz tam olarak devam eder; bu sürede ödeme bilginizi güncelleyebilirsiniz.',
        ],
      },
    ],
  },
  {
    slug: 'yedekleme',
    title: 'Verilerimi nasıl yedeklerim?',
    summary: 'Manuel indirme ve otomatik haftalık/aylık yedekleme.',
    category: 'hesap',
    sections: [
      {
        heading: 'Manuel yedek',
        steps: ['Sol menünün altındaki Yedek Al düğmesine tıklayın.', 'Yedek dosyası cihazınıza iner.'],
      },
      {
        heading: 'Otomatik yedek',
        steps: [
          'Şirket Ayarları sayfasını açın.',
          'Otomatik Yedekleme bölümünden Haftalık veya Aylık seçin.',
          'Oluşan yedekleri aynı bölümden indirebilirsiniz.',
        ],
      },
    ],
  },
];

export function getArticle(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}
