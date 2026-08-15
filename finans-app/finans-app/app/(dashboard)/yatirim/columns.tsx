'use client';

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { useState } from "react";

export type Investment = {
  id: string;
  asset_type: 'hisse' | 'doviz' | 'kripto' | 'fon' | 'altin';
  symbol: string;
  quantity: number;
  avg_cost: number | null;
  current_price: number | null;
  currency: string;
};

const assetTypeLabels: Record<string, string> = {
  hisse: 'Hisse',
  doviz: 'Döviz',
  kripto: 'Kripto',
  fon: 'Fon',
  altin: 'Altın',
};

const assetTypeColors: Record<string, string> = {
  hisse: 'bg-blue-100 text-blue-700',
  doviz: 'bg-emerald-100 text-emerald-700',
  kripto: 'bg-amber-100 text-amber-700',
  fon: 'bg-purple-100 text-purple-700',
  altin: 'bg-yellow-100 text-yellow-700',
};

type InvestmentTableMeta = {
  onEdit: (row: Investment) => void;
  onDelete: (id: string) => void;
};

function ActionsCell({ row, table }: { row: any; table: any }) {
  const [open, setOpen] = useState(false);
  const meta = table.options.meta as InvestmentTableMeta | undefined;

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
          <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
            <button
              onClick={() => { meta?.onEdit(row.original); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-slate-700"
            >
              <Pencil className="w-3.5 h-3.5" /> Düzenle / Fiyat Güncelle
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

export const columns: ColumnDef<Investment>[] = [
  {
    accessorKey: "asset_type",
    header: "Tür",
    cell: ({ row }) => {
      const type = row.getValue("asset_type") as string;
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${assetTypeColors[type] ?? 'bg-slate-100 text-slate-600'}`}>
          {assetTypeLabels[type] ?? type}
        </span>
      );
    },
  },
  {
    accessorKey: "symbol",
    header: "Sembol",
    cell: ({ row }) => <span className="font-medium text-slate-900">{row.getValue("symbol")}</span>,
  },
  {
    accessorKey: "quantity",
    header: "Miktar",
    cell: ({ row }) => {
      const quantity = parseFloat(row.getValue("quantity"));
      return <span className="text-slate-700">{quantity.toLocaleString("tr-TR", { maximumFractionDigits: 8 })}</span>;
    },
  },
  {
    accessorKey: "avg_cost",
    header: "Ort. Maliyet",
    cell: ({ row }) => {
      const cost = row.getValue("avg_cost") as number | null;
      if (cost === null) return <span className="text-slate-400">-</span>;
      return <span className="text-slate-600">{new Intl.NumberFormat("tr-TR", { style: "currency", currency: row.original.currency || "TRY" }).format(cost)}</span>;
    },
  },
  {
    accessorKey: "current_price",
    header: "Güncel Fiyat",
    cell: ({ row }) => {
      const price = row.getValue("current_price") as number | null;
      if (price === null) return <span className="text-slate-400">Girilmedi</span>;
      return <span className="font-medium text-slate-900">{new Intl.NumberFormat("tr-TR", { style: "currency", currency: row.original.currency || "TRY" }).format(price)}</span>;
    },
  },
  {
    id: "total_value",
    header: "Toplam Değer",
    cell: ({ row }) => {
      const quantity = row.original.quantity;
      const price = row.original.current_price;
      if (price === null) return <span className="text-slate-400">-</span>;
      const total = quantity * price;
      return <span className="font-semibold text-slate-900">{new Intl.NumberFormat("tr-TR", { style: "currency", currency: row.original.currency || "TRY" }).format(total)}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => <ActionsCell row={row} table={table} />,
  },
];