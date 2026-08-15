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
    <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">
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
                className="border-b border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-4 align-middle text-slate-700 dark:text-slate-300">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="h-24 text-center text-slate-500 dark:text-slate-400">
                Henüz veri eklenmemiş.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}