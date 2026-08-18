import { supabase } from '@/lib/supabase/client';

/**
 * Yedekleme ve GERİ YÜKLEME.
 *
 * Önceden yalnızca dışa aktarma vardı ve 6 tabloyu kapsıyordu — geri
 * yüklenemeyen ve eksik bir yedek, yanlış bir güvenlik hissi veriyordu.
 * Artık:
 *   - Tüm işletme tabloları yedekleniyor (fatura ve cari dahil),
 *   - Yedek İŞLETME bazlı (workspace_id ile filtreleniyor),
 *   - `restoreFromBackup` ile geri yüklenebiliyor.
 */

/** Yedeğe dahil edilen tablolar — INSERT sırası FK bağımlılıklarına göre. */
export const BACKUP_TABLES = [
  'categories',
  'bank_accounts',
  'customers',
  'invoices',
  'invoice_items',
  'transactions',
  'bills',
  'debts',
  'budgets',
  'documents',
  'investments',
  'assets',
  'payrolls',
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

export interface BackupPayload {
  version: number;
  exportDate: string;
  workspaceId?: string;
  workspaceName?: string;
  data: Partial<Record<BackupTable, Record<string, unknown>[]>>;
}

/** Yedek biçimi sürümü. v1 = eski 6 tablolu biçim, v2 = tüm tablolar + workspace bilgisi. */
export const BACKUP_VERSION = 2;

// ---------------------------------------------------------------------------
// Dışa aktarma
// ---------------------------------------------------------------------------

export async function buildBackupPayload(workspaceId: string): Promise<BackupPayload> {
  const results = await Promise.all(
    BACKUP_TABLES.map((table) => supabase.from(table).select('*').eq('workspace_id', workspaceId))
  );

  const failed = results.findIndex((r) => r.error);
  if (failed >= 0) {
    throw new Error(`"${BACKUP_TABLES[failed]}" tablosu okunamadı: ${results[failed].error?.message}`);
  }

  const { data: ws } = await supabase.from('workspaces').select('name').eq('id', workspaceId).maybeSingle();

  const data: BackupPayload['data'] = {};
  BACKUP_TABLES.forEach((table, i) => {
    data[table] = (results[i].data ?? []) as Record<string, unknown>[];
  });

  return {
    version: BACKUP_VERSION,
    exportDate: new Date().toISOString(),
    workspaceId,
    workspaceName: (ws as { name: string } | null)?.name,
    data,
  };
}

export async function exportAllDataAsJSON(
  workspaceId: string
): Promise<{ success: boolean; error?: unknown }> {
  try {
    const payload = await buildBackupPayload(workspaceId);
    const safeName = (payload.workspaceName ?? 'isletme').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase();

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finans-yedek-${safeName}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error('Yedekleme hatası:', error);
    return { success: false, error };
  }
}

// ---------------------------------------------------------------------------
// Geri yükleme
// ---------------------------------------------------------------------------

/** Silme sırası — INSERT sırasının tersi (FK'lar bozulmasın diye). */
const DELETE_ORDER = [...BACKUP_TABLES].reverse();

export interface RestoreSummary {
  table: BackupTable;
  inserted: number;
}

export function parseBackupFile(text: string): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Dosya geçerli bir JSON değil.');
  }

  const payload = parsed as Partial<BackupPayload>;
  if (!payload || typeof payload !== 'object' || !payload.data || typeof payload.data !== 'object') {
    throw new Error('Bu dosya bir FinansApp yedeği gibi görünmüyor.');
  }
  if (typeof payload.version !== 'number' || payload.version > BACKUP_VERSION) {
    throw new Error(
      `Yedek sürümü desteklenmiyor (v${String(payload.version)}). Uygulamanın daha yeni bir sürümü gerekiyor.`
    );
  }
  return payload as BackupPayload;
}

/** Yedekteki kayıt sayısını tablo bazında özetler — onay ekranında gösterilir. */
export function summarizeBackup(payload: BackupPayload): { table: BackupTable; count: number }[] {
  return BACKUP_TABLES.map((table) => ({ table, count: payload.data[table]?.length ?? 0 })).filter(
    (row) => row.count > 0
  );
}

/**
 * Yedeği seçili işletmeye geri yükler.
 *
 * ⚠️ ÜZERİNE YAZAR: Hedef işletmedeki mevcut kayıtlar önce silinir, sonra
 * yedektekiler yazılır. "Birleştirme" bilinçli olarak uygulanmadı — aynı kaydın
 * iki kopyasını oluşturmak, muhasebe verisinde sessizce yanlış sonuç üretir.
 *
 * Kayıtlar kendi id'leriyle geri yazılır; böylece tablolar arası ilişkiler
 * (fatura↔kalem, işlem↔kategori, işlem↔banka hesabı) korunur. `workspace_id`
 * ve `user_id` hedef işletmeye/oturuma göre yeniden yazılır — başka bir
 * işletmenin yedeği de güvenle yüklenebilir.
 *
 * NOT: Hedef işletmede aktif bir DÖNEM KİLİDİ varsa kilitli tarihli kayıtlar
 * silinemez/eklenemez ve geri yükleme hata verir. Önce kilidi kaldırın.
 */
export async function restoreFromBackup(
  payload: BackupPayload,
  workspaceId: string,
  userId: string
): Promise<RestoreSummary[]> {
  // 1) Mevcut veriyi temizle (FK sırasına göre).
  for (const table of DELETE_ORDER) {
    const { error } = await supabase.from(table).delete().eq('workspace_id', workspaceId);
    if (error) {
      throw new Error(`"${table}" tablosu temizlenemedi: ${error.message}`);
    }
  }

  // 2) Yedeği yaz.
  const summary: RestoreSummary[] = [];
  for (const table of BACKUP_TABLES) {
    const rows = payload.data[table];
    if (!rows || rows.length === 0) continue;

    const prepared = rows.map((row) => ({
      ...row,
      workspace_id: workspaceId,
      user_id: userId,
    }));

    // Büyük tablolarda istek boyutunu sınırlamak için parçalar hâlinde yaz.
    const CHUNK = 500;
    for (let i = 0; i < prepared.length; i += CHUNK) {
      const { error } = await supabase.from(table).insert(prepared.slice(i, i + CHUNK));
      if (error) {
        throw new Error(`"${table}" tablosu geri yüklenemedi: ${error.message}`);
      }
    }
    summary.push({ table, inserted: prepared.length });
  }

  return summary;
}

export const TABLE_LABELS: Record<BackupTable, string> = {
  categories: 'Kategoriler',
  bank_accounts: 'Banka hesapları',
  customers: 'Cariler',
  invoices: 'Kesilen faturalar',
  invoice_items: 'Fatura kalemleri',
  transactions: 'Gelir/gider kayıtları',
  bills: 'Faturalar & masraflar',
  debts: 'Borç/alacak',
  budgets: 'Bütçeler',
  documents: 'Belgeler',
  investments: 'Yatırımlar',
  assets: 'Varlıklar',
  payrolls: 'Bordro kayıtları',
};
