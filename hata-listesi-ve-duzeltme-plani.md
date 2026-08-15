# Hata Listesi ve Düzeltme Planı

**Amaç:** Token limiti ortasında kesilirse bile bu dosya, hangi hatanın nerede olduğunu ve nasıl düzeltileceğini eksiksiz gösterir. Bir sonraki oturumda bu dosya yüklenip "buradaki sırayla devam et" denilebilir.

**Durum işaretleri:** `[ ]` = düzeltilmedi, `[x]` = düzeltildi ve doğrulandı.

---

## 1. [ ] `gelir-gider/page.tsx` — "Kaydediliyor..." sonsuza kadar takılı kalıyor

**Dosya:** `app/(dashboard)/gelir-gider/page.tsx`, `handleSubmit` fonksiyonu (~satır 149-154)

**Mevcut (hatalı) kod:**
```ts
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;   // ← setIsSubmitting(false) çağrılmıyor, buton sonsuza dek disabled kalır
```

**Düzeltme:** `borc-alacak/page.tsx`'teki doğru desenle değiştir:
```ts
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    setIsSubmitting(false);
    alert('Oturumunuz sona ermiş görünüyor. Lütfen sayfayı yenileyip tekrar giriş yapın.');
    return;
  }
```

**Aynı hata, aynı düzeltme şablonuyla şu dosyalarda da var:**
- `app/(dashboard)/bordro/page.tsx` → `handleAddPayroll` fonksiyonu, `if (!user) return;` satırı
- `app/(dashboard)/belgeler/page.tsx` → `handleAddDocument` fonksiyonu, `if (!user) return;` satırı
- `app/(dashboard)/page.tsx` (dashboard özet) → `fetchDashboardData` fonksiyonu, `if (!user) return;` satırı — burada `setIsSubmitting` yok ama `setLoading(false)` çağrılmıyor, sayfa sonsuza dek "Özet paneli yükleniyor..." gösterir. Düzeltme: `if (!user) { setLoading(false); return; }`

---

## 2. [ ] Toplu yapıştırma (Excel'den Yapıştır) — hata olsa bile "başarılı" ekranı gösteriyor

**Etkilenen dosyalar (5 modülün hepsi):**
- `app/(dashboard)/gelir-gider/page.tsx` + `gelir-gider/bulk-paste-modal.tsx`
- `app/(dashboard)/borc-alacak/page.tsx` + `borc-alacak/bulk-paste-modal.tsx`
- `app/(dashboard)/fatura-masraf/page.tsx` + `fatura-masraf/bulk-paste-modal.tsx`
- `app/(dashboard)/yatirim/page.tsx` + `yatirim/bulk-paste-modal.tsx`
- `app/(dashboard)/varlik/page.tsx` + `varlik/bulk-paste-modal.tsx`

**Kök neden — her `page.tsx`'teki `handleBulkImport` (örnek gelir-gider):**
```ts
const handleBulkImport = async (rows: [...]) => {
  const { data, error } = await supabase.from('transactions').insert(rows).select(...);

  if (error) {
    alert('Toplu ekleme sırasında hata oluştu.');
    return;      // ← throw ETMİYOR, normal (resolved) dönüyor
  }
  ...
};
```

**Her `bulk-paste-modal.tsx`'teki `handleImport`:**
```ts
const handleImport = async () => {
  ...
  try {
    await onImport(payload);
    setResult({ success: payload.length, failed: invalidCount });  // ← onImport hata fırlatmadığı için hata durumunda da buraya düşer
  } finally {
    setImporting(false);
  }
};
```

**Düzeltme — İKİ seçenekten biri (tutarlılık için hepsinde aynısı uygulanmalı):**

**Seçenek A (önerilen, daha az dosya değişikliği): `page.tsx`'lerdeki `handleBulkImport`'u hata durumunda throw edecek şekilde değiştir:**
```ts
const handleBulkImport = async (rows: [...]) => {
  const { data, error } = await supabase.from('transactions').insert(rows).select(...);

  if (error) {
    throw new Error(error.message);   // ← alert yerine throw
  }

  if (data) {
    setTransactions((prev) => [...(data as ...), ...prev].sort(...));
  }
};
```
Bu durumda `bulk-paste-modal.tsx`'teki `handleImport`'a bir `catch` bloğu eklenmeli:
```ts
const handleImport = async () => {
  if (validRows.length === 0) return;
  setImporting(true);
  try {
    const payload = [...];
    await onImport(payload);
    setResult({ success: payload.length, failed: invalidCount });
  } catch (err) {
    alert('Toplu ekleme sırasında hata oluştu: ' + (err instanceof Error ? err.message : ''));
  } finally {
    setImporting(false);
  }
};
```

**Seçenek B: `onImport`'un dönüş tipini `Promise<boolean>` yap (başarı/başarısızlık), `handleImport` sonucu kontrol etsin.** Seçenek A daha az dosya değiştiriyor, onu öneriyorum.

**Bu düzeltme 5 modülün de hem `page.tsx`'inde hem `bulk-paste-modal.tsx`'inde tekrarlanmalı** (toplam 10 dosya).

---

## 3. [ ] `fatura-masraf` — inline düzenlemede vade tarihini silmek hata veriyor

**Dosya:** `app/(dashboard)/fatura-masraf/page.tsx`, `handleCellEdit` fonksiyonu

**Mevcut (hatalı) kod:**
```ts
const handleCellEdit = async (
  id: string,
  field: 'title' | 'amount' | 'due_date',
  value: string
) => {
  const previous = bills.find((b) => b.id === id);
  if (!previous) return;

  const parsedValue = field === 'amount' ? parseFloat(value) || 0 : value;   // ← due_date için boş string kontrolü yok
  ...
```

