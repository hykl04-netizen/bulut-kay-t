# Faz 9 — PWA'yı Google Play'e Taşıma (TWA)

Bu rehber, mevcut PWA'yı **Trusted Web Activity (TWA)** olarak paketleyip
Google Play'de yayınlamak içindir. Kod tarafındaki hazırlık **tamamlandı**;
kalan adımlar bir Google Play geliştirici hesabı ve imzalama anahtarı
gerektirdiği için sizin tarafınızdan yapılmalı.

> Neden native değil: yol haritası, ürün-pazar uyumu netleşmeden native
> yatırımı riskli buluyor. TWA mevcut kodu kullanır — ayrı bir uygulama
> geliştirmek gerekmez, güncellemeler web'den anında yayılır.

---

## Kod tarafında hazır olanlar ✅

| Gereksinim | Durum |
|---|---|
| Web App Manifest (`app/manifest.ts`) | ✅ `standalone`, `start_url: /`, tema rengi tanımlı |
| 192 ve 512 px ikonlar + maskable varyantları | ✅ `public/icons/` |
| Service worker | ✅ `public/sw.js` |
| HTTPS | ✅ Vercel varsayılan |
| `assetlinks.json` şablonu | ✅ `public/.well-known/assetlinks.json` |
| Bubblewrap yapılandırma şablonu | ✅ `twa-manifest.json` (kök dizin) |
| `/.well-known` yolunun oturum korumasından muaf tutulması | ✅ `lib/supabase/proxy.ts` |

Son madde önemli: proxy varsayılan olarak her sayfayı korur. `/.well-known/`
açıkça muaf tutulmasaydı Google'ın doğrulama isteği `/login`'e yönlenir ve
uygulama–site bağlantısı **doğrulanamazdı**.

---

## Sizin yapmanız gerekenler

### 1. Google Play geliştirici hesabı
- <https://play.google.com/console> üzerinden hesap açın (tek seferlik 25 USD).
- Hesap doğrulaması (kimlik/adres) birkaç gün sürebilir — erken başlatın.

### 2. Alan adını netleştirin
TWA sabit bir alan adına bağlanır. Vercel'in otomatik `*.vercel.app` adresi
yerine **kendi alan adınızı** kullanmanız önerilir; sonradan değiştirmek
uygulamayı yeniden yayınlamayı gerektirir.

### 3. Bubblewrap ile paketleyin

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://ALANADINIZ/manifest.webmanifest
bubblewrap build
```

`twa-manifest.json` dosyasındaki `ORNEK.vercel.app` yerlerini kendi alan
adınızla değiştirip bu dosyayı başlangıç noktası olarak kullanabilirsiniz.
`packageId` (`com.finansapp.twa`) yayınlandıktan sonra **değiştirilemez** —
şirket alan adınızın tersi olacak şekilde seçin (örn. `com.sirketiniz.finansapp`).

### 4. İmzalama anahtarını alın ve `assetlinks.json`'ı güncelleyin

Play Console → **Yayın → Kurulum → Uygulama imzalama** bölümünden
**SHA-256 sertifika parmak izini** kopyalayın.

`public/.well-known/assetlinks.json` içindeki iki alanı düzeltin:
- `package_name` → gerçek paket kimliğiniz
- `sha256_cert_fingerprints` → Play Console'daki parmak izi

Sonra deploy edin ve şu adresin **giriş sayfasına yönlenmeden** JSON döndürdüğünü
doğrulayın:

```
https://ALANADINIZ/.well-known/assetlinks.json
```

Doğrulama aracı: <https://developers.google.com/digital-asset-links/tools/generator>

> Bu adım atlanırsa uygulama açılır ama üstte tarayıcı adres çubuğu görünür —
> "gerçek uygulama" hissi kaybolur.

### 5. Mağaza girişini hazırlayın
- Uygulama adı, kısa ve uzun açıklama
- En az 2 ekran görüntüsü (telefon), 512×512 uygulama ikonu, 1024×500 kapak görseli
- **Gizlilik politikası bağlantısı:** `https://ALANADINIZ/gizlilik` (Faz 7'de hazırlandı)
- Veri güvenliği formu: finansal veri işlediğinizi ve verinin şifrelenerek
  aktarıldığını belirtmeniz gerekir

### 6. Test ve yayın
- Önce **iç test** kanalına yükleyip kendi telefonunuzda deneyin.
- Giriş akışı, bildirimler ve fatura PDF indirme akışını mutlaka test edin.
- Sorun yoksa üretime alın.

---

## Bilinen sınırlamalar

- **iOS yok.** Apple TWA benzeri bir mekanizmayı desteklemiyor. App Store için
  ya WebView sarmalayıcı (Apple bunu reddedebilir) ya da gerçek native/React
  Native uygulama gerekir — yol haritasında bu "talep gelirse" olarak
  işaretlenmiş.
- **Push bildirimleri** TWA'da Android 13+ için ek izin akışı ister; mevcut web
  push altyapısı çalışır ama telefonda ayrıca test edilmeli.
- Alan adı değişikliği uygulamanın yeniden yayınlanmasını gerektirir.
