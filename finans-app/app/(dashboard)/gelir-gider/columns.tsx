'use client';

import { ColumnDef, Row, Table } from "@tanstack/react-table";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { EditableCell } from "@/components/data-table/editable-cell";
import { RowActionsMenu } from "@/components/data-table/row-actions-menu";

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'gelir' | 'gider';
  category_id: string | null;
  category: { name: string; color: string } | null; // Supabase join ile gelir
  receipt_url?: string | null;
};

type TransactionTableMeta = {
  onEdit: (row: Transaction) => void;
  onDelete: (id: string) => void;
  onCellEdit: (id: string, field: 'description' | 'amount' | 'date', value: string) => Promise<void>;
};

function ActionsCell({ row, table }: { row: Row<Transaction>; table: Table<Transaction> }) {
  const meta = table.options.meta as TransactionTableMeta | undefined;

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
      if (!category) return <span className="text-muted-foreground dark:text-muted-foreground text-sm">-</span>;
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