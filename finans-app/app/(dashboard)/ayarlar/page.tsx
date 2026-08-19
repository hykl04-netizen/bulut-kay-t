'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2, ImageIcon, Loader2, Save, Trash2, CloudUpload, Download, BellRing, Smartphone, BellOff } from 'lucide-react';
import { isPushSupported, getExistingSubscription, subscribeToPush, unsubscribeFromPush } from '@/lib/push-notifications';
import { supabase } from '@/lib/supabase/client';
import { getCurrentWorkspaceId } from '@/lib/supabase/workspace';
import { toast } from '@/components/ui/toaster';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTeamRole } from '@/lib/use-team-role';
import { ShieldAlert } from 'lucide-react';

import { PageLoading } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { WorkspaceTypeCard } from '@/components/workspace-type-card';
const MAX_LOGO_DIMENSION = 240; // px — PDF başlığında küçük bir logo için fazlasıyla yeterli

type BackupFrequency = 'off' | 'weekly' | 'monthly';

interface StoredBackup {
  name: string;
  createdAt: string | null;
  sizeBytes: number | null;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Yüklenen görseli canvas ile MAX_LOGO_DIMENSION içine sığacak şekilde küçültüp base64 data URL döner. */
function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.onload = () => {
      img.onerror = () => reject(new Error('Görsel işlenemedi.'));
      img.onload = () => {
        const scale = Math.min(1, MAX_LOGO_DIMENSION / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas desteklenmiyor.'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        // Şeffaflığı korumak için PNG kullanıyoruz; logo dosyaları genelde küçük olduğundan boyut sorun olmuyor.
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function AyarlarPage() {
  const { role, loading: roleLoading } = useTeamRole();
  const canManage = roleLoading || !role || role === 'sahip' || role === 'yonetici';

  const [companyName, setCompanyName] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingLogo, setProcessingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [backupFrequency, setBackupFrequency] = useState<BackupFrequency>('off');
  const [savingBackupFreq, setSavingBackupFreq] = useState(false);
  const [backups, setBackups] = useState<StoredBackup[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(true);

  // Bildirim tercihleri
  const [showUpcomingPayments, setShowUpcomingPayments] = useState(true);
  const [upcomingDaysThreshold, setUpcomingDaysThreshold] = useState(30);
  const [showBudgetAlerts, setShowBudgetAlerts] = useState(true);
  const [savingNotificationPrefs, setSavingNotificationPrefs] = useState(false);

  // Mobil bildirimler (PWA push)
  const [pushDevices, setPushDevices] = useState<{ id: string; device_label: string | null; endpoint: string; created_at: string }[]>([]);
  const [loadingPushDevices, setLoadingPushDevices] = useState(true);
  const [thisDeviceSubscribed, setThisDeviceSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        setLoadingBackups(false);
        return;
      }
      // Şirket ayarları, yedekleme ve dönem kilidi artık İŞLETME bazlı
      // (bkz. 20260823_settings_workspace_scoping.sql). Bildirim tercihleri
      // ise bilinçli olarak kullanıcı bazlı kaldı — hangi widget'ı görmek
      // istediğiniz kişisel bir tercih.
      const workspaceId = await getCurrentWorkspaceId(user.id);

      const { data, error } = await supabase
        .from('company_settings')
        .select('company_name, logo_data_url')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (error) {
        console.error('Şirket ayarları alınamadı:', error.message);
      } else if (data) {
        setCompanyName(data.company_name ?? '');
        setLogoDataUrl(data.logo_data_url ?? null);
      }
      setLoading(false);

      const { data: backupSetting, error: backupSettingError } = await supabase
        .from('backup_settings')
        .select('frequency')
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      if (!backupSettingError && backupSetting) {
        setBackupFrequency(backupSetting.frequency as BackupFrequency);
      }

      const { data: files, error: listError } = await supabase.storage.from('yedekler').list(workspaceId, {
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (!listError && files) {
        setBackups(
          files.map((f) => ({
            name: f.name,
            createdAt: f.created_at ?? null,
            sizeBytes: (f.metadata?.size as number | undefined) ?? null,
          }))
        );
      }
      setLoadingBackups(false);

      const { data: notifPrefs, error: notifPrefsError } = await supabase
        .from('notification_preferences')
        .select('show_upcoming_payments, upcoming_days_threshold, show_budget_alerts')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!notifPrefsError && notifPrefs) {
        setShowUpcomingPayments(notifPrefs.show_upcoming_payments);
        setUpcomingDaysThreshold(notifPrefs.upcoming_days_threshold);
        setShowBudgetAlerts(notifPrefs.show_budget_alerts);
      }

      const { data: devices, error: devicesError } = await supabase
        .from('push_subscriptions')
        .select('id, device_label, endpoint, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!devicesError && devices) setPushDevices(devices);
      setLoadingPushDevices(false);

      if (isPushSupported()) {
        const existing = await getExistingSubscription();
        setThisDeviceSubscribed(!!existing);
      }
    })();
  }, []);

  const saveNotificationPrefs = async (overrides: Partial<{
    show_upcoming_payments: boolean;
    upcoming_days_threshold: number;
    show_budget_alerts: boolean;
  }> = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Oturum bulunamadı.');
      return;
    }
    setSavingNotificationPrefs(true);
    const payload = {
      user_id: user.id,
      show_upcoming_payments: showUpcomingPayments,
      upcoming_days_threshold: upcomingDaysThreshold,
      show_budget_alerts: showBudgetAlerts,
      updated_at: new Date().toISOString(),
      ...overrides,
    };
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(payload, { onConflict: 'user_id' });
    setSavingNotificationPrefs(false);

    if (error) {
      console.error('Bildirim tercihleri kaydedilemedi:', error.message);
      toast.error('Kaydedilemedi. Bu özellik için migration çalıştırılmış olmalı (bkz. yapılacaklar listesi).');
      return;
    }
    if ('show_upcoming_payments' in overrides) setShowUpcomingPayments(overrides.show_upcoming_payments!);
    if ('upcoming_days_threshold' in overrides) setUpcomingDaysThreshold(overrides.upcoming_days_threshold!);
    if ('show_budget_alerts' in overrides) setShowBudgetAlerts(overrides.show_budget_alerts!);
    toast.success('Bildirim tercihleri kaydedildi.');
  };

  const handleBackupFrequencyChange = async (value: BackupFrequency) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Oturum bulunamadı.');
      return;
    }
    setSavingBackupFreq(true);
    const workspaceId = await getCurrentWorkspaceId(user.id);
    const { error } = await supabase
      .from('backup_settings')
      .upsert(
        { workspace_id: workspaceId, user_id: user.id, frequency: value, updated_at: new Date().toISOString() },
        { onConflict: 'workspace_id' }
      );
    setSavingBackupFreq(false);

    if (error) {
      console.error('Yedekleme sıklığı kaydedilemedi:', error.message);
      toast.error('Kaydedilemedi. Bu özellik için migration çalıştırılmış olmalı (bkz. yapılacaklar listesi).');
      return;
    }
    setBackupFrequency(value);
    toast.success(value === 'off' ? 'Otomatik yedekleme kapatıldı.' : 'Otomatik yedekleme ayarı kaydedildi.');
  };

