"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { showError } from "@/utils/toast";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

// Define the type for a scheduling request
interface SchedulingRequest {
  id: string;
  sr_number: string;
  customer_name: string;
  type: string;
  status: string;
  requested_date: string;
  contact_person: string;
  phone_number: string;
  created_at: string;
}

const columns: ColumnDef<SchedulingRequest>[] = [
  {
    accessorKey: "sr_number",
    header: "SR Number",
  },
  {
    accessorKey: "customer_name",
    header: "Customer Name",
  },
  {
    accessorKey: "type",
    header: "Type",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      let variant: "default" | "secondary" | "destructive" | "outline" = "default";
      switch (status) {
        case "pending":
          variant = "secondary";
          break;
        case "approved":
          variant = "default";
          break;
        case "in_progress":
          variant = "outline";
          break;
        case "completed":
          variant = "default";
          break;
        case "rejected":
          variant = "destructive";
          break;
        case "rescheduled":
          variant = "secondary";
          break;
        case "cancelled":
          variant = "destructive";
          break;
        default:
          variant = "default";
      }
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    accessorKey: "requested_date",
    header: "Requested Date",
    cell: ({ row }) => format(new Date(row.getValue("requested_date")), "PPP"),
  },
  {
    accessorKey: "contact_person",
    header: "Contact Person",
  },
  {
    accessorKey: "phone_number",
    header: "Phone Number",
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => format(new Date(row.getValue("created_at")), "PPP HH:mm"),
  },
];

export default function SchedulingRequestsPage() {
  const { session } = useAuthSession();
  const [requests, setRequests] = useState<SchedulingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedulingRequests = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("scheduling_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching scheduling requests:", error);
        showError("Failed to load scheduling requests.");
      } else {
        setRequests(data || []);
      }
      setLoading(false);
    };

    if (session) {
      fetchSchedulingRequests();
    }
  }, [session]);

  if (loading) {
    return <div className="p-4 text-gray-300">Loading scheduling requests...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-gray-100">Scheduling Requests</h1>
      {requests.length === 0 ? (
        <p className="text-gray-400">No scheduling requests found.</p>
      ) : (
        <DataTable columns={columns} data={requests} />
      )}
    </div>
  );
}