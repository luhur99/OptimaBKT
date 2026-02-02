import React, { useState, useEffect } from "react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface SchedulingRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'rescheduled' | 'cancelled' | 'in_progress' | 'completed';
  notes: string | null;
  assigned_technician_id: string | null;
  technician_name: string | null;
  external_technician_name: string | null;
  technician_type: 'INTERNAL' | 'EXTERNAL' | null;
}

interface Technician {
  id: string;
  name: string;
  type: 'internal' | 'external';
}

interface SchedulingActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (actionData: {
    assignedTechnicianId?: string | null;
    externalTechnicianName?: string | null;
    technicianType?: 'INTERNAL' | 'EXTERNAL' | null;
    notes?: string;
    status: SchedulingRequest['status'];
  }) => Promise<void>; // Changed to return Promise
  request: SchedulingRequest;
  actionType: 'approved' | 'rejected' | 'rescheduled' | 'cancelled';
}

export const SchedulingActionDialog: React.FC<SchedulingActionDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  request,
  actionType,
}) => {
  const [notes, setNotes] = useState(request.notes || "");
  const [assignedTechnicianId, setAssignedTechnicianId] = useState<string | null>(request.assigned_technician_id);
  const [externalTechnicianName, setExternalTechnicianName] = useState<string | null>(request.external_technician_name);
  const [selectedTechnicianType, setSelectedTechnicianType] = useState<'INTERNAL' | 'EXTERNAL'>(request.technician_type || 'INTERNAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { data: technicians, isLoading: isLoadingTechnicians, error: techniciansError } = useQuery<Technician[]>({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data, error } = await supabase.from("technicians").select("id, name, type");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (techniciansError) {
      toast({
        title: "Error",
        description: "Failed to load technicians: " + techniciansError.message,
        variant: "destructive",
      });
    }
  }, [techniciansError, toast]);

  const getDialogTitle = () => {
    switch (actionType) {
      case "approved":
        return "Approve Scheduling Request";
      case "rejected":
        return "Reject Scheduling Request";
      case "rescheduled":
        return "Reschedule Scheduling Request";
      case "cancelled":
        return "Cancel Scheduling Request";
      default:
        return "Scheduling Action";
    }
  };

  const handleSubmit = async () => { // Changed to async
    if (actionType === 'approved') {
      if (selectedTechnicianType === 'INTERNAL' && !assignedTechnicianId) {
        toast({
          title: "Validation Error",
          description: "Please select an internal technician.",
          variant: "destructive",
        });
        return;
      }
      if (selectedTechnicianType === 'EXTERNAL' && (!externalTechnicianName || externalTechnicianName.trim() === "")) {
        toast({
          title: "Validation Error",
          description: "Please enter the external technician's name.",
          variant: "destructive",
        });
        return;
      }
    }

    if (['rejected', 'rescheduled', 'cancelled'].includes(actionType) && (!notes || notes.trim() === "")) {
      toast({
        title: "Validation Error",
        description: "Notes are required for this action.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        status: actionType,
        notes: notes,
        assignedTechnicianId: selectedTechnicianType === 'INTERNAL' ? assignedTechnicianId : null,
        externalTechnicianName: selectedTechnicianType === 'EXTERNAL' ? externalTechnicianName : null,
        technicianType: selectedTechnicianType,
      });
      // Reset state after successful submit
      setNotes("");
      setAssignedTechnicianId(null);
      setExternalTechnicianName(null);
      setSelectedTechnicianType('INTERNAL');
      onClose();
    } catch (error) {
      // Error is already handled by parent, just log it
      console.error('Error submitting action:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const internalTechnicians = technicians?.filter(t => t.type === 'internal') || [];

  return (
    <DialogContent className="glassmorphism border border-electric-violet/30 text-foreground animate-in fade-in-50 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
      <DialogHeader>
        <DialogTitle className="text-neon-cyan">{getDialogTitle()}</DialogTitle>
        <DialogDescription className="text-gray-400">
          {actionType === 'approved'
            ? "Assign a technician and confirm approval for this scheduling request."
            : `Please provide notes for ${actionType} this scheduling request.`}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        {actionType === 'approved' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="technicianType" className="text-gray-300">Technician Type</Label>
              <RadioGroup
                defaultValue={selectedTechnicianType}
                onValueChange={(value: 'INTERNAL' | 'EXTERNAL') => {
                  setSelectedTechnicianType(value);
                  setAssignedTechnicianId(null); // Reset when type changes
                  setExternalTechnicianName(null); // Reset when type changes
                }}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="INTERNAL" id="internal-technician" />
                  <Label htmlFor="internal-technician" className="text-gray-300">Internal Technician</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="EXTERNAL" id="external-technician" />
                  <Label htmlFor="external-technician" className="text-gray-300">External Technician</Label>
                </div>
              </RadioGroup>
            </div>

            {selectedTechnicianType === 'INTERNAL' && (
              <div className="space-y-2">
                <Label htmlFor="assignedTechnician" className="text-gray-300">Assigned Technician</Label>
                {isLoadingTechnicians ? (
                  <Input value="Loading technicians..." disabled className="bg-midnight-blue border-gray-700 text-gray-400" />
                ) : (
                  <Select onValueChange={setAssignedTechnicianId} value={assignedTechnicianId || ""}>
                    <SelectTrigger className="w-full bg-midnight-blue border-gray-700 text-gray-200">
                      <SelectValue placeholder="Select a technician" />
                    </SelectTrigger>
                    <SelectContent className="bg-midnight-blue border-gray-700 text-gray-200">
                      {internalTechnicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {selectedTechnicianType === 'EXTERNAL' && (
              <div className="space-y-2">
                <Label htmlFor="externalTechnicianName" className="text-gray-300">External Technician Name</Label>
                <Input
                  id="externalTechnicianName"
                  value={externalTechnicianName || ""}
                  onChange={(e) => setExternalTechnicianName(e.target.value)}
                  className="bg-midnight-blue border-gray-700 text-gray-200 placeholder:text-gray-500"
                />
              </div>
            )}
          </>
        )}

        {['rejected', 'rescheduled', 'cancelled'].includes(actionType) && (
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-300">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes for this action"
              className="bg-midnight-blue border-gray-700 text-gray-200 placeholder:text-gray-500"
            />
          </div>
        )}
      </div>
      <DialogFooter>
        <Button 
          variant="outline" 
          onClick={onClose} 
          className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          className="bg-neon-cyan text-midnight-blue hover:bg-neon-cyan/90"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Processing..." : `Confirm ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};