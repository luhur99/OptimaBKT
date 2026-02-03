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
  user_id: string; // Added user_id
};

// ... imports
import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// ... imports

export const getColumns = (
  onEdit: (product: Product) => void,
  onDelete: (product: Product) => void
): ColumnDef<Product>[] => [
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
    {
      id: "actions",
      cell: ({ row }) => {
        const product = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glassmorphism border border-gray-700">
              <DropdownMenuLabel className="text-gray-400">Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => onEdit(product)}
                className="text-neon-cyan focus:text-neon-cyan focus:bg-neon-cyan/20 cursor-pointer"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(product)}
                className="text-red-400 focus:text-red-400 focus:bg-red-900/20 cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
