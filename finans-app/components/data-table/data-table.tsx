'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

// NOT: Her columns.tsx dosyasında ayrı ayrı `declare module '@tanstack/react-table'`
// ile TableMeta genişletmek GLOBAL bir tip birleşmesine yol açıyordu (örn. borç/alacak
// ve fatura/masraf'taki farklı `onToggleStatus` imzaları çakışıyordu ve bu da
// `next build`'i kırıyordu). Bunun yerine meta'yı burada genel tutuyoruz; her sayfa
// kendi action fonksiyonlarını serbestçe geçebilir, columns.tsx dosyaları da
// `table.options.meta`'yı zaten kendi yerel tipine cast ederek kullanıyor.
export type DataTableMeta = Record<string, unknown>

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  meta?: DataTableMeta
  /** Sayfa başına kayıt sayısı. Belirtilmezse 25. `false` verilirse sayfalandırma kapanır. */
  pageSize?: number | false
}

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export function DataTable<TData, TValue>({
  columns,
  data,
  meta,
  pageSize = 25,
}: DataTableProps<TData, TValue>) {
  const paginationEnabled = pageSize !== false;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(paginationEnabled ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    meta,
    initialState: paginationEnabled
      ? { pagination: { pageSize: pageSize as number } }
      : undefined,
  })

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex;
  const totalRows = data.length;
  const showPagination = paginationEnabled && totalRows > 0;

  const rangeStart = showPagination ? currentPage * table.getState().pagination.pageSize + 1 : 0;
  const rangeEnd = showPagination
    ? Math.min(totalRows, (currentPage + 1) * table.getState().pagination.pageSize)
    : 0;

  return (
    <div className="rounded-md border border-border dark:border-border bg-card dark:bg-primary overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted dark:bg-primary border-b border-border dark:border-border">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground dark:text-muted-foreground">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border dark:border-border transition-colors hover:bg-muted dark:hover:bg-secondary"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-4 align-middle text-foreground dark:text-muted-foreground">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center text-muted-foreground dark:text-muted-foreground">
                  Henüz veri eklenmemiş.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showPagination && pageCount > 1 && (
        <div className="flex flex-col gap-3 border-t border-border dark:border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground dark:text-muted-foreground">
            <span className="font-medium text-foreground dark:text-slate-200">{rangeStart}–{rangeEnd}</span>
            {' '}/ {totalRows} kayıt
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="İlk sayfa"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-brand-gold-light disabled:pointer-events-none disabled:opacity-30 transition dark:hover:bg-secondary"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Önceki sayfa"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-brand-gold-light disabled:pointer-events-none disabled:opacity-30 transition dark:hover:bg-secondary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-2 text-xs font-medium text-foreground dark:text-slate-200 whitespace-nowrap">
              Sayfa {currentPage + 1} / {pageCount}
            </span>

            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Sonraki sayfa"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-brand-gold-light disabled:pointer-events-none disabled:opacity-30 transition dark:hover:bg-secondary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Son sayfa"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-brand-gold-light disabled:pointer-events-none disabled:opacity-30 transition dark:hover:bg-secondary"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>

            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="ml-2 rounded-lg border border-border dark:border-border bg-background dark:bg-secondary px-2 py-1.5 text-xs text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-gold"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size} / sayfa</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
