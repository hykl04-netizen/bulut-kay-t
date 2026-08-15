'use client';

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Trash2, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export type Debt = {
  id: string;
  direction: 'borc' | 'alacak';
  counterparty: string;
  amount: number;
  currency: string;
  due_date: string | null;
  status: 'acik' | 'kapandi';
  notes: string | null;
};

type DebtTableMeta = {
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: 'acik' | 'kapandi') => void;
};

function ActionsCell({ row, table }: { row: any; table: any }) {
  const [open, setOpen] = useState(false);
  const meta = table.options.meta as DebtTableMeta | undefined;
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
              {status === 'acik' ? 'Kapandı olarak işaretle' : 'Tekrar aç'}
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

export const columns: ColumnDef<Debt>[] = [
  {
    accessorKey: "direction",
    header: "Tür",
    cell: ({ row }) => {
      const direction = row.getValue("direction") as string;
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          direction === 'borc' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
        }`}>
          {direction === 'borc' ? 'Borç' : 'Alacak'}
        </span>
      );
    },
  },
  {
    accessorKey: "counterparty",
    header: "Kime / Kimden",
  },
  {
    accessorKey: "amount",
    header: "Tutar",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const currency = row.original.currency;
      const formatted = new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: currency || "TRY",
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
    accessorKey: "status",
    header: "Durum",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          status === 'acik' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
        }`}>
          {status === 'acik' ? 'Açık' : 'Kapandı'}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => <ActionsCell row={row} table={table} />,
  },
];