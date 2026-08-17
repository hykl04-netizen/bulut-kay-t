'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { History, Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { getCurrentAccountId } from '@/lib/supabase/account';

interface AuditLogRow {
  id: number;
  table_name: string;
  record_id: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

const TABLE_LABELS: Record<string, string> = {
  transactions: 'Gelir/Gider',
  bills: 'Fatura/Masraf',
  debts: 'Borç/Alacak',
  investments: 'Yatırım',
  assets: 'Varlık',
  budgets: 'Bütçe',
  bank_accounts: 'Banka Hesabı',
  documents: 'Belge',
  categories: 'Kategori',
  payrolls: 'Bordro',
};

const ACTION_META: Record<AuditLogRow['action'], { label: string; icon: typeof Plus; className: string }> = {
  INSERT: { label: 'Eklendi', icon: Plus, className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  UPDATE: { label: 'Güncellendi', icon: Pencil, className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  DELETE: { label: 'Silindi', icon: Trash2, className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' },
};

const PAGE_SIZE = 25;

function summarizeRow(row: AuditLogRow): string {
  const data = row.new_data ?? row.old_data;
  if (!data) return row.record_id ?? '-';
  const candidateKeys = ['title', 'name', 'symbol', 'description'];
  for (const key of candidateKeys) {
    if (typeof data[key] === 'string' && (data[key] as string).trim()) return data[key] as string;
  }
  if (typeof data.amount === 'number') {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(data.amount as number);
  }
  return row.record_id ?? '-';
}

function DiffRow({ row }: { row: AuditLogRow }) {
  const [open, setOpen] = useState(false);
  const changedFields = useMemo(() => {
    if (row.action !== 'UPDATE' || !row.old_data || !row.new_data) return [];
    const keys = new Set([...Object.keys(row.old_data), ...Object.keys(row.new_data)]);
    const diffs: { key: string; before: unknown; after: unknown }[] = [];
    keys.forEach((key) => {
      if (key === 'updated_at') return;
      const before = row.old_data?.[key];
      const after = row.new_data?.[key];
      if (JSON.stringify(before) !== JSON.stringify(after)) diffs.push({ key, before, after });
    });
    return diffs;
  }, [row]);

  const actionMeta = ACTION_META[row.action];
  const ActionIcon = actionMeta.icon;

  return (
    <div className="rounded-xl border border-border bg-card dark:border-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${actionMeta.className}`}>
            <ActionIcon className="h-3 w-3" />
            {actionMeta.label}
          </span>
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
            {TABLE_LABELS[row.table_name] ?? row.table_name}
          </span>
          <span className="truncate text-sm text-foreground dark:text-foreground">{summarizeRow(row)}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <span>{new Date(row.created_at).toLocaleString('tr-TR')}</span>
          {row.action === 'UPDATE' && (open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
        </div>
      </button>

      {open && changedFields.length > 0 && (
        <div className="border-t border-border px-4 py-3 dark:border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-1 pr-4 font-medium">Alan</th>
                <th className="pb-1 pr-4 font-medium">Önceki</th>
                <th className="pb-1 font-medium">Yeni</th>
              </tr>
            </thead>
            <tbody>
              {changedFields.map((f) => (
                <tr key={f.key} className="border-t border-border/60 dark:border-border/60">
                  <td className="py-1 pr-4 font-medium text-foreground dark:text-foreground">{f.key}</td>
                  <td className="py-1 pr-4 text-rose-600 dark:text-rose-400">{String(f.before ?? '—')}</td>
                  <td className="py-1 text-emerald-600 dark:text-emerald-400">{String(f.after ?? '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AktiviteGecmisiPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const accountId = await getCurrentAccountId(user.id);

      let query = supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .eq('user_id', accountId)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (tableFilter !== 'all') query = query.eq('table_name', tableFilter);
      if (actionFilter !== 'all') query = query.eq('action', actionFilter);

      const { data, error, count } = await query;
      if (cancelled) return;
      if (error) {
        // audit_log tablosu henüz oluşturulmamışsa (migration çalıştırılmadıysa)
        // sayfa kırılmasın diye sessizce boş liste gösteriyoruz.
        setLogs([]);
        setTotalCount(0);
      } else {
        setLogs((data ?? []) as AuditLogRow[]);
        setTotalCount(count ?? 0);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [page, tableFilter, actionFilter]);

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground dark:text-foreground">
          <History className="h-7 w-7 text-brand-gold" />
          Aktivite Geçmişi
        </h1>
        <p className="mt-1 text-muted-foreground dark:text-muted-foreground">
          Kayıtlarınızda kim ne zaman ne değiştirdi — tüm ekleme, güncelleme ve silme işlemleri burada.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={tableFilter}
          onChange={(e) => { setTableFilter(e.target.value); setPage(0); }}
          className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm dark:border-border dark:text-foreground"
        >
          <option value="all" className="dark:bg-popover dark:text-popover-foreground">Tüm Tablolar</option>
          {Object.entries(TABLE_LABELS).map(([key, label]) => (
            <option key={key} value={key} className="dark:bg-popover dark:text-popover-foreground">{label}</option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm dark:border-border dark:text-foreground"
        >
          <option value="all" className="dark:bg-popover dark:text-popover-foreground">Tüm İşlemler</option>
          <option value="INSERT" className="dark:bg-popover dark:text-popover-foreground">Eklendi</option>
          <option value="UPDATE" className="dark:bg-popover dark:text-popover-foreground">Güncellendi</option>
          <option value="DELETE" className="dark:bg-popover dark:text-popover-foreground">Silindi</option>
        </select>
      </div>

      {loading ? (
        <div className="card-empty-state">
          Yükleniyor...
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-12 text-center text-muted-foreground shadow-sm dark:border-border">
          Henüz kayıtlı aktivite yok. (Bu sayfa çalışmıyorsa `supabase/migrations/20260816_audit_log.sql`
          dosyasını Supabase SQL Editor&apos;de çalıştırdığınızdan emin olun.)
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((row) => (
              <DiffRow key={row.id} row={row} />
            ))}
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-border"
              >
                Önceki
              </button>
              <span>Sayfa {page + 1} / {pageCount}</span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                className="rounded-lg border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-border"
              >
                Sonraki
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
