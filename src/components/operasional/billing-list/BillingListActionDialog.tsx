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
import { Invoice } from './billing-list-columns';

interface BillingListActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (actionData: {
    payment_status: Invoice['payment_status'];
    notes?: string;
  }) => Promise<void>;
  invoice: Invoice;
  actionType: 'paid' | 'overdue';
}

export const BillingListActionDialog: React.FC<BillingListActionDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  invoice,
  actionType,
}) => {
  const [notes, setNotes] = useState(invoice.notes || ""); // Assuming invoice has a notes field
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getDialogTitle = () => {
    switch (actionType) {
      case "paid":
        return "Mark Invoice as Paid";
      case "overdue":
        return "Mark Invoice as Overdue";
      default:
        return "Invoice Action";
    }
  };

  const getDialogDescription = () => {
    switch (actionType) {
      case "paid":
        return "Confirm that this invoice has been successfully paid.";
      case "overdue":
        return "Please provide notes for marking this invoice as overdue.";
      default:
        return "";
    }
  };

  const handleSubmit = async () => {
    if (actionType === 'overdue' && (!notes || notes.trim() === "")) {
      showError("Notes are required for marking an invoice as overdue.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        payment_status: actionType,
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
      case "paid":
        return "Confirm Paid";
      case "overdue":
        return "Confirm Overdue";
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
        {(actionType === 'overdue') && (
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-300">Notes (Required)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter reason for overdue status"
              className="bg-midnight-blue border-gray-700 text-gray-200 placeholder:text-gray-500"
            />
          </div>
        )}
        {(actionType === 'paid') && (
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
