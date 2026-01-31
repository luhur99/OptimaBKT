import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type Product = {
  id: string;
  kode_barang: string;
  nama_barang: string;
  satuan?: string;
  harga_beli: number;
  harga_jual: number;
  safe_stock_limit: number;
  stok_sekarang: number;
  updated_at: string;
};

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "kode_barang",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-neon-cyan hover:text-neon-cyan/80"
        >
          Code
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="text-gray-300">{row.getValue("kode_barang")}</div>,
  },
  {
    accessorKey: "nama_barang",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-neon-cyan hover:text-neon-cyan/80"
        >
          Product Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="text-gray-300">{row.getValue("nama_barang")}</div>,
  },
  {
    accessorKey: "satuan",
    header: "Unit",
    cell: ({ row }) => <div className="text-gray-400">{row.getValue("satuan") || "N/A"}</div>,
  },
  {
    accessorKey: "harga_beli",
    header: "Buy Price",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("harga_beli"));
      return <div className="text-gray-300">Rp {amount.toLocaleString("id-ID")}</div>;
    },
  },
  {
    accessorKey: "harga_jual",
    header: "Sell Price",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("harga_jual"));
      return <div className="font-semibold text-neon-cyan">Rp {amount.toLocaleString("id-ID")}</div>;
    },
  },
  {
    accessorKey: "stok_sekarang",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-neon-cyan hover:text-neon-cyan/80"
        >
          Current Stock
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const stock = row.getValue("stok_sekarang") as number;
      const safeLimit = row.original.safe_stock_limit;
      const isLowStock = stock <= safeLimit;
      return (
        <Badge className={cn(
          "px-2 py-1 rounded-full text-xs font-medium",
          isLowStock ? "bg-red-600/20 text-red-300 border border-red-500/30" : "bg-green-600/20 text-green-300 border border-green-500/30"
        )}>
          {stock} {isLowStock && "(Low)"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "safe_stock_limit",
    header: "Safe Limit",
    cell: ({ row }) => <div className="text-gray-500">{row.getValue("safe_stock_limit")}</div>,
  },
  {
    accessorKey: "updated_at",
    header: "Last Updated",
    cell: ({ row }) => {
      const date = new Date(row.getValue("updated_at"));
      return <div className="text-gray-500">{format(date, "PPP")}</div>;
    },
  },
];