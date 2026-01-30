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
  status: 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED';
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
  actionType: 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED';
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
      case "IN_PROGRESS":
        return "Set Delivery Order In Progress";
      case "DELIVERED":
        return "Mark Delivery Order as Delivered";
      case "CANCELLED":
        return "Cancel Delivery Order";
      default:
        return "Delivery Order Action";
    }
  };

  const handleSubmit = async () => {
    if (actionType === 'CANCELLED' && (!notes || notes.trim() === "")) {
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

  return (
    <DialogContent className="glassmorphism border border-electric-violet/30 text-foreground animate-in fade-in-50 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
      <DialogHeader>
        <DialogTitle className="text-neon-cyan">{getDialogTitle()}</DialogTitle>
        <DialogDescription className="text-gray-400">
          {actionType === 'IN_PROGRESS' && "Confirm that this delivery order is now in progress."}
          {actionType === 'DELIVERED' && "Confirm that this delivery order has been successfully delivered."}
          {actionType === 'CANCELLED' && "Please provide notes for cancelling this delivery order."}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        {(actionType === 'CANCELLED') && (
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
          {isSubmitting ? "Processing..." : `Confirm ${actionType.replace(/_/g, ' ').charAt(0).toUpperCase() + actionType.replace(/_/g, ' ').slice(1)}`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};