**Düzeltme — `borc-alacak/page.tsx`'teki doğru desenle değiştir:**
```ts
const parsedValue =
  field === 'amount'
    ? parseFloat(value) || 0
    : field === 'due_date' && value === ''
    ? null
    : value;
```

---

## 4. [ ] `borc-alacak/page.tsx` — yeni kayıt eklerken tam refetch (optimistic değil)

**Dosya:** `app/(dashboard)/borc-alacak/page.tsx`, `handleSubmit` fonksiyonu

**Mevcut kod (çalışıyor ama Faz 7.3 deseniyle tutarsız):**
```ts
const { error } = await supabase.from('debts').insert(payload);
if (!error) {
  setIsModalOpen(false);
  setDirection('alacak');
  setCounterparty('');
  setAmount('');
  setDueDate('');
  setNotes('');
  await fetchDebts();   // ← tam yeniden çekim
} else {
  alert('Hata oluştu: ' + error.message);
}
```

**Düzeltme — diğer modüllerdeki (`varlik/page.tsx` örnek) optimistic desene çevir:**
```ts
const { data, error } = await supabase
  .from('debts')
  .insert(payload)
  .select('*')
  .single();

if (!error && data) {
  setDebts((prev) =>
    [data as Debt, ...prev].sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date < b.due_date ? -1 : 1;
    })
  );
  setIsModalOpen(false);
  setDirection('alacak');
  setCounterparty('');
  setAmount('');
  setDueDate('');
  setNotes('');
} else {
  alert('Hata oluştu: ' + error?.message);
}
```
Not: `fetchDebts` fonksiyonu component içinde başka yerde (ilk yükleme) hâlâ kullanıldığı için silinmemeli, sadece bu çağrı kaldırılmalı.

---

## 5. [ ] Yedekleme (Backup) özelliği hiçbir yerden erişilemiyor

**Dosyalar:** `components/backup-modal.tsx`, `lib/backup.ts` (kod hazır, sadece bağlı değil)

**Düzeltme:** `app/(dashboard)/layout.tsx`'e bir "Yedekle" butonu eklenmeli. Önerilen yer: sidebar'da `ThemeToggle`'ın yanı/altı.

```tsx
// layout.tsx en üstte import
import { BackupModal } from '@/components/backup-modal';
import { DownloadCloud } from 'lucide-react'; // veya uygun bir ikon

// component içinde state
const [isBackupOpen, setIsBackupOpen] = useState(false);

// navContent içinde, ThemeToggle'ın yanına:
<button
  onClick={() => setIsBackupOpen(true)}
  className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition"
>
  <DownloadCloud className="w-5 h-5" />
  Yedek Al
</button>

// return'ün en altına (CalculatorWidget'ın yanına):
<BackupModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
```

**Ayrıca not:** `lib/backup.ts`'te şu an sadece **dışa aktarma (export)** var, **içe aktarma/geri yükleme (restore)** yok. Bağlantı kurulduktan sonra bunun bilinçli bir kapsam kararı mı yoksa eksik mi olduğuna karar verilmeli (önceki oturumda da not düşülmüştü).

---

## 6. [ ] Grafik indirme (ReportShareButton) hiçbir yerden erişilemiyor

**Dosya:** `components/report-share-button.tsx` (kod hazır, bağlı değil)

**Düzeltme:** `app/(dashboard)/raporlar/page.tsx`'teki `ChartCard` bileşenine bir `id` prop'u eklenmeli, her grafik sarmalayıcısına uygulanmalı, ve her `ChartCard`'ın başlık satırına `ReportShareButton` eklenmeli.

```tsx
// raporlar/page.tsx — import
import { ReportShareButton } from '@/components/report-share-button';

// ChartCard fonksiyon imzasına id ekle
function ChartCard({ id, title, subtitle, children, empty }: {
  id: string; title: string; subtitle?: string; children: React.ReactNode; empty: boolean;
}) {
  return (
    <div id={id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">{title}</h2>
        <ReportShareButton targetElementId={id} reportTitle={title} />
      </div>
      {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">{subtitle}</p>}
      {empty ? (...) : (<div className="h-72 mt-2">{children}</div>)}
    </div>
  );
}

// her <ChartCard ...> çağrısına benzersiz id eklenmeli, örn:
<ChartCard id="chart-cash-flow" title="Nakit Akışı" ... />
<ChartCard id="chart-cumulative-net" title="Nakit Bakiyesi Zaman Çizelgesi" ... />
<ChartCard id="chart-portfolio" title="Portföy Dağılımı" ... />
<ChartCard id="chart-expense-category" title="Kategori Bazlı Harcamalar" ... />
```
Not: `html-to-image` paketi `package.json`'da zaten mevcut, ekstra kurulum gerekmez.

---

## Uygulama sırası önerisi

1. Madde 1 (stuck loading) — 4 dosya, hızlı ve düşük riskli
2. Madde 3 (fatura-masraf due_date) — 1 dosya, hızlı
3. Madde 4 (borc-alacak optimistic) — 1 dosya
4. Madde 2 (bulk-import yanıltıcı başarı) — 10 dosya, en çok zaman alacak, dikkatli test gerekir
5. Madde 5 (Backup bağlama) — 1 dosya değişikliği + doğrulama
6. Madde 6 (ReportShareButton bağlama) — 1 dosya değişikliği + doğrulama

Her madde bitince `npx tsc --noEmit` ile tip kontrolü yapılmalı, sonra bu dosyada ilgili satır `[x]` olarak işaretlenmeli.
