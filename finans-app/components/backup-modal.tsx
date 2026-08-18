'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Upload, AlertTriangle, Loader2, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentWorkspaceId } from '@/lib/supabase/workspace';
import {
  exportAllDataAsJSON,
  parseBackupFile,
  restoreFromBackup,
  summarizeBackup,
  TABLE_LABELS,
  type BackupPayload,
} from '@/lib/backup';

/**
 * Yedek alma ve geri yükleme.
 *
 * Geri yükleme bilinçli olarak iki adımlı: dosya seçilince önce içindekilerin
 * özeti gösteriliyor, kullanıcı ne yükleyeceğini görmeden onaylayamıyor. Ayrıca
 * üzerine yazma uyarısı için işletme adını elle yazması isteniyor — muhasebe
 * verisini yanlışlıkla silmek çok pahalı bir hata.
 */
export function BackupModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  const [pending, setPending] = useState<BackupPayload | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const wsId = await getCurrentWorkspaceId(user.id);
      if (cancelled) return;
      const { data } = await supabase.from('workspaces').select('name').eq('id', wsId).maybeSingle();
      if (cancelled) return;
      setUserId(user.id);
      setWorkspaceId(wsId);
      setWorkspaceName((data as { name: string } | null)?.name ?? 'İşletmem');
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const reset = () => {
    setPending(null);
    setConfirmText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = async () => {
    if (!workspaceId) return;
    setBusy(true);
    setMsg(null);
    const res = await exportAllDataAsJSON(workspaceId);
    setBusy(false);
    setMsg(
      res.success
        ? { type: 'success', text: 'Yedek dosyası indirildi.' }
        : { type: 'error', text: 'Yedek alınırken bir hata oluştu.' }
    );
  };

  const handleFilePick = async (file: File) => {
    setMsg(null);
    try {
      const payload = parseBackupFile(await file.text());
      setPending(payload);
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Dosya okunamadı.' });
      reset();
    }
  };

  const handleRestore = async () => {
    if (!pending || !workspaceId || !userId) return;
    setBusy(true);
    setMsg(null);
    try {
      const summary = await restoreFromBackup(pending, workspaceId, userId);
      const total = summary.reduce((s, r) => s + r.inserted, 0);
      setMsg({ type: 'success', text: `${total} kayıt geri yüklendi. Sayfayı yenileyin.` });
      reset();
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Geri yükleme başarısız.' });
    } finally {
      setBusy(false);
    }
  };

  const rows = pending ? summarizeBackup(pending) : [];
  const confirmed = confirmText.trim() === workspaceName.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Veri Yedekleme</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              İşletme: <strong className="text-foreground">{workspaceName || '...'}</strong>
            </p>
          </div>
          <button onClick={onClose} aria-label="Kapat" className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {msg && (
          <div
            className={`mt-4 flex items-start gap-2 rounded-lg p-3 text-sm ${
              msg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
            }`}
          >
            {msg.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Yedek al */}
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-foreground">Yedek al</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Bu işletmenin tüm kayıtları (gelir/gider, fatura, cari, bordro, belgeler dahil) tek bir
            JSON dosyasına indirilir.
          </p>
          <button
            onClick={handleExport}
            disabled={busy || !workspaceId}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-secondary disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Yedeği İndir
          </button>
        </div>

        <div className="my-5 border-t border-border" />

        {/* Geri yükle */}
        <div>
          <h3 className="text-sm font-semibold text-foreground">Yedekten geri yükle</h3>

          {!pending ? (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                Daha önce indirdiğiniz bir yedek dosyasını seçin. Yüklemeden önce içeriğini
                göstereceğiz.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFilePick(file);
                }}
                className="mt-3 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-2 file:text-sm file:text-foreground hover:file:bg-muted"
              />
            </>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  {pending.workspaceName ? `"${pending.workspaceName}" işletmesinden ` : ''}
                  {new Date(pending.exportDate).toLocaleString('tr-TR')} tarihli yedek
                </p>
                <ul className="mt-2 space-y-0.5 text-sm">
                  {rows.length === 0 ? (
                    <li className="text-muted-foreground">Yedek boş görünüyor.</li>
                  ) : (
                    rows.map((r) => (
                      <li key={r.table} className="flex justify-between text-foreground">
                        <span>{TABLE_LABELS[r.table]}</span>
                        <span className="text-muted-foreground">{r.count}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong>{workspaceName}</strong> işletmesindeki mevcut tüm kayıtlar silinip
                  yerine yedektekiler yazılacak. Bu işlem geri alınamaz.
                </span>
              </div>

              <div>
                <label htmlFor="onay-metni" className="text-xs text-muted-foreground">
                  Onaylamak için işletme adını yazın: <strong className="text-foreground">{workspaceName}</strong>
                </label>
                <input
                  id="onay-metni"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-rose-400/40"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={reset}
                  disabled={busy}
                  className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm text-foreground hover:bg-muted"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleRestore}
                  disabled={busy || !confirmed}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Geri Yükle
                </button>
              </div>
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            Bu işletmede aktif bir dönem kilidi varsa geri yükleme hata verir — önce Dönem
            Kilitleme sayfasından kilidi kaldırın.
          </p>
        </div>
      </div>
    </div>
  );
}
