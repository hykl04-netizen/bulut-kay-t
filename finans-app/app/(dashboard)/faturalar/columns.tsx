'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import {
  formatMoney,
  STATUS_CLASSES,
  STATUS_LABELS,
  type DisplayStatus,
  type InvoiceWithCustomer,
} from '@/lib/invoices';

/**
 * Fatura listesi kolonları.
 *
 * Sayfa daha önce elle yazılmış bir <table> kullanıyordu; uygulamadaki diğer
 * beş liste ise DataTable üzerinden geçtiği için sıralama ve sayfalama
 * yalnızca onlarda çalışıyordu. Tek tablo altyapısında toplandı.
 */
export type InvoiceRow = InvoiceWithCustomer & { display: DisplayStatus };

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString('tr-TR');
}

export const invoiceColumns: ColumnDef<InvoiceRow>[] = [
  {
    accessorKey: 'invoice_number',
    header: 'No',
    cell: ({ row }) => (
      <Link
        href={`/faturalar/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.invoice_number}
      </Link>
    ),
  },
  {
    id: 'customer',
    accessorFn: (row) => row.customers?.name ?? '',
    header: 'Cari',
    cell: ({ row }) => row.original.customers?.name ?? '—',
  },
  {
    accessorKey: 'issue_date',
    header: 'Tarih',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDate(row.original.issue_date)}</span>
    ),
  },
  {
    accessorKey: 'due_date',
    header: 'Vade',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDate(row.original.due_date)}</span>
    ),
  },
  {
    accessorKey: 'display',
    header: 'Durum',
    cell: ({ row }) => (
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[row.original.display]}`}
      >
        {STATUS_LABELS[row.original.display]}
      </span>
    ),
  },
  {
    accessorKey: 'total',
    header: 'Tutar',
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatMoney(Number(row.original.total), row.original.currency)}
      </div>
    ),
  },
];
