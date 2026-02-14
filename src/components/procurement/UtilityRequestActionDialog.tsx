import React, { useState } from "react";
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
import { showError } from "@/utils/toast";
import { UtilityRequest, UtilityRequestStatus } from "./utility-request-columns";

interface UtilityRequestActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (actionData: {
    status: UtilityRequestStatus;
    notes?: string;
  }) => Promise<void>;
  request: UtilityRequest;
  actionType: "approved" | "rejected";
}

export const UtilityRequestActionDialog: React.FC<UtilityRequestActionDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  request,
  actionType,
}) => {
  const [notes, setNotes] = useState(request.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getDialogTitle = () => {
    switch (actionType) {
      case "approved":
        return "Approve Utility Request";
      case "rejected":
        return "Reject Utility Request";
      default:
        return "Utility Request Action";
    }
  };

  const getDialogDescription = () => {
    switch (actionType) {
      case "approved":
        return "Confirm approval for this utility request.";
      case "rejected":
        return "Please provide notes for rejecting this utility request.";
      default:
        return "";
    }
  };

  const handleSubmit = async () => {
    if (actionType === "rejected" && (!notes || notes.trim() === "")) {
      showError("Notes are required for rejecting a utility request.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        status: actionType,
        notes,
      });
      setNotes("");
      onClose();
    } catch (error) {
      console.error("Error submitting action:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getButtonLabel = () => {
    switch (actionType) {
      case "approved":
        return "Confirm Approval";
      case "rejected":
        return "Confirm Rejection";
      default:
        return "Confirm";
    }
  };

  return (
    <DialogContent className="glassmorphism border border-electric-violet/30 text-foreground animate-in fade-in-50 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
      <DialogHeader>
        <DialogTitle className="text-neon-cyan">{getDialogTitle()}</DialogTitle>
        <DialogDescription className="text-gray-400">
          {getDialogDescription()}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-gray-300">
            Notes {actionType === "rejected" ? "(Required)" : "(Optional)"}
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Enter notes"
            className="bg-midnight-blue border-gray-700 text-gray-200 placeholder:text-gray-500"
          />
        </div>
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
          {isSubmitting ? "Processing..." : getButtonLabel()}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};
