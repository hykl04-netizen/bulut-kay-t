// Çoklu kullanıcı / rol yönetimi için paylaşılan tipler ve yardımcılar.
// DB tarafındaki roller ile birebir eşleşir (bkz. supabase/migrations/20260816_team_roles.sql).

export type TeamRole = 'sahip' | 'yonetici' | 'muhasebeci' | 'salt_gorunum';

export type InvitableRole = Exclude<TeamRole, 'sahip'>;

export type MemberStatus = 'beklemede' | 'aktif' | 'iptal';

export interface TeamMember {
  id: number;
  account_id: string;
  member_user_id: string | null;
  invited_email: string;
  role: InvitableRole;
  status: MemberStatus;
  invited_by: string;
  invited_at: string;
  joined_at: string | null;
}

export const ROLE_LABELS: Record<TeamRole, string> = {
  sahip: 'Sahip',
  yonetici: 'Yönetici',
  muhasebeci: 'Muhasebeci',
  salt_gorunum: 'Salt Görüntüleme',
};

export const ROLE_DESCRIPTIONS: Record<InvitableRole, string> = {
  yonetici: 'Sahiple eşit yetki: veri ekleyip düzenleyebilir, ekip üyesi davet edip rol/erişim yönetebilir.',
  muhasebeci: 'Veri ekleyip düzenleyebilir (gelir/gider, fatura, borç, vb.) ancak ekip üyelerini yönetemez.',
  salt_gorunum: 'Sadece görüntüleyebilir; hiçbir kayıt ekleyip düzenleyemez veya silemez. Bordro verilerini göremez.',
};

export const INVITABLE_ROLES: InvitableRole[] = ['yonetici', 'muhasebeci', 'salt_gorunum'];

export const STATUS_LABELS: Record<MemberStatus, string> = {
  beklemede: 'Davet Bekliyor',
  aktif: 'Aktif',
  iptal: 'İptal Edildi',
};

/** salt_gorunum rolü hariç herkes veri ekleyip düzenleyebilir. */
export function canEditData(role: TeamRole): boolean {
  return role === 'sahip' || role === 'yonetici' || role === 'muhasebeci';
}

/** Bordro verisi sadece sahip/yönetici/muhasebeci için görünür (salt_gorunum hariç). */
export function canViewPayroll(role: TeamRole): boolean {
  return role === 'sahip' || role === 'yonetici' || role === 'muhasebeci';
}
