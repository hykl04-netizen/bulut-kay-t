'use client';

import { ColumnDef, Row, Table } from "@tanstack/react-table";
import { Trash2, Pencil } from "lucide-react";
import { EditableCell } from "@/components/data-table/editable-cell";
import { RowActionsMenu } from "@/components/data-table/row-actions-menu";

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
  /** false ise düzenle/sil menüsü render edilmez (salt_gorunum rolü). */
  canEdit?: boolean;
  onEdit: (row: Investment) => void;
  onDelete: (id: string) => void;
  onCellEdit: (id: string, field: 'quantity' | 'avg_cost' | 'current_price', value: string) => Promise<void>;
};

function ActionsCell({ row, table }: { row: Row<Investment>; table: Table<Investment> }) {
  const meta = table.options.meta as InvestmentTableMeta | undefined;
  if (meta?.canEdit === false) return null;

  return (
    <RowActionsMenu>
      {(close) => (
        <>
          <button
            onClick={() => { meta?.onEdit(row.original); close(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted dark:hover:bg-secondary text-foreground dark:text-muted-foreground"
          >
            <Pencil className="w-3.5 h-3.5" /> Düzenle / Fiyat Güncelle
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

export const columns: ColumnDef<Investment>[] = [
  {
    accessorKey: "asset_type",
    header: "Tür",
    cell: ({ row }) => {
      const type = row.getValue("asset_type") as string;
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${assetTypeColors[type] ?? 'bg-secondary dark:bg-secondary text-muted-foreground dark:text-muted-foreground'}`}>
          {assetTypeLabels[type] ?? type}
        </span>
      );
    },
  },
  {
    accessorKey: "symbol",
    header: "Sembol",
    cell: ({ row }) => <span className="font-medium text-foreground dark:text-foreground">{row.getValue("symbol")}</span>,
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
          display={<span className="text-foreground dark:text-muted-foreground">{quantity.toLocaleString("tr-TR", { maximumFractionDigits: 8 })}</span>}
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
          display={cost === null ? <span className="text-muted-foreground dark:text-muted-foreground">-</span> : <span className="text-muted-foreground dark:text-muted-foreground">{new Intl.NumberFormat("tr-TR", { style: "currency", currency: row.original.currency || "TRY" }).format(cost)}</span>}
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
          display={price === null ? <span className="text-muted-foreground dark:text-muted-foreground">Girilmedi</span> : <span className="font-medium text-foreground dark:text-foreground">{new Intl.NumberFormat("tr-TR", { style: "currency", currency: row.original.currency || "TRY" }).format(price)}</span>}
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
      if (price === null) return <span className="text-muted-foreground dark:text-muted-foreground">-</span>;
      const total = quantity * price;
      return <span className="font-semibold text-foreground dark:text-foreground">{new Intl.NumberFormat("tr-TR", { style: "currency", currency: row.original.currency || "TRY" }).format(total)}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => <ActionsCell row={row} table={table} />,
  },
];