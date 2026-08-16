'use client';

import { useEffect, useState } from 'react';
import { Lock, Unlock, Loader2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/components/ui/toaster';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function DonemKilitlemePage() {
  const [lockedBefore, setLockedBefore] = useState<string | null>(null);
  const [draftDate, setDraftDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('period_locks')
        .select('locked_before')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Dönem kilidi alınamadı:', error.message);
      } else if (data) {
        setLockedBefore(data.locked_before);
        setDraftDate(data.locked_before);
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!draftDate) {
      toast.error('Lütfen bir tarih seçin.');
      return;
    }
    const ok = await confirmDialog({
      title: 'Dönemi kilitle',
      message: `${new Date(draftDate).toLocaleDateString('tr-TR')} tarihinden ÖNCEKİ tüm gelir/gider, fatura/masraf ve borç/alacak kayıtları artık değiştirilemeyecek ve silinemeyecek. Onaylıyor musunuz?`,
      confirmLabel: 'Kilitle',
      danger: true,
    });
    if (!ok) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Oturum bulunamadı.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('period_locks')
      .upsert({ user_id: user.id, locked_before: draftDate, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    setSaving(false);

    if (error) {
      console.error('Dönem kilidi kaydedilemedi:', error.message);
      toast.error('Kaydedilemedi. Bu özellik için migration çalıştırılmış olmalı (bkz. yapılacaklar listesi).');
      return;
    }
    setLockedBefore(draftDate);
    toast.success('Dönem kilidi güncellendi.');
  };

  const handleUnlock = async () => {
    const ok = await confirmDialog({
      title: 'Kilidi kaldır',
      message: 'Dönem kilidi tamamen kaldırılsın mı? Bu durumda tüm geçmiş kayıtlar yeniden düzenlenebilir/silinebilir hale gelir.',
      confirmLabel: 'Kilidi Kaldır',
      danger: true,
    });
    if (!ok) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSaving(true);
    const { error } = await supabase.from('period_locks').delete().eq('user_id', user.id);
    setSaving(false);

    if (error) {
      toast.error('Kilit kaldırılamadı.');
      return;
    }
    setLockedBefore(null);
    setDraftDate('');
    toast.success('Dönem kilidi kaldırıldı.');
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Lock className="h-7 w-7 text-brand-gold" />
        <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Dönem Kilitleme</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Belirlediğiniz tarihten önceki gelir/gider, fatura/masraf ve borç/alacak kayıtları artık değiştirilemez veya
        silinemez — kapanmış bir dönemin yanlışlıkla bozulmasını önler. Kilit, bu sayfadan istediğiniz zaman
        kaldırılabilir.
      </p>

      <div className="space-y-5 rounded-xl border border-border bg-card p-6 dark:border-border dark:bg-primary">
        {lockedBefore && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
            <Lock className="h-4 w-4" />
            Şu an {new Date(lockedBefore).toLocaleDateString('tr-TR')} tarihinden önceki kayıtlar kilitli.
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="lock-date">Bu tarihten önceki kayıtlar kilitlensin</Label>
          <Input id="lock-date" type="date" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-primary hover:bg-brand-gold-light disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kilidi Kaydet
          </button>
          {lockedBefore && (
            <button
              onClick={handleUnlock}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <Unlock className="h-4 w-4" />
              Kilidi Kaldır
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
