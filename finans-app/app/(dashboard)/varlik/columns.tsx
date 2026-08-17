'use client';

import { ColumnDef, Row, Table } from "@tanstack/react-table";
import { Trash2, Pencil } from "lucide-react";
import { EditableCell } from "@/components/data-table/editable-cell";
import { RowActionsMenu } from "@/components/data-table/row-actions-menu";

export type Asset = {
  id: string;
  asset_name: string;
  asset_type: string | null;
  current_value: number;
  currency: string;
  notes: string | null;
};

type AssetTableMeta = {
  /** false ise düzenle/sil menüsü render edilmez (salt_gorunum rolü). */
  canEdit?: boolean;
  onEdit: (row: Asset) => void;
  onDelete: (id: string) => void;
  onCellEdit: (id: string, field: 'asset_name' | 'current_value', value: string) => Promise<void>;
};

function ActionsCell({ row, table }: { row: Row<Asset>; table: Table<Asset> }) {
  const meta = table.options.meta as AssetTableMeta | undefined;
  if (meta?.canEdit === false) return null;

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

export const columns: ColumnDef<Asset>[] = [
  {
    accessorKey: "asset_name",
    header: "Varlık Adı",
    cell: ({ row, table }) => {
      const meta = table.options.meta as AssetTableMeta | undefined;
      return (
        <EditableCell
          value={row.original.asset_name}
          className="font-medium text-foreground dark:text-foreground"
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
      return type ? <span className="text-muted-foreground dark:text-muted-foreground text-sm">{type}</span> : <span className="text-muted-foreground dark:text-muted-foreground">-</span>;
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
          display={<span className="font-semibold text-foreground dark:text-foreground">{formatted}</span>}
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
      return notes ? <span className="text-muted-foreground dark:text-muted-foreground text-sm">{notes}</span> : <span className="text-muted-foreground dark:text-muted-foreground">-</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => <ActionsCell row={row} table={table} />,
  },
];