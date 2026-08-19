/**
 * Faz 11 — workspace (hesap) tipleri.
 *
 * DİKKAT — bu, roller ile KARIŞTIRILMAMASI gereken ikinci bir eksendir:
 *
 *   type (bu dosya)          → bu hesap NE? aile / şirket / müşavir ofisi
 *                              → hangi ÖZELLİKLER görünür
 *   TeamRole (lib/team.ts)   → sen bu hesapta NE YAPABİLİRSİN?
 *                              → sahip / yonetici / muhasebeci / salt_gorunum
 *
 * İkisi diktir. Aynı kullanıcı aile hesabında `sahip`, kendi şirketinde
 * `sahip`, müşterisinin işletmesinde `muhasebeci` olabilir. Eğer
 * "Aile / Şirket / Muhasebeci" bir ROL olarak modellenseydi, hem şirket
 * sahibi hem aile babası olan kullanıcı tek bir role hapsolurdu.
 *
 * DB karşılığı: `workspaces.type`
 * (bkz. supabase/migrations/20260826_workspace_types.sql)
 */

export type WorkspaceType = 'aile' | 'sirket' | 'musavir_ofisi';

export const WORKSPACE_TYPES: WorkspaceType[] = ['aile', 'sirket', 'musavir_ofisi'];

export const WORKSPACE_TYPE_LABELS: Record<WorkspaceType, string> = {
  aile: 'Aile / Bireysel',
  sirket: 'İşletme',
  musavir_ofisi: 'Müşavir Ofisi',
};

/** Kurulum sihirbazının ilk adımında gösterilen seçenekler. */
export const WORKSPACE_TYPE_OPTIONS: {
  key: WorkspaceType;
  label: string;
  description: string;
}[] = [
  {
    key: 'aile',
    label: 'Ailem / kendim için',
    description:
      'Ev bütçesi, aylık gelir-gider ve birikim takibi. Fatura kesme, cari ve bordro ekranları gizlenir.',
  },
  {
    key: 'sirket',
    label: 'İşletmem için',
    description:
      'Fatura kesme, cari hesaplar, alacak takibi, bordro ve nakit akışı. Muhasebecinize erişim verebilirsiniz.',
  },
  {
    key: 'musavir_ofisi',
    label: 'Mali müşavirlik ofisim için',
    description:
      'Kendi ofisinizin defterine ek olarak, size davet edilen mükelleflerin işletmelerine tek yerden geçiş.',
  },
];

/** Aile dışındaki her şey ticari defter tutar. */
export function isBusinessType(type: WorkspaceType): boolean {
  return type !== 'aile';
}

/**
 * Rol etiketleri hesap tipine göre değişir — aile hesabında "Yönetici"
 * demek kullanıcıya hiçbir şey anlatmaz, "Eş / Ortak" anlatır.
 * Buradaki anahtarlar lib/team.ts'teki TeamRole ile birebir aynı olmalı.
 */
export const ROLE_LABEL_OVERRIDES: Partial<
  Record<WorkspaceType, Partial<Record<string, string>>>
> = {
  aile: {
    sahip: 'Hesap Sahibi',
    yonetici: 'Eş / Ortak',
    salt_gorunum: 'Sadece Görebilir',
  },
};

/** Verilen hesap tipinde bir rolün nasıl adlandırılacağını döner. */
export function roleLabelFor(type: WorkspaceType, role: string, fallback: string): string {
  return ROLE_LABEL_OVERRIDES[type]?.[role] ?? fallback;
}
