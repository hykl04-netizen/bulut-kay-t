'use client';

import { ColumnDef, Row, Table } from "@tanstack/react-table";
import { Pencil, Trash2, CheckCircle2, Repeat, ExternalLink } from "lucide-react";
import { EditableCell } from "@/components/data-table/editable-cell";
import { RowActionsMenu } from "@/components/data-table/row-actions-menu";

export type Bill = {
  id: string;
  title: string;
  amount: number;
  due_date: string | null;
  is_recurring: boolean;
  recurrence_period: string | null;
  status: 'odendi' | 'odenmedi';
  category_id?: string | null;
  receipt_url?: string | null;
};

type BillTableMeta = {
  onEdit: (row: Bill) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: 'odendi' | 'odenmedi') => void;
  onCellEdit: (id: string, field: 'title' | 'amount' | 'due_date', value: string) => Promise<void>;
};

function ActionsCell({ row, table }: { row: Row<Bill>; table: Table<Bill> }) {
  const meta = table.options.meta as BillTableMeta | undefined;
  const status = row.original.status;

  return (
    <RowActionsMenu>
      {(close) => (
        <>
          <button
            onClick={() => { meta?.onEdit(row.original); close(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted dark:hover:bg-secondary text-foreground dark:text-muted-foreground"
          >
            <Pencil className="w-3.5 h-3.5" /> Düzenle
          </button>
          <button
            onClick={() => { meta?.onToggleStatus(row.original.id, status); close(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted dark:hover:bg-secondary text-foreground dark:text-muted-foreground"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {status === 'odenmedi' ? 'Ödendi olarak işaretle' : 'Ödenmedi olarak işaretle'}
          </button>
          <button
            onClick={() => { meta?.onDelete(row.original.id); close(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-rose-50 text-rose-600"
          >
            <Trash2 className="w-3.5 h-3.5" /> Sil
          </button>
        </>
      )}
    </RowActionsMenu>
  );
}

export const columns: ColumnDef<Bill>[] = [
  {
    accessorKey: "title",
    header: "Başlık",
    cell: ({ row, table }) => {
      const meta = table.options.meta as BillTableMeta | undefined;
      return (
        <div className="flex items-center gap-2">
          <EditableCell
            value={row.original.title}
            className="font-medium text-foreground dark:text-foreground"
            onSave={(v) => meta!.onCellEdit(row.original.id, 'title', v)}
          />
          {row.original.is_recurring && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground dark:text-muted-foreground shrink-0" title={`Tekrarlayan: ${row.original.recurrence_period ?? ''}`}>
              <Repeat className="w-3 h-3" />
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "amount",
    header: "Tutar",
    cell: ({ row, table }) => {
      const meta = table.options.meta as BillTableMeta | undefined;
      const amount = row.original.amount;
      const formatted = new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
      }).format(amount);
      return (
        <EditableCell
          type="number"
          step="0.01"
          value={amount}
          display={<span className="font-medium text-foreground dark:text-foreground">{formatted}</span>}
          onSave={(v) => meta!.onCellEdit(row.original.id, 'amount', v)}
        />
      );
    },
  },
  {
    accessorKey: "due_date",
    header: "Vade Tarihi",
    cell: ({ row, table }) => {
      const meta = table.options.meta as BillTableMeta | undefined;
      const date = row.original.due_date;
      return (
        <EditableCell
          type="date"
          value={date ?? ''}
          display={date ? new Date(date).toLocaleDateString("tr-TR") : <span className="text-muted-foreground dark:text-muted-foreground">-</span>}
          onSave={(v) => meta!.onCellEdit(row.original.id, 'due_date', v)}
        />
      );
    },
  },
  {
    accessorKey: "recurrence_period",
    header: "Tekrar",
    cell: ({ row }) => {
      const isRecurring = row.original.is_recurring;
      const period = row.getValue("recurrence_period") as string | null;
      if (!isRecurring) return <span className="text-muted-foreground dark:text-muted-foreground text-sm">Tek seferlik</span>;
      const label = period === 'aylik' ? 'Aylık' : period === 'yillik' ? 'Yıllık' : period;
      return <span className="text-sm text-muted-foreground dark:text-muted-foreground">{label}</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Durum",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          status === 'odendi' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {status === 'odendi' ? 'Ödendi' : 'Ödenmedi'}
        </span>
      );
    },
  },
  {
    id: "receipt_url",
    header: "Belge",
    cell: ({ row }) => {
      const url = row.original.receipt_url;
      if (!url) return <span className="text-xs text-muted-foreground dark:text-muted-foreground">-</span>;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Görüntüle
        </a>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => <ActionsCell row={row} table={table} />,
  },
];