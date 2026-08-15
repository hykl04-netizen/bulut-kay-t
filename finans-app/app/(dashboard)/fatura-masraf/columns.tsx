'use client';

import { ColumnDef, Row, Table } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, CheckCircle2, Repeat, ExternalLink } from "lucide-react";
import { useState } from "react";
import { EditableCell } from "@/components/data-table/editable-cell";

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
  const [open, setOpen] = useState(false);
  const meta = table.options.meta as BillTableMeta | undefined;
  const status = row.original.status;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
      >
        <MoreHorizontal className="w-4 h-4 text-slate-500 dark:text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20">
            <button
              onClick={() => { meta?.onEdit(row.original); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <Pencil className="w-3.5 h-3.5" /> Düzenle
            </button>
            <button
              onClick={() => { meta?.onToggleStatus(row.original.id, status); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {status === 'odenmedi' ? 'Ödendi olarak işaretle' : 'Ödenmedi olarak işaretle'}
            </button>
            <button
              onClick={() => { meta?.onDelete(row.original.id); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-rose-50 text-rose-600"
            >
              <Trash2 className="w-3.5 h-3.5" /> Sil
            </button>
          </div>
        </>
      )}
    </div>
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
            className="font-medium text-slate-900 dark:text-slate-50"
            onSave={(v) => meta!.onCellEdit(row.original.id, 'title', v)}
          />
          {row.original.is_recurring && (
            <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 shrink-0" title={`Tekrarlayan: ${row.original.recurrence_period ?? ''}`}>
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
          display={<span className="font-medium text-slate-900 dark:text-slate-50">{formatted}</span>}
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
          display={date ? new Date(date).toLocaleDateString("tr-TR") : <span className="text-slate-400 dark:text-slate-500">-</span>}
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
      if (!isRecurring) return <span className="text-slate-400 dark:text-slate-500 text-sm">Tek seferlik</span>;
      const label = period === 'aylik' ? 'Aylık' : period === 'yillik' ? 'Yıllık' : period;
      return <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>;
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
      if (!url) return <span className="text-xs text-slate-400 dark:text-slate-500">-</span>;
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