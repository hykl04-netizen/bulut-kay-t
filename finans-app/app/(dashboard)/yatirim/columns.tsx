'use client';

import { ColumnDef, Row, Table } from "@tanstack/react-table";
import { MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { EditableCell } from "@/components/data-table/editable-cell";

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
  onCellEdit: (id: string, field: 'quantity' | 'avg_cost' | 'current_price', value: string) => Promise<void>;
};

function ActionsCell({ row, table }: { row: Row<Investment>; table: Table<Investment> }) {
  const [open, setOpen] = useState(false);
  const meta = table.options.meta as InvestmentTableMeta | undefined;

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
          <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20">
            <button
              onClick={() => { meta?.onEdit(row.original); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
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
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${assetTypeColors[type] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
          {assetTypeLabels[type] ?? type}
        </span>
      );
    },
  },
  {
    accessorKey: "symbol",
    header: "Sembol",
    cell: ({ row }) => <span className="font-medium text-slate-900 dark:text-slate-50">{row.getValue("symbol")}</span>,
  },
  {
    accessorKey: "quantity",
    header: "Miktar",
    cell: ({ row, table }) => {
      const meta = table.options.meta as InvestmentTableMeta | undefined;
      const quantity = row.original.quantity;
      return (
        <EditableCell
          type="number"
          step="any"
          value={quantity}
          display={<span className="text-slate-700 dark:text-slate-300">{quantity.toLocaleString("tr-TR", { maximumFractionDigits: 8 })}</span>}
          onSave={(v) => meta!.onCellEdit(row.original.id, 'quantity', v)}
        />
      );
    },
  },
  {
    accessorKey: "avg_cost",
    header: "Ort. Maliyet",
    cell: ({ row, table }) => {
      const meta = table.options.meta as InvestmentTableMeta | undefined;
      const cost = row.original.avg_cost;
      return (
        <EditableCell
          type="number"
          step="0.01"
          value={cost ?? ''}
          placeholder="Gir"
          display={cost === null ? <span className="text-slate-400 dark:text-slate-500">-</span> : <span className="text-slate-600 dark:text-slate-400">{new Intl.NumberFormat("tr-TR", { style: "currency", currency: row.original.currency || "TRY" }).format(cost)}</span>}
          onSave={(v) => meta!.onCellEdit(row.original.id, 'avg_cost', v)}
        />
      );
    },
  },
  {
    accessorKey: "current_price",
    header: "Güncel Fiyat",
    cell: ({ row, table }) => {
      const meta = table.options.meta as InvestmentTableMeta | undefined;
      const price = row.original.current_price;
      return (
        <EditableCell
          type="number"
          step="0.01"
          value={price ?? ''}
          placeholder="Gir"
          display={price === null ? <span className="text-slate-400 dark:text-slate-500">Girilmedi</span> : <span className="font-medium text-slate-900 dark:text-slate-50">{new Intl.NumberFormat("tr-TR", { style: "currency", currency: row.original.currency || "TRY" }).format(price)}</span>}
          onSave={(v) => meta!.onCellEdit(row.original.id, 'current_price', v)}
        />
      );
    },
  },
  {
    id: "total_value",
    header: "Toplam Değer",
    cell: ({ row }) => {
      const quantity = row.original.quantity;
      const price = row.original.current_price;
      if (price === null) return <span className="text-slate-400 dark:text-slate-500">-</span>;
      const total = quantity * price;
      return <span className="font-semibold text-slate-900 dark:text-slate-50">{new Intl.NumberFormat("tr-TR", { style: "currency", currency: row.original.currency || "TRY" }).format(total)}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => <ActionsCell row={row} table={table} />,
  },
];