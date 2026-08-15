'use client';

import { ColumnDef, Row, Table } from "@tanstack/react-table";
import { MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { EditableCell } from "@/components/data-table/editable-cell";

export type Asset = {
  id: string;
  asset_name: string;
  asset_type: string | null;
  current_value: number;
  currency: string;
  notes: string | null;
};

type AssetTableMeta = {
  onEdit: (row: Asset) => void;
  onDelete: (id: string) => void;
  onCellEdit: (id: string, field: 'asset_name' | 'current_value', value: string) => Promise<void>;
};

function ActionsCell({ row, table }: { row: Row<Asset>; table: Table<Asset> }) {
  const [open, setOpen] = useState(false);
  const meta = table.options.meta as AssetTableMeta | undefined;

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

export const columns: ColumnDef<Asset>[] = [
  {
    accessorKey: "asset_name",
    header: "Varlık Adı",
    cell: ({ row, table }) => {
      const meta = table.options.meta as AssetTableMeta | undefined;
      return (
        <EditableCell
          value={row.original.asset_name}
          className="font-medium text-slate-900 dark:text-slate-50"
          onSave={(v) => meta!.onCellEdit(row.original.id, 'asset_name', v)}
        />
      );
    },
  },
  {
    accessorKey: "asset_type",
    header: "Tür",
    cell: ({ row }) => {
      const type = row.getValue("asset_type") as string | null;
      return type ? <span className="text-slate-600 dark:text-slate-400 text-sm">{type}</span> : <span className="text-slate-400 dark:text-slate-500">-</span>;
    },
  },
  {
    accessorKey: "current_value",
    header: "Güncel Değer",
    cell: ({ row, table }) => {
      const meta = table.options.meta as AssetTableMeta | undefined;
      const value = row.original.current_value;
      const currency = row.original.currency;
      const formatted = new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: currency || "TRY",
      }).format(value);
      return (
        <EditableCell
          type="number"
          step="0.01"
          value={value}
          display={<span className="font-semibold text-slate-900 dark:text-slate-50">{formatted}</span>}
          onSave={(v) => meta!.onCellEdit(row.original.id, 'current_value', v)}
        />
      );
    },
  },
  {
    accessorKey: "notes",
    header: "Not",
    cell: ({ row }) => {
      const notes = row.getValue("notes") as string | null;
      return notes ? <span className="text-slate-500 dark:text-slate-400 text-sm">{notes}</span> : <span className="text-slate-400 dark:text-slate-500">-</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => <ActionsCell row={row} table={table} />,
  },
];