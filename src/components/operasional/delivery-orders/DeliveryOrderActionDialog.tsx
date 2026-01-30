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
import { showSuccess, showError } from "@/utils/toast";

interface DeliveryOrder {
  id: string;
  status: 'pending' | 'in progress' | 'completed' | 'cancelled';
  notes: string | null;
}

interface DeliveryOrderActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (actionData: {
    status: DeliveryOrder['status'];
    notes?: string;
  }) => Promise<void>;
  order: DeliveryOrder;
  actionType: 'in progress' | 'completed' | 'cancelled';
}

export const DeliveryOrderActionDialog: React.FC<DeliveryOrderActionDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  order,
  actionType,
}) => {
  const [notes, setNotes] = useState(order.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getDialogTitle = () => {
    switch (actionType) {
      case "in progress":
        return "Set Delivery Order In Progress";
      case "completed":
        return "Mark Delivery Order as Completed";
      case "cancelled":
        return "Cancel Delivery Order";
      default:
        return "Delivery Order Action";
    }
  };

  const getDialogDescription = () => {
    switch (actionType) {
      case "in progress":
        return "Confirm that this delivery order is now in progress.";
      case "completed":
        return "Confirm that this delivery order has been successfully completed.";
      case "cancelled":
        return "Please provide notes for cancelling this delivery order.";
      default:
        return "";
    }
  };

  const handleSubmit = async () => {
    if (actionType === 'cancelled' && (!notes || notes.trim() === "")) {
      showError("Notes are required for cancelling a delivery order.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        status: actionType,
        notes: notes,
      });
      setNotes("");
      onClose();
    } catch (error) {
      console.error('Error submitting action:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getButtonLabel = () => {
    switch (actionType) {
      case "in progress":
        return "Confirm In Progress";
      case "completed":
        return "Confirm Completed";
      case "cancelled":
        return "Confirm Cancelled";
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
        {(actionType === 'cancelled') && (
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-300">Notes (Required)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter reason for cancellation"
              className="bg-midnight-blue border-gray-700 text-gray-200 placeholder:text-gray-500"
            />
          </div>
        )}
        {(actionType === 'in progress' || actionType === 'completed') && (
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-300">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes"
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
          {isSubmitting ? "Processing..." : getButtonLabel()}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};