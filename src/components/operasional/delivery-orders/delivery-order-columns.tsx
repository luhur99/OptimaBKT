import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export type DeliveryOrder = {
  id: string;
  do_number: string;
  request_id: string;
  user_id: string;
  user_full_name: string;
  delivery_date: string;
  delivery_time?: string;
  status: 'pending' | 'in progress' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  items_json?: any;
};

export const createDeliveryOrderColumns = (): ColumnDef<DeliveryOrder>[] => [
  {
    accessorKey: "do_number",
    header: "DO Number",
  },
  {
    accessorKey: "user_full_name",
    header: "Created By",
  },
  {
    accessorKey: "delivery_date",
    header: "Delivery Date",
    cell: ({ row }) => {
      const date = new Date(row.getValue("delivery_date"));
      return format(date, "PPP");
    },
  },
  {
    accessorKey: "delivery_time",
    header: "Delivery Time",
    cell: ({ row }) => row.getValue("delivery_time") || "N/A",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as DeliveryOrder["status"];
      let colorClass = "";

      switch (status) {
        case "pending":
          colorClass = "bg-yellow-600/20 text-yellow-300 border border-yellow-500/30";
          break;
        case "in progress":
          colorClass = "bg-blue-600/20 text-blue-300 border border-blue-500/30";
          break;
        case "completed":
          colorClass = "bg-green-600/20 text-green-300 border border-green-500/30";
          break;
        case "cancelled":
          colorClass = "bg-red-600/20 text-red-300 border border-red-500/30";
          break;
        default:
          colorClass = "bg-gray-700/20 text-gray-400 border border-gray-600/30";
          break;
      }
      return <Badge className={colorClass}>{status.replace(/_/g, ' ').toUpperCase()}</Badge>;
    },
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => row.getValue("notes") || "-",
  },
];
