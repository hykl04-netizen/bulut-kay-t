'use client';

import { useEffect, useState } from 'react';
import { MonitorSmartphone, ShieldX, LogOut, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/components/ui/toaster';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { summarizeUserAgent } from '@/lib/user-agent';

interface SessionRow {
  id: string;
  created_at: string;
  updated_at: string | null;
  user_agent: string | null;
  ip: string | null;
  is_current: boolean;
}

export default function OturumlarPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_my_sessions');
    if (error) {
      console.error('Oturumlar alınamadı:', error.message);
      toast.error('Oturumlar yüklenemedi. Bu özellik için migration çalıştırılmış olmalı (bkz. yapılacaklar listesi).');
    } else {
      setSessions((data ?? []) as SessionRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await fetchSessions();
    })();
  }, []);

  const handleRevoke = async (session: SessionRow) => {
    const ok = await confirmDialog({
      title: 'Oturumu sonlandır',
      message: `${summarizeUserAgent(session.user_agent)} cihazındaki oturum sonlandırılsın mı? O cihazdaki kullanıcı bir sonraki istekte otomatik olarak çıkış yapmış olacak.`,
      confirmLabel: 'Sonlandır',
      danger: true,
    });
    if (!ok) return;

    setRevokingId(session.id);
    const { error } = await supabase.rpc('revoke_my_session', { target_session_id: session.id });
    setRevokingId(null);

    if (error) {
      console.error('Oturum sonlandırma hatası:', error.message);
      toast.error('Oturum sonlandırılamadı.');
      return;
    }
    toast.success('Oturum sonlandırıldı.');
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
  };

  const handleRevokeOthers = async () => {
    const ok = await confirmDialog({
      title: 'Diğer tüm oturumlardan çıkış yap',
      message: 'Bu cihaz hariç, hesabınıza giriş yapılmış tüm diğer cihaz ve tarayıcılardaki oturumlar sonlandırılacak. Devam edilsin mi?',
      confirmLabel: 'Tümünü Sonlandır',
      danger: true,
    });
    if (!ok) return;

    setRevokingOthers(true);
    const { data, error } = await supabase.rpc('revoke_other_sessions');
    setRevokingOthers(false);

    if (error) {
      console.error('Toplu oturum sonlandırma hatası:', error.message);
      toast.error('Oturumlar sonlandırılamadı.');
      return;
    }
    toast.success(`${data ?? 0} oturum sonlandırıldı.`);
    fetchSessions();
  };

  const otherSessionsCount = sessions.filter((s) => !s.is_current).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MonitorSmartphone className="h-7 w-7 text-brand-gold" />
          <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Oturum Yönetimi</h1>
        </div>
        {otherSessionsCount > 0 && (
          <button
            onClick={handleRevokeOthers}
            disabled={revokingOthers}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            {revokingOthers ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
            Diğer Tüm Oturumlardan Çıkış Yap
          </button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Hesabınıza giriş yapılmış cihaz ve tarayıcıların listesi. Tanımadığınız bir oturum görürseniz hemen sonlandırın
        ve şifrenizi değiştirin.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground dark:border-border">
          Oturum bilgisi bulunamadı.
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 dark:border-border"
            >
              <div className="flex items-center gap-3">
                <MonitorSmartphone className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground dark:text-foreground">
                      {summarizeUserAgent(session.user_agent)}
                    </span>
                    {session.is_current && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        Bu oturum
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Son aktif: {new Date(session.updated_at ?? session.created_at).toLocaleString('tr-TR')}
                    {session.ip ? ` · IP: ${session.ip}` : ''}
                  </p>
                </div>
              </div>

              {!session.is_current && (
                <button
                  onClick={() => handleRevoke(session)}
                  disabled={revokingId === session.id}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  {revokingId === session.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                  Çıkış Yap
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
