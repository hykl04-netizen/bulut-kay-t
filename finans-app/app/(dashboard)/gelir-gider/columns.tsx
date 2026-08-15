'use client';

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { EditableCell } from "@/components/data-table/editable-cell";

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'gelir' | 'gider';
  category_id: string | null;
  category: { name: string; color: string } | null; // Supabase join ile gelir
};

type TransactionTableMeta = {
  onEdit: (row: Transaction) => void;
  onDelete: (id: string) => void;
  onCellEdit: (id: string, field: 'description' | 'amount' | 'date', value: string) => Promise<void>;
};

function ActionsCell({ row, table }: { row: any; table: any }) {
  const [open, setOpen] = useState(false);
  const meta = table.options.meta as TransactionTableMeta | undefined;

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
          <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20">
            <button
              onClick={() => { meta?.onEdit(row.original); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <Pencil className="w-3.5 h-3.5" /> Düzenle
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

export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "date",
    header: "Tarih",
    cell: ({ row, table }) => {
      const meta = table.options.meta as TransactionTableMeta | undefined;
      const raw = row.original.date; // 'YYYY-MM-DD'
      return (
        <EditableCell
          type="date"
          value={raw}
          display={new Date(raw).toLocaleDateString("tr-TR")}
          onSave={(v) => meta!.onCellEdit(row.original.id, 'date', v)}
        />
      );
    },
  },
  {
    accessorKey: "description",
    header: "Açıklama",
    cell: ({ row, table }) => {
      const meta = table.options.meta as TransactionTableMeta | undefined;
      return (
        <EditableCell
          value={row.original.description}
          onSave={(v) => meta!.onCellEdit(row.original.id, 'description', v)}
        />
      );
    },
  },
  {
    accessorKey: "category",
    header: "Kategori",
    cell: ({ row }) => {
      const category = row.original.category;
      if (!category) return <span className="text-slate-400 dark:text-slate-500 text-sm">-</span>;
      return (
        <span
          className="px-2 py-1 rounded-full text-xs font-medium"
          style={{ backgroundColor: `${category.color}20`, color: category.color }}
        >
          {category.name}
        </span>
      );
    },
  },
  {
    accessorKey: "amount",
    header: "Tutar",
    cell: ({ row, table }) => {
      const meta = table.options.meta as TransactionTableMeta | undefined;
      const amount = row.original.amount;
      const type = row.original.type;
      const formatted = new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
      }).format(amount);
      return (
        <EditableCell
          type="number"
          step="0.01"
          value={amount}
          display={
            <span className={`font-medium ${type === 'gelir' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {type === 'gelir' ? '+' : '-'}{formatted}
            </span>
          }
          onSave={(v) => meta!.onCellEdit(row.original.id, 'amount', v)}
        />
      );
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => <ActionsCell row={row} table={table} />,
  },
];