"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle, CalendarDays, Truck, FileText, Edit, Trash2, Loader2, CalendarIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import DashboardLayout from "@/layouts/DashboardLayout"; // Import DashboardLayout

// Define the type for a scheduling request based on your Supabase schema
type InvoiceDocumentStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'CANCELLED';

interface SchedulingRequest {
  id: string;
  sr_number: string;
  customer_name: string;
  company_name?: string;
  phone_number: string;
  contact_person: string;
  full_address: string;
  landmark?: string;
  requested_date: string;
  requested_time?: string;
  type: "INSTALLATION" | "MAINTENANCE" | "SURVEY" | "OTHER";
  product_category?: "gps_tracker" | "dashcam" | "OTHER";
  vehicle_details?: string;
  notes?: string;
  payment_method?: string;
  status: "pending" | "approved" | "rejected" | "rescheduled" | "completed" | "cancelled" | "in_progress";
  created_at: string;
  assigned_technician_id?: string;
  technician_name?: string;
  technician_type?: "INTERNAL" | "EXTERNAL";
  external_technician_name?: string;
  invoice_id?: string;
  invoice_status?: InvoiceDocumentStatus; // Use new enum type
  document_url?: string;
  delivery_order_id?: string;
}

interface Technician {
  id: string;
  name: string;
  type: "INTERNAL" | "EXTERNAL";
}

