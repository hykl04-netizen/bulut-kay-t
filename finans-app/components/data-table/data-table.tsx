'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

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
}

export function DataTable<TData, TValue>({
  columns,
  data,
  meta,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta,
  })

  return (
    <div className="rounded-md border border-border dark:border-border bg-card dark:bg-primary overflow-x-auto">
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
  )
}