  const handleDownloadBackup = async (fileName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const workspaceId = await getCurrentWorkspaceId(user.id);
    const { data, error } = await supabase.storage
      .from('yedekler')
      .createSignedUrl(`${workspaceId}/${fileName}`, 60);
    if (error || !data) {
      toast.error('İndirme linki oluşturulamadı.');
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const handleEnablePush = async () => {
    setPushBusy(true);
    const result = await subscribeToPush();
    setPushBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setThisDeviceSubscribed(true);
    toast.success('Bu cihazda push bildirimleri açıldı.');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: devices } = await supabase
        .from('push_subscriptions')
        .select('id, device_label, endpoint, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (devices) setPushDevices(devices);
    }
  };

  const handleDisablePushOnThisDevice = async () => {
    setPushBusy(true);
    const result = await unsubscribeFromPush();
    setPushBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setThisDeviceSubscribed(false);
    toast.success('Bu cihazda push bildirimleri kapatıldı.');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: devices } = await supabase
        .from('push_subscriptions')
        .select('id, device_label, endpoint, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (devices) setPushDevices(devices);
    }
  };

  const handleRemoveDevice = async (id: string) => {
    if (!(await confirmDialog('Bu cihazın bildirim aboneliğini kaldırmak istediğinize emin misiniz?'))) return;
    const { error } = await supabase.from('push_subscriptions').delete().eq('id', id);
    if (error) {
      toast.error('Kaldırılamadı.');
      return;
    }
    setPushDevices((prev) => prev.filter((d) => d.id !== id));
    toast.success('Cihaz kaldırıldı.');
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen bir görsel dosyası seçin.');
      return;
    }
    setProcessingLogo(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setLogoDataUrl(dataUrl);
    } catch (err) {
      console.error('Logo işlenemedi:', err);
      toast.error('Logo işlenirken bir hata oluştu.');
    } finally {
      setProcessingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Oturum bulunamadı.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('company_settings')
      .upsert(
        {
          workspace_id: await getCurrentWorkspaceId(user.id),
          user_id: user.id,
          company_name: companyName.trim() || null,
          logo_data_url: logoDataUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'workspace_id' }
      );
    setSaving(false);

    if (error) {
      console.error('Şirket ayarları kaydedilemedi:', error.message);
      toast.error('Kaydedilemedi. Bu özellik için migration çalıştırılmış olmalı (bkz. yapılacaklar listesi).');
      return;
    }
    toast.success('Şirket ayarları kaydedildi. Yeni PDF raporlarında kullanılacak.');
  };

