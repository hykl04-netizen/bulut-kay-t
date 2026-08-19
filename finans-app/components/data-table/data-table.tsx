'use client';

import { useState } from "react"
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react"

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
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* min-w: dar ekranda sütunlar ezilip metin sarmak yerine tablo yatay
          kayar. w-full tek başınayken telefonda 6 sütunlu tablo okunamıyordu. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm text-left">
          <thead className="bg-muted border-b border-border">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const content = header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext());
                  // Sıralama yalnızca accessor kolonlarında açılır; "işlemler"
                  // gibi görüntü kolonlarında getCanSort() zaten false döner.
                  if (!header.column.getCanSort()) {
                    return (
                      <th
                        key={header.id}
                        className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                      >
                        {content}
                      </th>
                    );
                  }
                  const dir = header.column.getIsSorted();
                  const Icon = dir === 'asc' ? ChevronUp : dir === 'desc' ? ChevronDown : ChevronsUpDown;
                  return (
                    <th
                      key={header.id}
                      aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}
                      className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                    >
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        title="Sıralamak için tıklayın"
                        className={`-mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-1 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${dir ? 'text-foreground' : ''}`}
                      >
                        {content}
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${dir ? 'opacity-100' : 'opacity-40'}`} />
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border transition-colors hover:bg-muted dark:hover:bg-secondary"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-4 align-middle text-foreground">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Henüz veri eklenmemiş.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showPagination && pageCount > 1 && (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{rangeStart}–{rangeEnd}</span>
            {' '}/ {totalRows} kayıt
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="İlk sayfa"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-brand-gold-light disabled:pointer-events-none disabled:opacity-30 transition"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Önceki sayfa"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-brand-gold-light disabled:pointer-events-none disabled:opacity-30 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-2 text-xs font-medium text-foreground whitespace-nowrap">
              Sayfa {currentPage + 1} / {pageCount}
            </span>

            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Sonraki sayfa"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-brand-gold-light disabled:pointer-events-none disabled:opacity-30 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Son sayfa"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-brand-gold-light disabled:pointer-events-none disabled:opacity-30 transition"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>

            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="ml-2 rounded-lg border border-border bg-background dark:bg-secondary px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold"
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
