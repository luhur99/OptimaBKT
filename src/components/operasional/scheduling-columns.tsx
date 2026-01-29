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
import { DialogTrigger } from "@/components/ui/dialog"; // Import DialogTrigger for the Approve button

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
};

interface SchedulingColumnsProps {
  onApproveClick: (request: SchedulingRequest) => void;
  onForceStart: (requestId: string) => void;
  onMarkCompleted: (requestId: string) => void;
}

export const createSchedulingColumns = ({
  onApproveClick,
  onForceStart,
  onMarkCompleted,
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
      let variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" = "default";
      let colorClass = "";

      switch (status) {
        case "pending":
          variant = "warning";
          colorClass = "bg-yellow-100 text-yellow-800";
          break;
        case "approved":
          variant = "info";
          colorClass = "bg-blue-100 text-blue-800";
          break;
        case "in_progress":
          variant = "default";
          colorClass = "bg-purple-100 text-purple-800";
          break;
        case "completed":
          variant = "success";
          colorClass = "bg-green-100 text-green-800";
          break;
        case "rejected":
        case "cancelled":
          variant = "destructive";
          colorClass = "bg-red-100 text-red-800";
          break;
        case "rescheduled":
          variant = "secondary";
          colorClass = "bg-gray-100 text-gray-800";
          break;
        default:
          variant = "outline";
          colorClass = "bg-gray-50 text-gray-700";
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
      const status = request.status;

      if (status === "pending") {
        return (
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={() => onApproveClick(request)}>
              Approve
            </Button>
          </DialogTrigger>
        );
      } else if (status === "approved" || status === "in_progress") {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onForceStart(request.id)}>
                Force Start
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMarkCompleted(request.id)}>
                Mark as Completed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
      return null;
    },
  },
];