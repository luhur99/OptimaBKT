import { useState, useEffect } from "react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { SchedulingRequest } from "./scheduling-columns";

interface ApproveSchedulingRequestDialogProps {
  request: SchedulingRequest | null;
  onApproveSuccess: () => void;
  onClose: () => void;
}

interface Technician {
  id: string;
  full_name: string;
}

export function ApproveSchedulingRequestDialog({
  request,
  onApproveSuccess,
  onClose,
}: ApproveSchedulingRequestDialogProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchTechnicians = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "TECHNICIAN");

      if (error) {
        console.error("Error fetching technicians:", error);
        showError("Failed to load technicians.");
      } else {
        setTechnicians(data || []);
      }
    };

    fetchTechnicians();
  }, []);

  const handleApprove = async () => {
    if (!request || !selectedTechnicianId) {
      showError("Please select a technician.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("scheduling_requests")
        .update({
          status: "approved",
          assigned_technician_id: selectedTechnicianId,
        })
        .eq("id", request.id);

      if (error) {
        throw new Error(error.message);
      }

      showSuccess("Scheduling request approved and technician assigned!");
      onApproveSuccess();
      onClose();
    } catch (error: any) {
      showError(error.message || "Failed to approve request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!request) return null;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Approve Scheduling Request</DialogTitle>
        <DialogDescription>
          Assign a technician to SR Number: <strong>{request.sr_number}</strong>
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="technician" className="text-right">
            Technician
          </Label>
          <Select onValueChange={setSelectedTechnicianId} value={selectedTechnicianId || ""}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Select a technician" />
            </SelectTrigger>
            <SelectContent>
              {technicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>
                  {tech.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleApprove} disabled={isSubmitting || !selectedTechnicianId}>
          {isSubmitting ? "Approving..." : "Approve Request"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}