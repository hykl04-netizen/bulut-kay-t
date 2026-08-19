'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';
import { formatTRY } from '@/lib/currency';

export interface PayrollRow {
  id: string;
  period: string;
  gross_salary: number;
  sgk_deduction: number;
  income_tax: number;
  stamp_tax: number;
  bes_deduction: number;
  net_salary: number;
  notes: string;
}

export interface PayrollTableMeta {
  onDelete: (id: string) => void;
}

/** Kesintiler ayrı bir sütunda saklanmıyor; dört kalemin toplamı. */
export function totalDeductions(p: PayrollRow): number {
  return p.sgk_deduction + p.income_tax + p.stamp_tax + p.bes_deduction;
}

export const payrollColumns: ColumnDef<PayrollRow>[] = [
  {
    accessorKey: 'period',
    header: 'Dönem',
    cell: ({ row }) => <span className="font-medium whitespace-nowrap">{row.original.period}</span>,
  },
  {
    accessorKey: 'gross_salary',
    header: 'Brüt',
    cell: ({ row }) => (
      <div className="whitespace-nowrap text-right text-muted-foreground">
        {formatTRY(row.original.gross_salary)}
      </div>
    ),
  },
  {
    id: 'deductions',
    accessorFn: (row) => totalDeductions(row),
    header: 'Kesintiler (Top.)',
    cell: ({ row }) => (
      <div className="whitespace-nowrap text-right text-rose-600 dark:text-rose-400">
        -{formatTRY(totalDeductions(row.original))}
      </div>
    ),
  },
  {
    accessorKey: 'net_salary',
    header: 'Net Maaş',
    cell: ({ row }) => (
      <div className="whitespace-nowrap text-right font-bold text-emerald-600 dark:text-emerald-400">
        {formatTRY(row.original.net_salary)}
      </div>
    ),
  },
  {
    id: 'actions',
    header: 'İşlem',
    cell: ({ row, table }) => {
      const meta = table.options.meta as PayrollTableMeta | undefined;
      return (
        <div className="text-center">
          <button
            onClick={() => meta?.onDelete(row.original.id)}
            aria-label={`${row.original.period} bordrosunu sil`}
            title="Bordroyu Sil"
            className="rounded p-1.5 text-muted-foreground transition hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      );
    },
  },
];
