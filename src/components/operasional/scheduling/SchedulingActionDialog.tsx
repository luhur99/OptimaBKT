import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

// Define the possible statuses for a scheduling request
type SchedulingRequestStatus = 'pending' | 'approved' | 'rejected' | 'rescheduled' | 'cancelled' | 'in_progress' | 'completed';

interface Technician {
  id: string;
  name: string;
}

interface SchedulingRequest {
  id: string;
  sr_number: string;
  status: SchedulingRequestStatus;
  assigned_technician_id: string | null;
  notes: string | null;
}

interface SchedulingActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { assignedTechnicianId?: string; notes?: string; status: SchedulingRequestStatus }) => void;
  request: SchedulingRequest;
  actionType: 'approve' | 'reject' | 'reschedule' | 'cancel'; // New prop to define action
}

const formSchema = z.object({
  assignedTechnicianId: z.string().optional(),
  notes: z.string().optional(),
});

export function SchedulingActionDialog({
  isOpen,
  onClose,
  onSubmit,
  request,
  actionType,
}: SchedulingActionDialogProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assignedTechnicianId: actionType === 'approve' && request.assigned_technician_id ? request.assigned_technician_id : "",
      notes: request.notes || "",
    },
  });

  useEffect(() => {
    if (actionType === 'approve') {
      const fetchTechnicians = async () => {
        const { data, error } = await supabase
          .from("technicians")
          .select("id, name")
          .eq("type", "internal"); // Assuming only internal technicians can be assigned

        if (error) {
          console.error("Error fetching technicians:", error);
          showError("Failed to load technicians.");
        } else {
          setTechnicians(data || []);
        }
      };
      fetchTechnicians();
    }
  }, [actionType]);

  useEffect(() => {
    // Reset form when dialog opens or actionType changes
    if (isOpen) {
      form.reset({
        assignedTechnicianId: actionType === 'approve' && request.assigned_technician_id ? request.assigned_technician_id : "",
        notes: request.notes || "",
      });
    }
  }, [isOpen, actionType, request, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      let statusToSubmit: SchedulingRequestStatus;
      let finalNotes = values.notes;

      switch (actionType) {
        case 'approve':
          statusToSubmit = 'approved';
          if (!values.assignedTechnicianId) {
            form.setError("assignedTechnicianId", { message: "Technician is required for approval." });
            setIsSubmitting(false);
            return;
          }
          break;
        case 'reject':
          statusToSubmit = 'rejected';
          if (!finalNotes || finalNotes.trim() === "") {
            form.setError("notes", { message: "Reason is required for rejection." });
            setIsSubmitting(false);
            return;
          }
          break;
        case 'reschedule':
          statusToSubmit = 'rescheduled';
          if (!finalNotes || finalNotes.trim() === "") {
            form.setError("notes", { message: "Reason is required for rescheduling." });
            setIsSubmitting(false);
            return;
          }
          break;
        case 'cancel':
          statusToSubmit = 'cancelled';
          if (!finalNotes || finalNotes.trim() === "") {
            form.setError("notes", { message: "Reason is required for cancellation." });
            setIsSubmitting(false);
            return;
          }
          break;
        default:
          throw new Error("Invalid action type");
      }

      await onSubmit({
        assignedTechnicianId: actionType === 'approve' ? values.assignedTechnicianId : undefined,
        notes: finalNotes,
        status: statusToSubmit,
      });
      onClose();
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDialogTitle = () => {
    switch (actionType) {
      case 'approve': return `Approve Request ${request.sr_number}`;
      case 'reject': return `Reject Request ${request.sr_number}`;
      case 'reschedule': return `Reschedule Request ${request.sr_number}`;
      case 'cancel': return `Cancel Request ${request.sr_number}`;
      default: return "Scheduling Action";
    }
  };

  const getSubmitButtonText = () => {
    switch (actionType) {
      case 'approve': return isSubmitting ? "Approving..." : "Approve Request";
      case 'reject': return isSubmitting ? "Rejecting..." : "Reject Request";
      case 'reschedule': return isSubmitting ? "Rescheduling..." : "Reschedule Request";
      case 'cancel': return isSubmitting ? "Cancelling..." : "Cancel Request";
      default: return isSubmitting ? "Submitting..." : "Submit";
    }
  };

  return (
    <DialogContent className="glassmorphism border border-electric-violet/30 text-foreground animate-in fade-in-50 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
      <DialogHeader>
        <DialogTitle className="text-neon-cyan">{getDialogTitle()}</DialogTitle>
        <DialogDescription className="text-gray-400">
          Please provide details for this action.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
          {actionType === 'approve' && (
            <FormField
              control={form.control}
              name="assignedTechnicianId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Assign Technician</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="glassmorphism border border-gray-700 text-gray-300">
                        <SelectValue placeholder="Select a technician" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glassmorphism border border-gray-700 text-gray-300">
                      {technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-300">Notes {actionType !== 'approve' ? "(Required)" : "(Optional)"}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add any relevant notes or reasons..."
                    {...field}
                    className="glassmorphism border border-gray-700 text-gray-300"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="glassmorphism border border-gray-700 text-gray-300 hover:bg-gray-800">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300">
              {getSubmitButtonText()}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}