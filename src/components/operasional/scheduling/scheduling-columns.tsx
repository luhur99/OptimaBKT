import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type SchedulingRequest = {
  id: string;
  sr_number: string;
  customer_name: string;
  status: "pending" | "approved" | "in_progress" | "completed" | "rejected" | "rescheduled" | "cancelled" | "INSTALLATION" | "SERVICE" | "SERVICE_UNBILL" | "DELIVERY";
  do_number?: string;
  assigned_technician_id?: string;
  technician_name?: string;
  external_technician_name?: string;
  full_address: string;
  requested_date: string;
  requested_time?: string;
  contact_person: string;
  phone_number?: string;
  notes?: string;
  invoice_id?: string;
  invoice_status?: string;
  document_url?: string;
  user_id: string;
  product_category?: string;
  vehicle_details?: string;
  company_name?: string;
  customer_id?: string;
  sales_id?: string;
  technician_type?: "INTERNAL" | "EXTERNAL";
};

interface CreateSchedulingColumnsOptions {
  onSelectRequest: (request: SchedulingRequest) => void;
}

export const createSchedulingColumns = ({ onSelectRequest }: CreateSchedulingColumnsOptions): ColumnDef<SchedulingRequest>[] => [
  {
    accessorKey: "sr_number",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-neon-cyan hover:text-neon-cyan/80"
        >
          SR Number
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="text-gray-300">{row.getValue("sr_number")}</div>,
  },
  {
    accessorKey: "customer_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-neon-cyan hover:text-neon-cyan/80"
        >
          Customer Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="text-gray-300">{row.getValue("customer_name")}</div>,
  },
  {
    accessorKey: "requested_date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-neon-cyan hover:text-neon-cyan/80"
        >
          Requested Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="text-gray-300">{row.getValue("requested_date")}</div>,
  },
  {
    accessorKey: "technician_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-neon-cyan hover:text-neon-cyan/80"
        >
          Technician
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="text-gray-300">{row.getValue("technician_name") || "N/A"}</div>,
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
      const status = row.getValue("status") as SchedulingRequest["status"];
      let colorClass = "bg-gray-500 text-white"; // Default color

      switch (status) {
        case "pending":
          colorClass = "bg-yellow-600 text-white";
          break;
        case "approved":
          colorClass = "bg-blue-600 text-white";
          break;
        case "in_progress":
          colorClass = "bg-purple-600 text-white";
          break;
        case "completed":
          colorClass = "bg-green-600 text-white";
          break;
        case "rejected":
          colorClass = "bg-red-600 text-white";
          break;
        case "rescheduled":
          colorClass = "bg-orange-600 text-white";
          break;
        case "cancelled":
          colorClass = "bg-gray-600 text-white";
          break;
        case "INSTALLATION":
          colorClass = "bg-indigo-600 text-white"; // New color for INSTALLATION
          break;
        case "SERVICE":
          colorClass = "bg-teal-600 text-white"; // New color for SERVICE
          break;
        case "SERVICE_UNBILL":
          colorClass = "bg-pink-600 text-white"; // New color for SERVICE_UNBILL
          break;
        case "DELIVERY":
          colorClass = "bg-cyan-600 text-white"; // New color for DELIVERY
          break;
        default:
          colorClass = "bg-gray-500 text-white";
      }
      return <Badge className={colorClass}>{status.replace(/_/g, ' ').toUpperCase()}</Badge>;
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