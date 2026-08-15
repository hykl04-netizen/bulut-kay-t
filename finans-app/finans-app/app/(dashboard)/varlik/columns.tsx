'use client';

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { useState } from "react";

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
};

function ActionsCell({ row, table }: { row: any; table: any }) {
  const [open, setOpen] = useState(false);
  const meta = table.options.meta as AssetTableMeta | undefined;

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
          <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
            <button
              onClick={() => { meta?.onEdit(row.original); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-slate-700"
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
    cell: ({ row }) => <span className="font-medium text-slate-900">{row.getValue("asset_name")}</span>,
  },
  {
    accessorKey: "asset_type",
    header: "Tür",
    cell: ({ row }) => {
      const type = row.getValue("asset_type") as string | null;
      return type ? <span className="text-slate-600 text-sm">{type}</span> : <span className="text-slate-400">-</span>;
    },
  },
  {
    accessorKey: "current_value",
    header: "Güncel Değer",
    cell: ({ row }) => {
      const value = parseFloat(row.getValue("current_value"));
      const currency = row.original.currency;
      const formatted = new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: currency || "TRY",
      }).format(value);
      return <span className="font-semibold text-slate-900">{formatted}</span>;
    },
  },
  {
    accessorKey: "notes",
    header: "Not",
    cell: ({ row }) => {
      const notes = row.getValue("notes") as string | null;
      return notes ? <span className="text-slate-500 text-sm">{notes}</span> : <span className="text-slate-400">-</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => <ActionsCell row={row} table={table} />,
  },
];