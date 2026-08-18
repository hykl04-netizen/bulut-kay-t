'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Download, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getUserWorkspaces, type WorkspaceSummary } from '@/lib/supabase/workspace';
import { buildBackupPayload } from '@/lib/backup';
import { toast } from '@/components/ui/toaster';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Öneri 8 — KVKK m.11 hakları: veri taşınabilirliği ve unutulma hakkı.
 *
 * Gizlilik metninde bu haklar taahhüt ediliyordu ama kendi kendine çalışan bir
 * mekanizma yoktu; talep e-postayla gelip elle işlenmek zorundaydı.
 *
 * Dışa aktarma, kullanıcının SAHİP OLDUĞU tüm işletmeleri tek dosyada toplar
 * (üyesi olduğu başkasının işletmesi dahil edilmez — o veri ona ait değil).
 */

const CONFIRM_PHRASE = 'HESABIMI SIL';

export default function HesabimPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }
      const list = await getUserWorkspaces();
      if (cancelled) return;
      setEmail(user.email ?? '');
      setWorkspaces(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const owned = workspaces.filter((w) => w.isOwner);
  const memberOf = workspaces.filter((w) => !w.isOwner);

  const handleExport = async () => {
    setExporting(true);
    try {
      const payloads = await Promise.all(owned.map((w) => buildBackupPayload(w.workspaceId)));
      const bundle = {
        version: 1,
        exportDate: new Date().toISOString(),
        account: { email },
        workspaces: payloads,
      };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finansapp-verilerim-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Verileriniz indirildi.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Dışa aktarma başarısız.');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/hesap/sil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: confirmText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Hesap silinemedi.');
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Hesap silinemedi.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-brand-gold" />
        <h1 className="text-3xl font-bold text-foreground">Hesabım ve Verilerim</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        KVKK kapsamındaki haklarınız: verilerinizin bir kopyasını indirebilir veya hesabınızı
        tamamen silebilirsiniz.
      </p>

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Hesap</p>
        <p className="mt-0.5 font-medium text-foreground">{email}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Sahibi olduğunuz işletmeler: <strong className="text-foreground">{owned.length}</strong>
          {memberOf.length > 0 && ` · Üyesi olduğunuz: ${memberOf.length}`}
        </p>
      </div>

      {/* Veri indirme */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground">Verilerimi indir</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sahibi olduğunuz tüm işletmelerin kayıtlarını tek bir JSON dosyasında indirir. Üyesi
          olduğunuz başkasına ait işletmeler dahil edilmez.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting || owned.length === 0}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-secondary disabled:opacity-60"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Verilerimi İndir
        </button>
      </div>

      {/* Hesap silme */}
      <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5 dark:border-rose-900/50 dark:bg-rose-950/20">
        <h2 className="font-semibold text-rose-800 dark:text-rose-300">Hesabımı sil</h2>
        <p className="mt-1 text-sm text-rose-800/80 dark:text-rose-300/80">
          Hesabınız ve sahibi olduğunuz{' '}
          <strong>{owned.length} işletmenin tüm verisi</strong> kalıcı olarak silinir. Bu işlem
          geri alınamaz.
        </p>
        {memberOf.length > 0 && (
          <p className="mt-2 text-sm text-rose-800/80 dark:text-rose-300/80">
            Üyesi olduğunuz {memberOf.length} işletmenin verisi silinmez; yalnızca oradaki
            erişiminiz kaldırılır.
          </p>
        )}

        {!showDelete ? (
          <button
            onClick={() => setShowDelete(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-300 px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
          >
            <Trash2 className="h-4 w-4" />
            Hesabımı silmek istiyorum
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-2 rounded-lg bg-rose-100 p-3 text-sm text-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Silmeden önce <strong>verilerinizi indirmenizi</strong> öneririz — silindikten
                sonra geri getirilemez.
              </span>
            </div>
            <div>
              <Label htmlFor="silme-onayi">
                Onaylamak için <strong>{CONFIRM_PHRASE}</strong> yazın
              </Label>
              <Input
                id="silme-onayi"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDelete(false);
                  setConfirmText('');
                }}
                disabled={deleting}
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground hover:bg-muted"
              >
                Vazgeç
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || confirmText.trim().toLocaleUpperCase('tr').replace(/İ/g, 'I') !== CONFIRM_PHRASE}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Hesabımı Kalıcı Olarak Sil
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
