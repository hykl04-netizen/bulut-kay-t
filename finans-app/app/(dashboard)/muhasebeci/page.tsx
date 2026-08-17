'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Calculator, Loader2, Mail, Trash2, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import { useTeamRole } from '@/lib/use-team-role';
import { STATUS_LABELS, type TeamMember } from '@/lib/team';
import { toast } from '@/components/ui/toaster';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Faz 6 — "Muhasebecinizi davet edin".
 *
 * Teknik olarak Faz 4'teki ekip davetinin ta kendisi (rol sabit:
 * `muhasebeci`), ama kullanıcıya tanıdık tek bir kavram olarak sunuluyor.
 * Küçük işletme sahibinin "rol/yetki" tablosuyla uğraşmadan tek alanda
 * muhasebecisini ekleyebilmesi hedefleniyor.
 *
 * Muhasebeci rolü: tüm kayıtları görebilir ve düzenleyebilir, ekip
 * yönetemez. Aylık dönem özeti e-postası da bu role göre gönderilir
 * (app/api/cron/muhasebeci-ozeti).
 */
export default function MuhasebeciPage() {
  const { role, loading: roleLoading } = useTeamRole();
  const canManage = role === 'sahip' || role === 'yonetici';

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ekip');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Liste alınamadı.');
      }
      const data = await res.json();
      setMembers(data.members ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Liste alınamadı.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (roleLoading || !canManage) return;
    queueMicrotask(() => {
      fetchMembers();
    });
  }, [roleLoading, canManage, fetchMembers]);

  const accountants = members.filter((m) => m.role === 'muhasebeci' && m.status !== 'iptal');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const res = await fetch('/api/ekip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role: 'muhasebeci' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Davet gönderilemedi.');
      toast.success(`${email.trim()} adresine davet gönderildi.`);
      setEmail('');
      await fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Davet gönderilemedi.');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (member: TeamMember) => {
    const ok = await confirmDialog({
      title: 'Muhasebeci erişimini kaldır',
      message: `${member.invited_email} işletmenize erişemesin mi? Erişimi anında kesilir.`,
      confirmLabel: 'Kaldır',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/ekip/${member.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Kaldırılamadı.');
      toast.success('Erişim kaldırıldı.');
      await fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kaldırılamadı.');
    }
  };

  if (!roleLoading && !canManage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Calculator className="h-7 w-7 text-brand-gold" />
          <h1 className="text-3xl font-bold text-foreground">Muhasebeci Erişimi</h1>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">Bu sayfa için sahip veya yönetici rolü gerekiyor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Calculator className="h-7 w-7 text-brand-gold" />
        <h1 className="text-3xl font-bold text-foreground">Muhasebeci Erişimi</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Mali müşavirinize kendi girişini verin — kayıtlarınızı görebilir ve düzenleyebilir, ama
        ekip yönetemez ve abonelik ayarlarınıza dokunamaz. Her ayın başında ona bir önceki ayın
        özetini otomatik e-postayla göndeririz.
      </p>

      <form
        onSubmit={handleInvite}
        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-end"
      >
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="muhasebeci-eposta">Muhasebecinizin e-posta adresi</Label>
          <Input
            id="muhasebeci-eposta"
            type="email"
            required
            placeholder="muhasebeci@ornek.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={inviting || !email.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-secondary disabled:opacity-60"
        >
          {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Davet Gönder
        </button>
      </form>

      <div className="space-y-2">
        <h2 className="font-semibold text-foreground">Yetkili muhasebeciler</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Yükleniyor...</p>
        ) : accountants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Henüz muhasebeci davet edilmemiş.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {accountants.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{m.invited_email}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {m.status === 'aktif' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                    {STATUS_LABELS[m.status]}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(m)}
                  aria-label={`${m.invited_email} erişimini kaldır`}
                  className="rounded p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Muhasebeci de planınızdaki kullanıcı hakkından bir koltuk kullanır. Daha ayrıntılı rol
        yönetimi için{' '}
        <Link href="/ekip" className="text-primary hover:underline">
          Ekip Yönetimi
        </Link>{' '}
        sayfasına bakabilirsiniz.
      </p>
    </div>
  );
}
