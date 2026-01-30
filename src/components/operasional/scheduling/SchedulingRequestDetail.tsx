import React from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ApprovalDialog } from "./ApprovalDialog";
import { SchedulingRequest } from "./scheduling-columns";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Clock, Play, FastForward, CalendarCheck, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { useAuthSession } from "@/hooks/use-auth-session";

interface SchedulingRequestDetailProps {
  request: SchedulingRequest;
  onUpdate: () => void;
  onClose: () => void;
}

const StatusStepper: React.FC<{ currentStatus: SchedulingRequest['status'] }> = ({ currentStatus }) => {
  const statuses: Array<SchedulingRequest['status']> = [
    'pending',
    'approved',
    'in_progress',
    'completed',
  ];

  const getStatusIcon = (status: SchedulingRequest['status'], isActive: boolean) => {
    const baseClass = "h-5 w-5";
    const activeClass = "text-neon-cyan neon-glow";
    const inactiveClass = "text-gray-500";

    switch (status) {
      case 'pending':
        return <Clock className={cn(baseClass, isActive ? activeClass : inactiveClass)} />;
      case 'approved':
        return <CheckCircle className={cn(baseClass, isActive ? activeClass : inactiveClass)} />;
      case 'in_progress':
        return <Play className={cn(baseClass, isActive ? activeClass : inactiveClass)} />;
      case 'completed':
        return <CalendarCheck className={cn(baseClass, isActive ? activeClass : inactiveClass)} />;
      default:
        return <UserCog className={cn(baseClass, inactiveClass)} />;
    }
  };

  const getStatusColorClass = (status: SchedulingRequest['status'], isActive: boolean) => {
    if (currentStatus === 'rejected' || currentStatus === 'cancelled') {
      return "text-red-400";
    }
    return isActive ? "text-neon-cyan" : "text-gray-500";
  };

  return (
    <div className="flex items-center justify-between text-sm text-gray-400">
      {statuses.map((status, index) => {
        const isActive = statuses.indexOf(currentStatus) >= index;
        const isCurrent = currentStatus === status;
        const isFinalFailed = (currentStatus === 'rejected' || currentStatus === 'cancelled') && index === statuses.length - 1;

        return (
          <React.Fragment key={status}>
            <div className="flex flex-col items-center">
              <div className={cn("p-2 rounded-full border-2",
                isFinalFailed ? "border-red-500 bg-red-500/20" :
                isActive ? "border-neon-cyan bg-neon-cyan/20 neon-glow" : "border-gray-700 bg-gray-800"
              )}>
                {isFinalFailed ? <XCircle className="h-5 w-5 text-red-400" /> : getStatusIcon(status, isActive)}
              </div>
              <span className={cn("mt-2 text-xs font-medium", getStatusColorClass(status, isActive))}>
                {status.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            {index < statuses.length - 1 && (
              <div className={cn("flex-1 h-0.5 mx-2",
                isFinalFailed ? "bg-red-500" :
                isActive ? "bg-neon-cyan neon-glow" : "bg-gray-700"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};


export const SchedulingRequestDetail: React.FC<SchedulingRequestDetailProps> = ({
  request,
  onUpdate,
  onClose,
}) => {
  const { profile } = useAuthSession();
  const [isApproveDialogOpen, setIsApproveDialogOpen] = React.useState(false);

  const handleForceStart = async () => {
    if (!window.confirm("Are you sure you want to force start this request?")) return;
    try {
      const { error } = await supabase
        .from("scheduling_requests")
        .update({ status: "in_progress" })
        .eq("id", request.id);

      if (error) throw new Error(error.message);
      showSuccess("Request status updated to 'In Progress'.");
      onUpdate();
    } catch (error: any) {
      showError(error.message || "Failed to force start request.");
    }
  };

  const handleMarkCompleted = async () => {
    if (!window.confirm("Are you sure you want to mark this request as completed?")) return;
    try {
      const { error } = await supabase
        .from("scheduling_requests")
        .update({ status: "completed" })
        .eq("id", request.id);

      if (error) throw new Error(error.message);
      showSuccess("Request status updated to 'Completed'.");
      onUpdate();
    } catch (error: any) {
      showError(error.message || "Failed to mark request as completed.");
    }
  };

  const handleReject = async () => {
    const reason = prompt("Please provide a reason for rejecting this request:");
    if (!reason) {
      showError("Rejection reason is required.");
      return;
    }
    if (!window.confirm("Are you sure you want to reject this request?")) return;
    try {
      const { error } = await supabase
        .from("scheduling_requests")
        .update({ status: "rejected", notes: reason })
        .eq("id", request.id);

      if (error) throw new Error(error.message);
      showSuccess("Request rejected.");
      onUpdate();
    } catch (error: any) {
      showError(error.message || "Failed to reject request.");
    }
  };

  const handleReschedule = async () => {
    const reason = prompt("Please provide a reason for rescheduling this request:");
    if (!reason) {
      showError("Reschedule reason is required.");
      return;
    }
    if (!window.confirm("Are you sure you want to reschedule this request?")) return;
    try {
      const { error } = await supabase
        .from("scheduling_requests")
        .update({ status: "rescheduled", notes: reason })
        .eq("id", request.id);

      if (error) throw new Error(error.message);
      showSuccess("Request rescheduled.");
      onUpdate();
    } catch (error: any) {
      showError(error.message || "Failed to reschedule request.");
    }
  };

  const canApprove = profile?.role === "OPERASIONAL_DIV" || profile?.role === "SUPER_ADMIN";
  const canForceStartOrComplete = profile?.role === "OPERASIONAL_DIV" || profile?.role === "SUPER_ADMIN";

  return (
    <Card className="glassmorphism border border-electric-violet/30 h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl text-neon-cyan">
            SR Details: <span className="text-electric-violet">{request.sr_number}</span>
          </CardTitle>
          <Button variant="outline" onClick={onClose} className="glassmorphism border border-gray-700 text-gray-300 hover:bg-gray-800">
            Close
          </Button>
        </div>
        <p className="text-sm text-gray-400 mt-1">Customer: {request.customer_name}</p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-neon-cyan">Current Status</h3>
          <StatusStepper currentStatus={request.status} />
          <Badge className="mt-2 bg-gray-700/20 text-gray-300 border border-gray-600/30">
            {request.status.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>

        <Separator className="bg-gray-700" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
          <div>
            <p className="text-sm font-medium text-gray-400">DO Number:</p>
            <p className="text-base">{request.do_number || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400">Assigned Technician:</p>
            <p className="text-base">{request.technician_name || "Unassigned"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400">Technician Type:</p>
            <p className="text-base">{request.technician_type || "N/A"}</p>
          </div>
          {request.external_technician_name && (
            <div>
              <p className="text-sm font-medium text-gray-400">External Technician Name:</p>
              <p className="text-base">{request.external_technician_name}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-400">Requested Date:</p>
            <p className="text-base">{format(new Date(request.requested_date), "PPP")}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400">Requested Time:</p>
            <p className="text-base">{request.requested_time || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400">Contact Person:</p>
            <p className="text-base">{request.contact_person}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400">Phone Number:</p>
            <p className="text-base">{request.phone_number || "N/A"}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-gray-400">Full Address:</p>
            <p className="text-base">{request.full_address}</p>
          </div>
          {request.notes && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-400">Notes:</p>
              <p className="text-base italic text-gray-500">{request.notes}</p>
            </div>
          )}
          {request.document_url && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-400">Technician Document/Photo:</p>
              <a
                href={request.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neon-cyan hover:underline"
              >
                View Document
              </a>
            </div>
          )}
        </div>

        <Separator className="bg-gray-700" />

        <div className="flex flex-wrap gap-3 justify-end">
          {canApprove && request.status === "pending" && (
            <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-neon-cyan text-deep-charcoal hover:bg-neon-cyan/80 neon-glow-hover transition-all duration-300">
                  Approve Request
                </Button>
              </DialogTrigger>
              <ApprovalDialog
                request={request}
                onApproveSuccess={() => {
                  onUpdate();
                  setIsApproveDialogOpen(false);
                }}
                onClose={() => setIsApproveDialogOpen(false)}
              />
            </Dialog>
          )}
          {canApprove && request.status === "pending" && (
            <Button
              onClick={handleReject}
              className="bg-destructive text-white hover:bg-destructive/80 neon-violet-glow-hover transition-all duration-300"
            >
              Reject Request
            </Button>
          )}
          {canApprove && (request.status === "pending" || request.status === "approved" || request.status === "in_progress") && (
            <Button
              onClick={handleReschedule}
              className="bg-gray-600 text-white hover:bg-gray-600/80 transition-all duration-300"
            >
              Reschedule
            </Button>
          )}
          {canForceStartOrComplete && request.status === "approved" && (
            <Button
              onClick={handleForceStart}
              className="bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300"
            >
              Force Start Work
            </Button>
          )}
          {canForceStartOrComplete && request.status === "in_progress" && (
            <Button
              onClick={handleMarkCompleted}
              className="bg-green-600 text-white hover:bg-green-600/80 transition-all duration-300"
            >
              Mark as Completed
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};