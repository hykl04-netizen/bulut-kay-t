'use client';

import { ColumnDef, Row, Table } from "@tanstack/react-table";
import { Trash2, CheckCircle2 } from "lucide-react";
import { EditableCell } from "@/components/data-table/editable-cell";
import { RowActionsMenu } from "@/components/data-table/row-actions-menu";
import { DueBadge } from "@/components/due-badge";

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
  onCellEdit: (id: string, field: 'counterparty' | 'amount' | 'due_date' | 'notes', value: string) => Promise<void>;
};

function ActionsCell({ row, table }: { row: Row<Debt>; table: Table<Debt> }) {
  const meta = table.options.meta as DebtTableMeta | undefined;
  const status = row.original.status;

  return (
    <RowActionsMenu>
      {(close) => (
        <>
          <button
            onClick={() => { meta?.onToggleStatus(row.original.id, status); close(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted dark:hover:bg-secondary text-foreground dark:text-muted-foreground"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {status === 'acik' ? 'Kapandı olarak işaretle' : 'Tekrar aç'}
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
    cell: ({ row, table }) => {
      const meta = table.options.meta as DebtTableMeta | undefined;
      return (
        <EditableCell
          value={row.original.counterparty}
          onSave={(v) => meta!.onCellEdit(row.original.id, 'counterparty', v)}
        />
      );
    },
  },
  {
    accessorKey: "amount",
    header: "Tutar",
    cell: ({ row, table }) => {
      const meta = table.options.meta as DebtTableMeta | undefined;
      const amount = row.original.amount;
      const currency = row.original.currency;
      const formatted = new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: currency || "TRY",
      }).format(amount);
      return (
        <EditableCell
          type="number"
          step="0.01"
          value={amount}
          display={<span className="font-medium text-foreground dark:text-foreground">{formatted}</span>}
          onSave={(v) => meta!.onCellEdit(row.original.id, 'amount', v)}
        />
      );
    },
  },
  {
    accessorKey: "due_date",
    header: "Vade Tarihi",
    cell: ({ row, table }) => {
      const meta = table.options.meta as DebtTableMeta | undefined;
      const date = row.original.due_date;
      return (
        <div className="flex flex-col gap-1">
          <EditableCell
            type="date"
            value={date ?? ''}
            display={date ? new Date(date).toLocaleDateString("tr-TR") : <span className="text-muted-foreground dark:text-muted-foreground">-</span>}
            onSave={(v) => meta!.onCellEdit(row.original.id, 'due_date', v)}
          />
          <DueBadge dueDate={date} isSettled={row.original.status === 'kapandi'} />
        </div>
      );
    },
  },
  {
    accessorKey: "notes",
    header: "Not",
    cell: ({ row, table }) => {
      const meta = table.options.meta as DebtTableMeta | undefined;
      const notes = row.original.notes;
      return (
        <EditableCell
          value={notes ?? ''}
          display={notes ? notes : <span className="text-muted-foreground dark:text-muted-foreground">-</span>}
          placeholder="Not ekle..."
          onSave={(v) => meta!.onCellEdit(row.original.id, 'notes', v)}
        />
      );
    },
  },
  {
    accessorKey: "status",
    header: "Durum",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          status === 'acik' ? 'bg-amber-100 text-amber-700' : 'bg-secondary dark:bg-secondary text-muted-foreground dark:text-muted-foreground'
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