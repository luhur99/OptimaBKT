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
import { useToast } from "@/components/ui/use-toast";

interface DeliveryOrder {
  id: string;
  status: 'pending' | 'on_delivery' | 'delivered' | 'cancelled';
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
  actionType: 'on_delivery' | 'delivered' | 'cancelled';
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
  const { toast } = useToast();

  const getDialogTitle = () => {
    switch (actionType) {
      case "on_delivery":
        return "Set Delivery Order On Delivery";
      case "delivered":
        return "Mark Delivery Order as Delivered";
      case "cancelled":
        return "Cancel Delivery Order";
      default:
        return "Delivery Order Action";
    }
  };

  const handleSubmit = async () => {
    if (actionType === 'cancelled' && (!notes || notes.trim() === "")) {
      toast({
        title: "Validation Error",
        description: "Notes are required for cancelling a delivery order.",
        variant: "destructive",
      });
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
          {actionType === 'on_delivery' && "Confirm that this delivery order is now on delivery."}
          {actionType === 'delivered' && "Confirm that this delivery order has been successfully delivered."}
          {actionType === 'cancelled' && "Please provide notes for cancelling this delivery order."}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        {(actionType === 'cancelled') && (
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