import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export type PurchaseRequest = {
  id: string;
  pr_number: string;
  item_name: string;
  item_code: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: 'pending' | 'approved' | 'rejected' | 'waiting for received' | 'closed';
  created_at: string;
  requested_by_name: string; // From join with profiles
  supplier_name: string; // From join with suppliers
  target_warehouse_category: string;
  notes?: string;
};

interface CreatePurchaseRequestColumnsOptions {
  onSelectRequest: (request: PurchaseRequest) => void;
}

export const createPurchaseRequestColumns = ({ onSelectRequest }: CreatePurchaseRequestColumnsOptions): ColumnDef<PurchaseRequest>[] => [
  {
    accessorKey: "pr_number",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-neon-cyan hover:text-neon-cyan/80"
        >
          PR Number
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="text-gray-300">{row.getValue("pr_number")}</div>,
  },
  {
    accessorKey: "item_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-neon-cyan hover:text-neon-cyan/80"
        >
          Item Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="text-gray-300">{row.getValue("item_name")}</div>,
  },
  {
    accessorKey: "quantity",
    header: "Qty",
    cell: ({ row }) => <div className="text-gray-300">{row.getValue("quantity")}</div>,
  },
  {
    accessorKey: "unit_price",
    header: "Unit Price",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("unit_price"));
      return <div className="text-gray-300">Rp {amount.toLocaleString("id-ID")}</div>;
    },
  },
  {
    accessorKey: "total_price",
    header: "Total Price",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total_price"));
      return <div className="font-semibold text-neon-cyan">Rp {amount.toLocaleString("id-ID")}</div>;
    },
  },
  {
    accessorKey: "supplier_name",
    header: "Supplier",
    cell: ({ row }) => <div className="text-gray-400">{row.getValue("supplier_name") || "N/A"}</div>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-neon-cyan hover:text-neon-cyan/80"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as PurchaseRequest["status"];
      let colorClass = "";

      switch (status) {
        case "pending":
          colorClass = "bg-yellow-600/20 text-yellow-300 border border-yellow-500/30";
          break;
        case "approved":
          colorClass = "bg-green-600/20 text-green-300 border border-green-500/30";
          break;
        case "rejected":
          colorClass = "bg-red-600/20 text-red-300 border border-red-500/30";
          break;
        case "waiting for received":
          colorClass = "bg-blue-600/20 text-blue-300 border border-blue-500/30";
          break;
        case "closed":
          colorClass = "bg-purple-600/20 text-purple-300 border border-purple-500/30";
          break;
        default:
          colorClass = "bg-gray-700/20 text-gray-400 border border-gray-600/30";
          break;
      }
      return <Badge className={colorClass}>{status.replace(/_/g, ' ').toUpperCase()}</Badge>;
    },
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return <div className="text-gray-500">{format(date, "PPP")}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onSelectRequest(row.original)}
        className="bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 hover:text-neon-cyan border-neon-cyan/50"
      >
        View Details
      </Button>
    ),
  },
];
