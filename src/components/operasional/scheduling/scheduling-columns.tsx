import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { DialogTrigger } from "@/components/ui/dialog";

export type SchedulingRequest = {
  id: string;
  sr_number: string;
  customer_name: string;
  status: 'pending' | 'approved' | 'in_progress' | 'rescheduled' | 'rejected' | 'completed' | 'cancelled';
  do_number?: string;
  assigned_technician_id?: string;
  technician_name?: string; // From profiles table join
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
  technician_type?: 'INTERNAL' | 'EXTERNAL';
  external_technician_name?: string;
};

interface SchedulingColumnsProps {
  onSelectRequest: (request: SchedulingRequest) => void;
}

export const createSchedulingColumns = ({
  onSelectRequest,
}: SchedulingColumnsProps): ColumnDef<SchedulingRequest>[] => [
  {
    accessorKey: "sr_number",
    header: "SR Number",
  },
  {
    accessorKey: "customer_name",
    header: "Customer",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as SchedulingRequest["status"];
      let colorClass = "";

      switch (status) {
        case "pending":
          colorClass = "bg-yellow-600/20 text-yellow-300 border border-yellow-500/30";
          break;
        case "approved":
          colorClass = "bg-blue-600/20 text-blue-300 border border-blue-500/30";
          break;
        case "in_progress":
          colorClass = "bg-purple-600/20 text-purple-300 border border-purple-500/30";
          break;
        case "completed":
          colorClass = "bg-green-600/20 text-green-300 border border-green-500/30";
          break;
        case "rejected":
        case "cancelled":
          colorClass = "bg-red-600/20 text-red-300 border border-red-500/30";
          break;
        case "rescheduled":
          colorClass = "bg-gray-600/20 text-gray-300 border border-gray-500/30";
          break;
        default:
          colorClass = "bg-gray-700/20 text-gray-400 border border-gray-600/30";
          break;
      }
      return <Badge className={colorClass}>{status.replace(/_/g, ' ').toUpperCase()}</Badge>;
    },
  },
  {
    accessorKey: "do_number",
    header: "DO Number",
    cell: ({ row }) => row.getValue("do_number") || "-",
  },
  {
    accessorKey: "technician_name",
    header: "Assigned Technician",
    cell: ({ row }) => row.getValue("technician_name") || "Unassigned",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const request = row.original;
      return (
        <Button variant="outline" size="sm" onClick={() => onSelectRequest(request)} className="glassmorphism border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/20 transition-all duration-300">
          View Details
        </Button>
      );
    },
  },
];