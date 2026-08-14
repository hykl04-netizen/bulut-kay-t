'use client';

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

// Veri tipimizi tanımlıyoruz (Supabase'deki tablomuza uyumlu şekilde)
export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'gelir' | 'gider';
  category: string;
};

// Tablo başlıkları ve hücre görünümleri
export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "date",
    header: "Tarih",
  },
  {
    accessorKey: "description",
    header: "Açıklama",
  },
  {
    accessorKey: "category",
    header: "Kategori",
  },
  {
    accessorKey: "amount",
    header: "Tutar",
    cell: ({ row }) => {
      // Satırdaki tutar ve tipi (gelir/gider) alıyoruz
      const amount = parseFloat(row.getValue("amount"));
      const type = row.original.type;
      
      // Sayıyı Türk Lirası formatına çeviriyoruz
      const formatted = new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
      }).format(amount);

      // Gelirse yeşil, giderse kırmızı renk veriyoruz
      return (
        <div className={`font-medium ${type === 'gelir' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {type === 'gelir' ? '+' : '-'}{formatted}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <button className="p-2 hover:bg-slate-100 rounded-md transition-colors">
          <MoreHorizontal className="w-4 h-4 text-slate-500" />
        </button>
      );
    },
  },
];