  if (loading || roleLoading) {
    return (
      <PageLoading />
    );
  }

  if (!canManage) {
    return (
      <div className="max-w-xl space-y-6">
        <PageHeader
          icon={Building2}
          title="Şirket Ayarları"
        />
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">
            Şirket ayarları ve yedekleme yalnızca sahip veya yönetici rolüne açıktır.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader
        icon={Building2}
        title="Şirket Ayarları"
        description="Burada belirlediğiniz şirket adı ve logo, Raporlar sayfasından indirilen PDF raporların üst kısmında görünür."
      />

      <WorkspaceTypeCard />

      <div className="space-y-5 rounded-xl border border-border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="company-name">Şirket / İşletme Adı</Label>
          <Input
            id="company-name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Örn: Acme Danışmanlık A.Ş."
          />
        </div>

        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted dark:bg-secondary">
              {logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoDataUrl} alt="Şirket logosu" className="h-full w-full object-contain" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={processingLogo}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60 dark:hover:bg-secondary"
              >
                {processingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                {logoDataUrl ? 'Logoyu Değiştir' : 'Logo Yükle'}
              </button>
              {logoDataUrl && (
                <button
                  type="button"
                  onClick={() => setLogoDataUrl(null)}
                  className="inline-flex items-center gap-2 text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Logoyu Kaldır
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-brand-gold-light disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Kaydet
        </button>
      </div>

      <div className="space-y-5 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <CloudUpload className="h-5 w-5 text-brand-gold" />
          <h2 className="text-lg font-bold text-foreground">Otomatik Yedekleme</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Seçtiğiniz sıklıkta, verileriniz otomatik olarak JSON yedeği alınıp güvenli bir şekilde saklanır (indirmeyi
          unutsanız bile). Bu, sol menüdeki manuel &quot;Yedek Al&quot; düğmesinden bağımsız, arka planda kendiliğinden çalışan ek
          bir koruma katmanıdır.
        </p>

        <div className="flex flex-wrap gap-2">
          {(['off', 'weekly', 'monthly'] as BackupFrequency[]).map((freq) => (
            <button
              key={freq}
              onClick={() => handleBackupFrequencyChange(freq)}
              disabled={savingBackupFreq}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${ backupFrequency === freq ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-border text-muted-foreground hover:bg-muted dark:hover:bg-secondary' }`}
            >
              {freq === 'off' ? 'Kapalı' : freq === 'weekly' ? 'Haftalık' : 'Aylık'}
            </button>
          ))}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Geçmiş Yedekler</h3>
          {loadingBackups ? (
            <PageLoading />
          ) : backups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz otomatik yedek oluşturulmadı.</p>
          ) : (
            <div className="space-y-1">
              {backups.map((b) => (
                <div key={b.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-foreground">{b.name}</span>
                    {b.sizeBytes !== null && <span className="ml-2 text-xs text-muted-foreground">{formatBytes(b.sizeBytes)}</span>}
                  </div>
                  <button
                    onClick={() => handleDownloadBackup(b.name)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-gold hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" /> İndir
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <BellRing className="h-5 w-5 text-brand-gold" />
          <h2 className="text-lg font-bold text-foreground">Bildirim Tercihleri</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Özet Paneli&apos;nde hangi hatırlatma widget&apos;larının görüneceğini ve yaklaşan ödemelerin kaç gün
          öncesinden listeleneceğini burada belirleyebilirsiniz.
        </p>

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-foreground">Yaklaşan Ödemeler widget&apos;ı</div>
            <div className="text-xs text-muted-foreground">Özet Paneli&apos;nde vadesi yaklaşan fatura/borç listesi.</div>
          </div>
          <button
            onClick={() => saveNotificationPrefs({ show_upcoming_payments: !showUpcomingPayments })}
            disabled={savingNotificationPrefs}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${ showUpcomingPayments ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-border text-muted-foreground hover:bg-muted dark:hover:bg-secondary' }`}
          >
            {showUpcomingPayments ? 'Açık' : 'Kapalı'}
          </button>
        </div>

        {showUpcomingPayments && (
          <div className="flex items-center justify-between gap-4 pl-1">
            <div className="text-sm text-muted-foreground">Kaç gün öncesinden gösterilsin?</div>
            <div className="flex gap-1.5">
              {[7, 14, 30, 60].map((d) => (
                <button
                  key={d}
                  onClick={() => saveNotificationPrefs({ upcoming_days_threshold: d })}
                  disabled={savingNotificationPrefs}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium disabled:opacity-60 ${ upcomingDaysThreshold === d ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-border text-muted-foreground hover:bg-muted dark:hover:bg-secondary' }`}
                >
                  {d} gün
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
          <div>
            <div className="text-sm font-medium text-foreground">Bütçe Aşımları widget&apos;ı</div>
            <div className="text-xs text-muted-foreground">Özet Paneli&apos;nde limiti aşan kategori uyarıları.</div>
          </div>
          <button
            onClick={() => saveNotificationPrefs({ show_budget_alerts: !showBudgetAlerts })}
            disabled={savingNotificationPrefs}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${ showBudgetAlerts ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-border text-muted-foreground hover:bg-muted dark:hover:bg-secondary' }`}
          >
            {showBudgetAlerts ? 'Açık' : 'Kapalı'}
          </button>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="h-4 w-4 text-brand-gold" />
            <h3 className="text-sm font-bold text-foreground">Mobil Bildirimler (Push)</h3>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Yukarıdaki tercihlere göre, vadesi yaklaşan/geciken ödemeler ve bütçe aşımları için telefonunuza/tarayıcınıza
            günlük olarak bildirim gönderilir. Her cihazda ayrı ayrı açmanız gerekir.
          </p>

          {!isPushSupported() ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">Bu tarayıcı/cihaz push bildirimlerini desteklemiyor.</p>
          ) : (
            <button
              onClick={thisDeviceSubscribed ? handleDisablePushOnThisDevice : handleEnablePush}
              disabled={pushBusy}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${ thisDeviceSubscribed ? 'border-border text-muted-foreground hover:bg-muted dark:hover:bg-secondary' : 'border-brand-gold bg-brand-gold/10 text-brand-gold' }`}
            >
              {pushBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : thisDeviceSubscribed ? (
                <BellOff className="h-4 w-4" />
              ) : (
                <BellRing className="h-4 w-4" />
              )}
              {thisDeviceSubscribed ? 'Bu Cihazda Kapat' : 'Bu Cihazda Aç'}
            </button>
          )}

          <div className="mt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bildirime Açık Cihazlar</h4>
            {loadingPushDevices ? (
              <PageLoading />
            ) : pushDevices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz hiçbir cihazdan bildirime izin verilmedi.</p>
            ) : (
              <div className="space-y-1">
                {pushDevices.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="font-medium text-foreground">{d.device_label ?? 'Bilinmeyen cihaz'}</span>
                    <button
                      onClick={() => handleRemoveDevice(d.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Kaldır
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