const OperasionalSchedulingPage = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequestForAction, setSelectedRequestForAction] = useState<SchedulingRequest | null>(null);
  const [currentActionType, setCurrentActionType] = useState<"rejected" | "rescheduled" | "cancelled" | "in_progress" | "completed" | "delete" | "edit" | "view_invoice" | "create_delivery_order" | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [newRequestedDate, setNewRequestedDate] = useState<Date | undefined>(undefined);
  const [newRequestedTime, setNewRequestedTime] = useState("");
  const [assignedTechnicianId, setAssignedTechnicianId] = useState<string | undefined>(undefined);
  const [technicianName, setTechnicianName] = useState<string | undefined>(undefined);
  const [technicianType, setTechnicianType] = useState<"INTERNAL" | "EXTERNAL">("INTERNAL");
  const [externalTechnicianName, setExternalTechnicianName] = useState<string | undefined>(undefined);
  const [isApproving, setIsApproving] = useState<string | null>(null);

  const { data: schedulingRequests, isLoading, error } = useQuery<SchedulingRequest[]>({
    queryKey: ["scheduling_requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("scheduling_requests").select("*")
        .order("created_at", { ascending: false }); // Sort by created_at in descending order
      if (error) throw error;
      return data;
    },
  });

  const { data: technicians, isLoading: isLoadingTechnicians } = useQuery<Technician[]>({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data, error } = await supabase.from("technicians").select("id, name, type");
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadgeVariant = (status: SchedulingRequest['status']) => {
    switch (status) {
      case "pending":
        return "yellow";
      case "approved":
        return "green";
      case "rejected":
        return "red";
      case "rescheduled":
        return "blue";
      case "completed":
        return "purple";
      case "cancelled":
        return "gray";
      case "in_progress":
        return "orange";
      default:
        return "default";
    }
  };

  const handleApproveRequest = async (request: SchedulingRequest) => {
    setIsApproving(request.id);
    const { error } = await supabase
      .from("scheduling_requests")
      .update({ status: "approved" })
      .eq("id", request.id);

    if (error) {
      toast.error("Failed to approve scheduling request.", {
        description: error.message,
      });
      console.error("Error approving scheduling request:", error);
    } else {
      toast.success("Scheduling request approved successfully!");
      queryClient.invalidateQueries({ queryKey: ["scheduling_requests"] });
    }
    setIsApproving(null);
  };

  const handleRejectRequest = async () => {
    if (!selectedRequestForAction) return;

    const { error } = await supabase
      .from("scheduling_requests")
      .update({ status: "rejected", notes: actionNotes })
      .eq("id", selectedRequestForAction.id);

    if (error) {
      toast.error("Failed to reject scheduling request.", {
        description: error.message,
      });
      console.error("Error rejecting scheduling request:", error);
    } else {
      toast.success("Scheduling request rejected successfully!");
      queryClient.invalidateQueries({ queryKey: ["scheduling_requests"] });
      setIsModalOpen(false);
      setActionNotes("");
      setSelectedRequestForAction(null);
      setCurrentActionType(null);
    }
  };

  const handleRescheduleRequest = async () => {
    if (!selectedRequestForAction || !newRequestedDate) return;

    const { error } = await supabase
      .from("scheduling_requests")
      .update({
        status: "rescheduled",
        requested_date: format(newRequestedDate, "yyyy-MM-dd"),
        requested_time: newRequestedTime,
        notes: actionNotes,
      })
      .eq("id", selectedRequestForAction.id);

    if (error) {
      toast.error("Failed to reschedule request.", {
        description: error.message,
      });
      console.error("Error rescheduling request:", error);
    } else {
      toast.success("Scheduling request rescheduled successfully!");
      queryClient.invalidateQueries({ queryKey: ["scheduling_requests"] });
      setIsModalOpen(false);
      setActionNotes("");
      setNewRequestedDate(undefined);
      setNewRequestedTime("");
      setSelectedRequestForAction(null);
      setCurrentActionType(null);
    }
  };

  const handleCancelRequest = async () => {
    if (!selectedRequestForAction) return;

    const { error } = await supabase
      .from("scheduling_requests")
      .update({ status: "cancelled", notes: actionNotes })
      .eq("id", selectedRequestForAction.id);

    if (error) {
      toast.error("Failed to cancel scheduling request.", {
        description: error.message,
      });
      console.error("Error cancelling scheduling request:", error);
    } else {
      toast.success("Scheduling request cancelled successfully!");
      queryClient.invalidateQueries({ queryKey: ["scheduling_requests"] });
      setIsModalOpen(false);
      setActionNotes("");
      setSelectedRequestForAction(null);
      setCurrentActionType(null);
    }
  };

  const handleInProgressRequest = async () => {
    if (!selectedRequestForAction) return;

    const { error } = await supabase
      .from("scheduling_requests")
      .update({ status: "in_progress", notes: actionNotes })
      .eq("id", selectedRequestForAction.id);

    if (error) {
      toast.error("Failed to set status to in progress.", {
        description: error.message,
      });
      console.error("Error setting status to in progress:", error);
    } else {
      toast.success("Scheduling request status updated to In Progress!");
      queryClient.invalidateQueries({ queryKey: ["scheduling_requests"] });
      setIsModalOpen(false);
      setActionNotes("");
      setSelectedRequestForAction(null);
      setCurrentActionType(null);
    }
  };

  const handleCompleteRequest = async () => {
    if (!selectedRequestForAction) return;

    const { error } = await supabase
      .from("scheduling_requests")
      .update({ status: "completed", notes: actionNotes })
      .eq("id", selectedRequestForAction.id);

    if (error) {
      toast.error("Failed to complete scheduling request.", {
        description: error.message,
      });
      console.error("Error completing scheduling request:", error);
    } else {
      toast.success("Scheduling request completed successfully!");
      queryClient.invalidateQueries({ queryKey: ["scheduling_requests"] });
      setIsModalOpen(false);
      setActionNotes("");
      setSelectedRequestForAction(null);
      setCurrentActionType(null);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("scheduling_requests")
      .delete()
      .eq("id", requestId);

    if (error) {
      toast.error("Failed to delete scheduling request.", {
        description: error.message,
      });
      console.error("Error deleting scheduling request:", error);
    } else {
      toast.success("Scheduling request deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["scheduling_requests"] });
    }
  };

  const handleEditRequest = async () => {
    if (!selectedRequestForAction) return;

    const updatedFields: Partial<SchedulingRequest> = {
      notes: actionNotes,
      assigned_technician_id: technicianType === "INTERNAL" ? assignedTechnicianId : null,
      technician_name: technicianType === "INTERNAL" ? technicianName : externalTechnicianName,
      technician_type: technicianType,
      external_technician_name: technicianType === "EXTERNAL" ? externalTechnicianName : null,
    };

    if (newRequestedDate) {
      updatedFields.requested_date = format(newRequestedDate, "yyyy-MM-dd");
    }
    if (newRequestedTime) {
      updatedFields.requested_time = newRequestedTime;
    }

    const { error } = await supabase
      .from("scheduling_requests")
      .update(updatedFields)
      .eq("id", selectedRequestForAction.id);

    if (error) {
      toast.error("Failed to update scheduling request.", {
        description: error.message,
      });
      console.error("Error updating scheduling request:", error);
    } else {
      toast.success("Scheduling request updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["scheduling_requests"] });
      setIsModalOpen(false);
      setActionNotes("");
      setNewRequestedDate(undefined);
      setNewRequestedTime("");
      setAssignedTechnicianId(undefined);
      setTechnicianName(undefined);
      setTechnicianType("INTERNAL");
      setExternalTechnicianName(undefined);
      setSelectedRequestForAction(null);
      setCurrentActionType(null);
    }
  };

  const handleOpenModal = (request: SchedulingRequest, action: typeof currentActionType) => {
    setSelectedRequestForAction(request);
    setCurrentActionType(action);
    setActionNotes(request.notes || "");
    setNewRequestedDate(request.requested_date ? new Date(request.requested_date) : undefined);
    setNewRequestedTime(request.requested_time || "");
    setAssignedTechnicianId(request.assigned_technician_id || undefined);
    setTechnicianName(request.technician_name || undefined);
    setTechnicianType(request.technician_type || "INTERNAL");
    setExternalTechnicianName(request.external_technician_name || undefined);
    setIsModalOpen(true);
  };

  if (isLoading) return (
    <DashboardLayout>
      <div className="text-center text-gray-300">Loading scheduling requests...</div>
    </DashboardLayout>
  );
  if (error) return (
    <DashboardLayout>
      <div className="text-center text-red-500">Error: {error.message}</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 bg-gray-900 text-gray-300 min-h-screen">
        <h1 className="text-3xl font-bold mb-6 text-neon-cyan">Operasional Scheduling Requests</h1>

        <div className="overflow-x-auto bg-gray-800 rounded-lg shadow-lg p-4">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-gray-700 hover:bg-gray-700">
                <TableHead className="text-neon-cyan">SR Number</TableHead>
                <TableHead className="text-neon-cyan">Customer Name</TableHead>
                <TableHead className="text-neon-cyan">Type</TableHead>
                <TableHead className="text-neon-cyan">Product Category</TableHead>
                <TableHead className="text-neon-cyan">Requested Date</TableHead>
                <TableHead className="text-neon-cyan">Technician</TableHead>
                <TableHead className="text-neon-cyan">Status</TableHead>
                <TableHead className="text-neon-cyan text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedulingRequests?.map((request) => (
                <TableRow key={request.id} className="border-gray-700 hover:bg-gray-700/50">
                  <TableCell className="font-medium">{request.sr_number}</TableCell>
                  <TableCell>{request.customer_name}</TableCell>
                  <TableCell>{request.type}</TableCell>
                  <TableCell>{request.product_category}</TableCell>
                  <TableCell>{format(new Date(request.created_at), "PPP")}</TableCell> {/* Changed to created_at for consistency with sorting */}
                  <TableCell>{request.technician_name || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(request.status)}>{request.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex space-x-2 justify-end">
                    <TooltipProvider>
                      {request.status === "pending" && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                key="approve"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApproveRequest(request)}
                                disabled={isApproving === request.id}
                              >
                                {isApproving === request.id ? (
                                  <Loader2 className="h-5 w-5 text-green-500 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-700 text-gray-300 border-gray-600">
                              <p>Approve Request</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button key="reject" variant="ghost" size="icon" onClick={() => handleOpenModal(request, 'rejected')}>
                                <XCircle className="h-5 w-5 text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-700 text-gray-300 border-gray-600">
                              <p>Reject Request</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button key="reschedule" variant="ghost" size="icon" onClick={() => handleOpenModal(request, 'rescheduled')}>
                                <CalendarDays className="h-5 w-5 text-blue-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-700 text-gray-300 border-gray-600">
                              <p>Reschedule Request</p>
                            </TooltipContent>
                          </Tooltip>
                        </>
                      )}
                      {(request.status === "approved" || request.status === "in_progress" || request.status === "rescheduled") && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button key="in_progress" variant="ghost" size="icon" onClick={() => handleOpenModal(request, 'in_progress')}>
                                <Truck className="h-5 w-5 text-orange-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-700 text-gray-300 border-gray-600">
                              <p>Set In Progress</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button key="complete" variant="ghost" size="icon" onClick={() => handleOpenModal(request, 'completed')}>
                                <CheckCircle className="h-5 w-5 text-purple-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-700 text-gray-300 border-gray-600">
                              <p>Complete Request</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button key="cancel" variant="ghost" size="icon" onClick={() => handleOpenModal(request, 'cancelled')}>
                                <XCircle className="h-5 w-5 text-gray-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-700 text-gray-300 border-gray-600">
                              <p>Cancel Request</p>
                            </TooltipContent>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button key="edit" variant="ghost" size="icon" onClick={() => handleOpenModal(request, 'edit')}>
                            <Edit className="h-5 w-5 text-blue-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-700 text-gray-300 border-gray-600">
                          <p>Edit Request</p>
                        </TooltipContent>
                      </Tooltip>
                      <AlertDialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-5 w-5 text-red-600" />
                              </Button>
                            </AlertDialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-700 text-gray-300 border-gray-600">
                            <p>Delete Request</p>
                          </TooltipContent>
                        </Tooltip>
                        <AlertDialogContent className="bg-gray-800 border-gray-700 text-gray-300">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-neon-cyan">Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-400">
                              This action cannot be undone. This will permanently delete the
                              scheduling request.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-gray-700 text-gray-300 hover:bg-gray-600">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteRequest(request.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      {request.invoice_id && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button key="view_invoice" variant="ghost" size="icon" onClick={() => handleOpenModal(request, 'view_invoice')}>
                              <FileText className="h-5 w-5 text-indigo-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-700 text-gray-300 border-gray-600">
                            <p>View Invoice</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {request.status === "approved" && !request.delivery_order_id && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button key="create_delivery_order" variant="ghost" size="icon" onClick={() => handleOpenModal(request, 'create_delivery_order')}>
                              <Truck className="h-5 w-5 text-cyan-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-700 text-gray-300 border-gray-600">
                            <p>Create Delivery Order</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Action Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-gray-300">
            <DialogHeader>
              <DialogTitle className="text-neon-cyan">
                {currentActionType === "rejected" && "Reject Scheduling Request"}
                {currentActionType === "rescheduled" && "Reschedule Scheduling Request"}
                {currentActionType === "cancelled" && "Cancel Scheduling Request"}
                {currentActionType === "in_progress" && "Set Status to In Progress"}
                {currentActionType === "completed" && "Complete Scheduling Request"}
                {currentActionType === "edit" && "Edit Scheduling Request"}
                {currentActionType === "view_invoice" && "View Invoice Details"}
                {currentActionType === "create_delivery_order" && "Create Delivery Order"}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {currentActionType === "rejected" && "Enter notes for rejecting this request."}
                {currentActionType === "rescheduled" && "Select a new date and time for this request."}
                {currentActionType === "cancelled" && "Enter notes for cancelling this request."}
                {currentActionType === "in_progress" && "Add any notes for setting this request to In Progress."}
                {currentActionType === "completed" && "Add any notes for completing this request."}
                {currentActionType === "edit" && "Update details for this scheduling request."}
                {currentActionType === "view_invoice" && "Invoice details for this request."}
                {currentActionType === "create_delivery_order" && "Confirm details for creating a delivery order."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {(currentActionType === "rejected" || currentActionType === "cancelled" || currentActionType === "in_progress" || currentActionType === "completed") && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right text-gray-300">Notes</Label>
                  <Textarea
                    id="notes"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="col-span-3 bg-gray-700 border-gray-600 text-gray-300"
                  />
                </div>
              )}
              {(currentActionType === "rescheduled" || currentActionType === "edit") && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="newDate" className="text-right text-gray-300">New Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "col-span-3 pl-3 text-left font-normal bg-gray-700 border-gray-600 text-gray-300",
                            !newRequestedDate && "text-gray-500"
                          )}
                        >
                          {newRequestedDate ? (
                            format(newRequestedDate, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700 text-gray-300" align="start">
                        <Calendar
                          mode="single"
                          selected={newRequestedDate}
                          onSelect={setNewRequestedDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="newTime" className="text-right text-gray-300">New Time</Label>
                    <Input
                      id="newTime"
                      value={newRequestedTime}
                      onChange={(e) => setNewRequestedTime(e.target.value)}
                      placeholder="e.g., 09:00 AM - 12:00 PM"
                      className="col-span-3 bg-gray-700 border-gray-600 text-gray-300"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="notes" className="text-right text-gray-300">Notes</Label>
                    <Textarea
                      id="notes"
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      className="col-span-3 bg-gray-700 border-gray-600 text-gray-300"
                    />
                  </div>
                </>
              )}
              {currentActionType === "edit" && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="technicianType" className="text-right text-gray-300">Technician Type</Label>
                    <Select
                      value={technicianType}
                      onValueChange={(value: "INTERNAL" | "EXTERNAL") => setTechnicianType(value)}
                    >
                      <SelectTrigger className="col-span-3 bg-gray-700 border-gray-600 text-gray-300">
                        <SelectValue placeholder="Select technician type" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-gray-300">
                        <SelectItem value="INTERNAL">Internal</SelectItem>
                        <SelectItem value="EXTERNAL">External</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {technicianType === "INTERNAL" && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="assignedTechnician" className="text-right text-gray-300">Assigned Technician</Label>
                      <Select
                        value={assignedTechnicianId}
                        onValueChange={(value) => {
                          setAssignedTechnicianId(value);
                          const selectedTech = technicians?.find((tech) => tech.id === value);
                          setTechnicianName(selectedTech?.name || undefined);
                        }}
                      >
                        <SelectTrigger className="col-span-3 bg-gray-700 border-gray-600 text-gray-300">
                          <SelectValue placeholder="Select an internal technician" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-gray-300">
                          {isLoadingTechnicians ? (
                            <SelectItem value="loading" disabled>Loading technicians...</SelectItem>
                          ) : (
                            technicians?.map((tech) => (
                              <SelectItem key={tech.id} value={tech.id}>
                                {tech.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {technicianType === "EXTERNAL" && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="externalTechnicianName" className="text-right text-gray-300">External Technician Name</Label>
                      <Input
                        id="externalTechnicianName"
                        value={externalTechnicianName}
                        onChange={(e) => setExternalTechnicianName(e.target.value)}
                        placeholder="Enter external technician's name"
                        className="col-span-3 bg-gray-700 border-gray-600 text-gray-300"
                      />
                    </div>
                  )}
                </>
              )}
              {currentActionType === "view_invoice" && selectedRequestForAction?.invoice_id && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-gray-300">Invoice ID</Label>
                  <span className="col-span-3 text-gray-400">{selectedRequestForAction.invoice_id}</span>
                  <Label className="text-right text-gray-300">Invoice Status</Label>
                  <span className="col-span-3 text-gray-400">{selectedRequestForAction.invoice_status}</span>
                  {/* Add more invoice details if available */}
                </div>
              )}
              {currentActionType === "create_delivery_order" && selectedRequestForAction && (
                <div className="space-y-2">
                  <p className="text-gray-400">Confirm creation of a Delivery Order for SR: <span className="font-medium text-neon-cyan">{selectedRequestForAction.sr_number}</span></p>
                  <p className="text-gray-400">Customer: <span className="font-medium text-gray-300">{selectedRequestForAction.customer_name}</span></p>
                  <p className="text-gray-400">Address: <span className="font-medium text-gray-300">{selectedRequestForAction.full_address}</span></p>
                  {/* You might want to add a form here to specify delivery items, date, etc. */}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="bg-gray-700 text-gray-300 hover:bg-gray-600">
                Cancel
              </Button>
              {currentActionType === "rejected" && (
                <Button onClick={handleRejectRequest} className="bg-red-600 hover:bg-red-700 text-white">
                  Reject Request
                </Button>
              )}
              {currentActionType === "rescheduled" && (
                <Button onClick={handleRescheduleRequest} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Reschedule Request
                </Button>
              )}
              {currentActionType === "cancelled" && (
                <Button onClick={handleCancelRequest} className="bg-gray-600 hover:bg-gray-700 text-white">
                  Cancel Request
                </Button>
              )}
              {currentActionType === "in_progress" && (
                <Button onClick={handleInProgressRequest} className="bg-orange-600 hover:bg-orange-700 text-white">
                  Set In Progress
                </Button>
              )}
              {currentActionType === "completed" && (
                <Button onClick={handleCompleteRequest} className="bg-purple-600 hover:bg-purple-700 text-white">
                  Complete Request
                </Button>
              )}
              {currentActionType === "edit" && (
                <Button onClick={handleEditRequest} className="bg-blue-500 hover:bg-blue-600 text-white">
                  Save Changes
                </Button>
              )}
              {currentActionType === "create_delivery_order" && (
                <Button onClick={() => {
                  // Implement delivery order creation logic here
                  toast.info("Delivery Order creation logic not yet implemented.");
                  setIsModalOpen(false);
                }} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  Create Delivery Order
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default OperasionalSchedulingPage;
