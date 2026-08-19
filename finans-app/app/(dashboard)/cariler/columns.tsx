'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import type { Customer } from '@/lib/invoices';

/**
 * Cari listesi kolonları. Satır eylemleri sayfadan `meta` ile geçiliyor;
 * böylece kolon tanımı form/silme mantığından bağımsız kalıyor.
 */
export interface CustomerTableMeta {
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

export const customerColumns: ColumnDef<Customer>[] = [
  {
    accessorKey: 'name',
    header: 'Ünvan',
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'tax_number',
    header: 'Vergi No',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.tax_number ?? '—'}
        {row.original.tax_office ? ` / ${row.original.tax_office}` : ''}
      </span>
    ),
  },
  {
    id: 'contact',
    accessorFn: (row) => row.email ?? row.phone ?? '',
    header: 'İletişim',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.email ?? row.original.phone ?? '—'}
      </span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row, table }) => {
      const meta = table.options.meta as CustomerTableMeta | undefined;
      const customer = row.original;
      return (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => meta?.onEdit(customer)}
            aria-label={`${customer.name} düzenle`}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => meta?.onDelete(customer)}
            aria-label={`${customer.name} sil`}
            className="rounded p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      );
    },
  },
];
