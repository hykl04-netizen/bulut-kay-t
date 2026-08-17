// finans-app/lib/backup.ts
import { supabase } from '@/lib/supabase/client';

export interface BackupPayload {
  version: number;
  exportDate: string;
  data: {
    categories: Record<string, unknown>[];
    transactions: Record<string, unknown>[];
    debts: Record<string, unknown>[];
    bills: Record<string, unknown>[];
    investments: Record<string, unknown>[];
    assets: Record<string, unknown>[];
  };
}

// 1. JSON Olarak Dışa Aktar (Yedek İndir)
export async function exportAllDataAsJSON(): Promise<{ success: boolean; error?: unknown }> {
  try {
    const [
      { data: categories, error: catErr },
      { data: transactions, error: trErr },
      { data: debts, error: dErr },
      { data: bills, error: bErr },
      { data: investments, error: invErr },
      { data: assets, error: assErr },
    ] = await Promise.all([
      supabase.from('categories').select('*'),
      supabase.from('transactions').select('*'),
      supabase.from('debts').select('*'),
      supabase.from('bills').select('*'),
      supabase.from('investments').select('*'),
      supabase.from('assets').select('*'),
    ]);

    if (catErr || trErr || dErr || bErr || invErr || assErr) {
      throw new Error('Tablolardan veri çekilirken hata oluştu.');
    }

    const payload: BackupPayload = {
      version: 1,
      exportDate: new Date().toISOString(),
      data: {
        categories: categories || [],
        transactions: transactions || [],
        debts: debts || [],
        bills: bills || [],
        investments: investments || [],
        assets: assets || [],
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finans-yedek-${new Date().toISOString().split('T')[0]}.json`;
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