import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Search, CheckCircle2, XCircle, CalendarDays, Eye, Edit, Truck, FileText, Tag, Info, FileUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/dialog";
import { SchedulingActionDialog } from "@/components/operasional/scheduling/SchedulingActionDialog";
import SchedulingRequestDetail from "@/components/operasional/scheduling/SchedulingRequestDetail";
import { useToast } from "@/components/ui/use-toast";

interface SchedulingRequest {
  id: string;
  sr_number: string;
  type: string;
  full_address: string;
  landmark: string | null;
  requested_date: string;
  requested_time: string | null;
  contact_person: string;
  phone_number: string | null;
  payment_method: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'rescheduled' | 'cancelled' | 'in_progress' | 'completed';
  notes: string | null;
  created_at: string;
  customer_name: string | null;
  company_name: string | null;
  vehicle_details: string | null;
  assigned_technician_id: string | null;
  technician_name: string | null;
  external_technician_name: string | null; // Added
  technician_type: 'INTERNAL' | 'EXTERNAL' | null; // Added
  product_category: string | null;
  do_number: string | null;
  delivery_order_id: string | null;
  invoice_id: string | null;
  invoice_status: string | null;
  document_url: string | null;
}

const OperasionalSchedulingPage: React.FC = () => {
  const { profile, isLoading: isAuthLoading } = useAuthSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<SchedulingRequest | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const [selectedRequestForAction, setSelectedRequestForAction] = useState<SchedulingRequest | null>(null);
  const [currentActionType, setCurrentActionType] = useState<'approve' | 'reject' | 'reschedule' | 'cancel' | null>(null);

  const { data: schedulingRequests, isLoading: isLoadingRequests, error: requestsError } = useQuery<SchedulingRequest[]>({
    queryKey: ["schedulingRequests", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("scheduling_requests")
        .select(`
          id,
          sr_number,
          type,
          full_address,
          landmark,
          requested_date,
          requested_time,
          contact_person,
          phone_number,
          payment_method,
          status,
          notes,
          created_at,
          customer_name,
          company_name,
          vehicle_details,
          assigned_technician_id,
          technician_name,
          external_technician_name,
          technician_type,
          product_category,
          do_number,
          delivery_order_id,
          invoice_id,
          invoice_status,
          document_url
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(
          `sr_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,full_address.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (requestsError) {
      showError("Error fetching scheduling requests: " + requestsError.message);
    }
  }, [requestsError]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "default";
      case "approved":
        return "success";
      case "rejected":
        return "destructive";
      case "rescheduled":
        return "warning";
      case "cancelled":
        return "destructive";
      case "in_progress":
        return "info";
      case "completed":
        return "secondary";
      default:
        return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      case "rescheduled":
        return "Rescheduled";
      case "cancelled":
        return "Cancelled";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      default:
        return status;
    }
  };

  const handleViewDetails = (request: SchedulingRequest) => {
    setSelectedRequest(request);
    setIsDetailDialogOpen(true);
  };

  const handleDetailDialogClose = () => {
    setIsDetailDialogOpen(false);
    setSelectedRequest(null);
    queryClient.invalidateQueries({ queryKey: ["schedulingRequests"] });
  };

  const handleActionSubmitFromDialog = async (actionData: {
    assignedTechnicianId?: string | null;
    externalTechnicianName?: string | null;
    technicianType?: 'INTERNAL' | 'EXTERNAL' | null;
    notes?: string;
    status: SchedulingRequest['status'];
  }) => {
    if (!selectedRequestForAction) return;

    const { assignedTechnicianId, externalTechnicianName, technicianType, notes, status } = actionData;

    const updatePayload: any = {
      status: status,
      notes: notes,
      assigned_technician_id: null, // Reset by default
      external_technician_name: null, // Reset by default
      technician_name: null, // Reset by default
      technician_type: null, // Reset by default
    };

    if (status === 'approved') {
      updatePayload.technician_type = technicianType;
      if (technicianType === 'INTERNAL') {
        updatePayload.assigned_technician_id = assignedTechnicianId;
        // Fetch technician name for display
        if (assignedTechnicianId) {
          const { data: technicianData, error: techError } = await supabase
            .from('technicians')
            .select('name')
            .eq('id', assignedTechnicianId)
            .single();
          if (techError) {
            console.error('Error fetching technician name:', techError.message);
            toast({
              title: "Error",
              description: "Failed to fetch technician name.",
              variant: "destructive",
            });
            return;
          }
          updatePayload.technician_name = technicianData?.name;
        }
      } else if (technicianType === 'EXTERNAL') {
        updatePayload.external_technician_name = externalTechnicianName;
        updatePayload.technician_name = externalTechnicianName; // Use external name for general technician_name
      }
    } else if (['rejected', 'rescheduled', 'cancelled'].includes(status)) {
      // For these statuses, clear technician assignments
      updatePayload.assigned_technician_id = null;
      updatePayload.external_technician_name = null;
      updatePayload.technician_name = null;
      updatePayload.technician_type = null;
    }

    const { error: updateError } = await supabase
      .from('scheduling_requests')
      .update(updatePayload)
      .eq('id', selectedRequestForAction.id);

    if (updateError) {
      console.error('Error updating scheduling request status:', updateError.message);
      toast({
        title: "Error",
        description: `Failed to ${status} scheduling request: ${updateError.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Scheduling request successfully ${status}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["schedulingRequests"] });
    }
    setCurrentActionType(null);
    setSelectedRequestForAction(null);
  };

  if (isAuthLoading || isLoadingRequests) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10 space-y-6">
          <Skeleton className="h-10 w-1/2 bg-gray-700" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-64 bg-gray-700" />
            <Skeleton className="h-9 w-9 bg-gray-700" />
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full bg-gray-700" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || (profile.role !== "OPERASIONAL_DIV" && profile.role !== "SUPER_ADMIN")) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen text-gray-400">
          Unauthorized access.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6 text-neon-cyan">Operasional Scheduling Requests</h1>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search SR number, customer, address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm bg-midnight-blue border-gray-700 text-gray-200 placeholder:text-gray-500"
          />
          <Button variant="outline" size="icon" className="bg-midnight-blue border-gray-700 text-neon-cyan hover:bg-gray-800">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-gray-700 overflow-hidden">
        <Table className="min-w-full divide-y divide-gray-700">
          <TableHeader className="bg-midnight-blue">
            <TableRow>
              <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">SR Number</TableHead>
              <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Customer</TableHead>
              <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</TableHead>
              <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Requested Date</TableHead>
              <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</TableHead>
              <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-deep-charcoal divide-y divide-gray-800">
            {schedulingRequests?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-gray-400">No scheduling requests found.</TableCell>
              </TableRow>
            ) : (
              schedulingRequests?.map((request) => {
                const actions = [];
                if (request.status === "pending" && (profile?.role === "OPERASIONAL_DIV" || profile?.role === "SUPER_ADMIN")) {
                  actions.push(
                    <Button key="approve" variant="ghost" size="icon" onClick={() => {
                      setSelectedRequestForAction(request);
                      setCurrentActionType('approve');
                    }}>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </Button>
                  );
                  actions.push(
                    <Button key="reject" variant="ghost" size="icon" onClick={() => {
                      setSelectedRequestForAction(request);
                      setCurrentActionType('reject');
                    }}>
                      <XCircle className="h-4 w-4 text-red-500" />
                    </Button>
                  );
                }

                return (
                  <TableRow key={request.id} className="hover:bg-gray-800 transition-colors">
                    <TableCell className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-200">{request.sr_number}</TableCell>
                    <TableCell className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{request.customer_name || "N/A"}</TableCell>
                    <TableCell className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{request.type}</TableCell>
                    <TableCell className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{format(new Date(request.requested_date), "PPP")}</TableCell>
                    <TableCell className="px-4 py-2 whitespace-nowrap text-sm">
                      <Badge variant={getStatusBadgeVariant(request.status)}>{getStatusText(request.status)}</Badge>
                    </TableCell>
                    <TableCell className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(request)}>
                          <Eye className="h-4 w-4 text-gray-400" />
                        </Button>
                        {actions}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        {selectedRequest && (
          <SchedulingRequestDetail
            request={selectedRequest}
            onUpdate={handleDetailDialogClose}
            onClose={handleDetailDialogClose}
          />
        )}
      </Dialog>

      <Dialog open={!!currentActionType} onOpenChange={(open) => !open && setCurrentActionType(null)}>
        {selectedRequestForAction && currentActionType && (
          <SchedulingActionDialog
            isOpen={!!currentActionType}
            onClose={() => {
              setCurrentActionType(null);
              setSelectedRequestForAction(null);
            }}
            onSubmit={handleActionSubmitFromDialog}
            request={selectedRequestForAction}
            actionType={currentActionType}
          />
        )}
      </Dialog>
    </DashboardLayout>
  );
};

export default OperasionalSchedulingPage;