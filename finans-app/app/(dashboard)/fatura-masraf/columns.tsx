'use client';

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Trash2, CheckCircle2, Repeat } from "lucide-react";
import { useState } from "react";

export type Bill = {
  id: string;
  title: string;
  amount: number;
  due_date: string | null;
  is_recurring: boolean;
  recurrence_period: string | null;
  status: 'odendi' | 'odenmedi';
};

type BillTableMeta = {
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: 'odendi' | 'odenmedi') => void;
};

function ActionsCell({ row, table }: { row: any; table: any }) {
  const [open, setOpen] = useState(false);
  const meta = table.options.meta as BillTableMeta | undefined;
  const status = row.original.status;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 hover:bg-slate-100 rounded-md transition-colors"
      >
        <MoreHorizontal className="w-4 h-4 text-slate-500" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
            <button
              onClick={() => { meta?.onToggleStatus(row.original.id, status); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-slate-700"
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
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-900">{row.getValue("title")}</span>
        {row.original.is_recurring && (
          <span className="flex items-center gap-1 text-xs text-slate-400" title={`Tekrarlayan: ${row.original.recurrence_period ?? ''}`}>
            <Repeat className="w-3 h-3" />
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "amount",
    header: "Tutar",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const formatted = new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
      }).format(amount);
      return <div className="font-medium text-slate-900">{formatted}</div>;
    },
  },
  {
    accessorKey: "due_date",
    header: "Vade Tarihi",
    cell: ({ row }) => {
      const date = row.getValue("due_date") as string | null;
      return date ? new Date(date).toLocaleDateString("tr-TR") : <span className="text-slate-400">-</span>;
    },
  },
  {
    accessorKey: "recurrence_period",
    header: "Tekrar",
    cell: ({ row }) => {
      const isRecurring = row.original.is_recurring;
      const period = row.getValue("recurrence_period") as string | null;
      if (!isRecurring) return <span className="text-slate-400 text-sm">Tek seferlik</span>;
      const label = period === 'aylik' ? 'Aylık' : period === 'yillik' ? 'Yıllık' : period;
      return <span className="text-sm text-slate-600">{label}</span>;
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
    id: "actions",
    cell: ({ row, table }) => <ActionsCell row={row} table={table} />,
  },
];