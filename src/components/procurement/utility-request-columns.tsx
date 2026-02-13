import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export type UtilityRequestStatus = "pending" | "approved" | "rejected";

export type UtilityRequest = {
  id: string;
  ur_number: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  supplier_name?: string;
  supplier_url?: string;
  status: UtilityRequestStatus;
  created_at: string;
  requested_by_name: string;
  notes?: string;
};

interface CreateUtilityRequestColumnsOptions {
  onSelectRequest?: (request: UtilityRequest) => void;
  includeActions?: boolean;
}

const getStatusColor = (status: UtilityRequestStatus) => {
  switch (status) {
    case "pending":
      return "bg-yellow-600/20 text-yellow-300 border border-yellow-500/30";
    case "approved":
      return "bg-green-600/20 text-green-300 border border-green-500/30";
    case "rejected":
      return "bg-red-600/20 text-red-300 border border-red-500/30";
    default:
      return "bg-gray-700/20 text-gray-400 border border-gray-600/30";
  }
};

const renderSupplier = (request: UtilityRequest) => {
  if (request.supplier_url) {
    return (
      <a
        href={request.supplier_url}
        target="_blank"
        rel="noreferrer"
        className="text-neon-cyan hover:underline"
      >
        {request.supplier_name || "Supplier Link"}
      </a>
    );
  }
  return <span className="text-gray-400">{request.supplier_name || "N/A"}</span>;
};

export const createUtilityRequestColumns = ({
  onSelectRequest,
  includeActions = true,
}: CreateUtilityRequestColumnsOptions): ColumnDef<UtilityRequest>[] => {
  const columns: ColumnDef<UtilityRequest>[] = [
  {
    accessorKey: "ur_number",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-neon-cyan hover:text-neon-cyan/80"
      >
        UR Number
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-gray-300">{row.getValue("ur_number")}</div>,
  },
  {
    accessorKey: "item_name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-neon-cyan hover:text-neon-cyan/80"
      >
        Item Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
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
      const amount = Number(row.getValue("unit_price")) || 0;
      return <div className="text-gray-300">Rp {amount.toLocaleString("id-ID")}</div>;
    },
  },
  {
    accessorKey: "total_price",
    header: "Total Price",
    cell: ({ row }) => {
      const amount = Number(row.getValue("total_price")) || 0;
      return <div className="font-semibold text-neon-cyan">Rp {amount.toLocaleString("id-ID")}</div>;
    },
  },
  {
    id: "supplier",
    header: "Supplier",
    cell: ({ row }) => renderSupplier(row.original),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-neon-cyan hover:text-neon-cyan/80"
      >
        Status
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as UtilityRequestStatus;
      return <Badge className={getStatusColor(status)}>{status.replace(/_/g, " ").toUpperCase()}</Badge>;
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
  ];

  if (includeActions && onSelectRequest) {
    columns.push({
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
    });
  }

  return columns;
};
