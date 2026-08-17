'use client';

import { useEffect, useState } from 'react';
import { Users, UserPlus, Loader2, Trash2, ShieldAlert, Mail, Clock, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/components/ui/toaster';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTeamRole } from '@/lib/use-team-role';
import {
  INVITABLE_ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  STATUS_LABELS,
  type TeamMember,
  type InvitableRole,
} from '@/lib/team';
import { useSubscription } from '@/lib/use-subscription';
import { effectivePlan, getPlan } from '@/lib/plans';

export default function EkipPage() {
  const { role, loading: roleLoading } = useTeamRole();
  const { subscription, loading: subLoading } = useSubscription();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InvitableRole>('muhasebeci');
  const [inviting, setInviting] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const canManage = role === 'sahip' || role === 'yonetici';

  // Plan bazlı kullanıcı limiti (Faz 4). Sahip her zaman 1 kişi sayılır;
  // iptal edilmiş davetler sayılmaz. Asıl kısıt DB tetikleyicisinde
  // (enforce_workspace_user_limit) — burası yalnızca kullanıcıyı önceden
  // bilgilendirip boşuna davet göndermesini engelliyor.
  const plan = getPlan(effectivePlan(subscription));
  const usedSeats = 1 + members.filter((m) => m.status !== 'iptal').length;
  const seatLimit = plan.userLimit;
  const seatsFull = seatLimit !== null && usedSeats >= seatLimit;

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ekip');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Ekip listesi alınamadı.');
      }
      const data = await res.json();
      setMembers(data.members ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ekip listesi alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roleLoading || !canManage) return;
    queueMicrotask(() => {
      fetchMembers();
    });
  }, [roleLoading, canManage]);

  const isLoading = roleLoading || (canManage && loading);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      const res = await fetch('/api/ekip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Davet gönderilemedi.');

      toast.success(`${inviteEmail.trim()} adresine davet gönderildi.`);
      setInviteEmail('');
      fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Davet gönderilemedi.');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (member: TeamMember, newRole: InvitableRole) => {
    if (newRole === member.role) return;
    setUpdatingId(member.id);
    try {
      const res = await fetch(`/api/ekip/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Rol güncellenemedi.');

      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m)));
      toast.success('Rol güncellendi.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rol güncellenemedi.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (member: TeamMember) => {
    const ok = await confirmDialog({
      title: 'Ekip üyesini çıkar',
      message: `${member.invited_email} hesaptan çıkarılsın mı? Erişimi anında kesilecek.`,
      confirmLabel: 'Çıkar',
      danger: true,
    });
    if (!ok) return;

    setUpdatingId(member.id);
    try {
      const res = await fetch(`/api/ekip/${member.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Üye çıkarılamadı.');

      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.success('Üye hesaptan çıkarıldı.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Üye çıkarılamadı.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!roleLoading && !canManage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-brand-gold" />
          <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Ekip Yönetimi</h1>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">
            Bu sayfayı görüntülemek için sahip veya yönetici rolüne sahip olmanız gerekiyor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-7 w-7 text-brand-gold" />
        <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Ekip Yönetimi</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        İşletmenize başka kullanıcılar davet edin ve yetkilerini belirleyin. Yönetici sizinle eşit yetkiye sahiptir,
        muhasebeci kayıt ekleyip düzenleyebilir ama ekip yönetemez, salt görüntüleme ise sadece bakabilir (bordro
        hariç).
      </p>

      {/* Plan bazlı koltuk sayacı */}
      {!subLoading && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            seatsFull
              ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
              : 'border-border bg-card text-muted-foreground'
          }`}
        >
          <span>
            <strong className="text-foreground">{plan.label}</strong> planı —{' '}
            {seatLimit === null
              ? `sınırsız kullanıcı (${usedSeats} kullanılıyor)`
              : `${usedSeats} / ${seatLimit} kullanıcı`}
            {seatsFull && ' · Kullanıcı hakkınız doldu.'}
          </span>
          {seatsFull && (
            <Link
              href="/abonelik"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-secondary transition"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Planı Yükselt
            </Link>
          )}
        </div>
      )}

      {/* Davet formu */}
      <form
        onSubmit={handleInvite}
        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 dark:border-border sm:flex-row sm:items-end"
      >
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="invite-email">E-posta</Label>
          <Input
            id="invite-email"
            type="email"
            required
            placeholder="ornek@sirket.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:w-56">
          <Label htmlFor="invite-role">Rol</Label>
          <select
            id="invite-role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as InvitableRole)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground dark:border-border"
          >
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={inviting || seatsFull}
          title={seatsFull ? 'Planınızdaki kullanıcı hakkı doldu. Yükseltmeniz gerekiyor.' : undefined}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-brand-gold-light disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Davet Et
        </button>
      </form>
      <p className="-mt-4 text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[inviteRole]}</p>

      {/* Üye listesi */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground dark:border-border">
          Henüz davet edilmiş bir ekip üyesi yok.
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 dark:border-border"
            >
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground dark:text-slate-100">
                      {member.invited_email}
                    </span>
                    {member.status !== 'aktif' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                        <Clock className="h-3 w-3" />
                        {STATUS_LABELS[member.status]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Davet eden: {member.invited_at ? new Date(member.invited_at).toLocaleDateString('tr-TR') : '—'}
                    {member.joined_at ? ` · Katıldı: ${new Date(member.joined_at).toLocaleDateString('tr-TR')}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={member.role}
                  disabled={updatingId === member.id}
                  onChange={(e) => handleRoleChange(member, e.target.value as InvitableRole)}
                  className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground disabled:opacity-60 dark:border-border"
                >
                  {INVITABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleRemove(member)}
                  disabled={updatingId === member.id}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  {updatingId === member.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Çıkar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
