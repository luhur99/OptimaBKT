import React, { useState } from "react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { cn } from "@/lib/utils";

export type PoItemForArrival = {
  id: string;
  product_name: string;
  qty_request: number;
  qty_received: number; // Already received
  current_input_qty: number; // For this session's input (no longer directly used for input value)
};

interface ConfirmArrivalModalProps {
  poId: string;
  poNumber: string;
  items: PoItemForArrival[];
  onConfirmSuccess: () => void;
  onClose: () => void;
}

export const ConfirmArrivalModal: React.FC<ConfirmArrivalModalProps> = ({
  poId,
  poNumber,
  items,
  onConfirmSuccess,
  onClose,
}) => {
  const { session } = useAuthSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Initialize receivedQuantities with the current total received for each item
  const [receivedQuantities, setReceivedQuantities] = useState<{ [key: string]: number }>(
    items.reduce((acc, item) => ({ ...acc, [item.id]: item.qty_received }), {})
  );

  const handleQuantityChange = (itemId: string, value: string) => {
    const qty = parseInt(value, 10);
    setReceivedQuantities((prev) => ({
      ...prev,
      [itemId]: isNaN(qty) ? 0 : qty,
    }));
  };

  const handleSubmitArrival = async () => {
    setIsSubmitting(true);
    try {
      const itemsToProcess: { po_item_id: string; qty_to_add: number; product_name: string; }[] = [];

      // Client-side re-validation and calculation of quantity to add
      const { data: latestPoItems, error: latestItemsError } = await supabase
        .from('po_items')
        .select('id, qty_request, qty_received')
        .in('id', items.map(item => item.id));

      if (latestItemsError) {
        throw new Error(latestItemsError.message || "Failed to re-validate item quantities.");
      }

      for (const item of items) {
        const latestItem = latestPoItems.find(li => li.id === item.id);
        if (!latestItem) {
          throw new Error(`Item ${item.product_name} not found during re-validation.`);
        }

        const newTotalReceivedInput = receivedQuantities[item.id] || 0; // This is the total quantity the user wants to set
        const alreadyReceived = latestItem.qty_received;
        const requestedQuantity = latestItem.qty_request;

        if (newTotalReceivedInput < alreadyReceived) {
          throw new Error(`Cannot reduce already received quantity for item ${item.product_name}. Current received: ${alreadyReceived}, Attempted to set: ${newTotalReceivedInput}.`);
        }
        if (newTotalReceivedInput > requestedQuantity) {
          throw new Error(`Total received quantity for item ${item.product_name} (${newTotalReceivedInput}) exceeds requested quantity (${requestedQuantity}).`);
        }

        const quantityToAdd = newTotalReceivedInput - alreadyReceived;

        if (quantityToAdd > 0) {
          itemsToProcess.push({
            po_item_id: item.id,
            qty_to_add: quantityToAdd,
            product_name: item.product_name, // For better error messages
          });
        }
      }

      if (itemsToProcess.length === 0) {
        showError("No new quantities entered or all items already fully received.");
        setIsSubmitting(false);
        return;
      }

      // Prepare payload for edge function (which expects qty_received as *additional*)
      const payloadItems = itemsToProcess.map(item => ({
        po_item_id: item.po_item_id,
        qty_received: item.qty_to_add,
      }));

      const response = await fetch(
        `https://hhhzugqimtypijkdxxsm.supabase.co/functions/v1/confirm-po-arrival`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ po_id: poId, items_received: payloadItems }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to confirm arrival.");
      }

      showSuccess(`Arrival confirmed for PO ${poNumber}!`);
      onConfirmSuccess();
      onClose();
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <React.Fragment> {/* Changed from <> */}
      <DialogHeader>
        <DialogTitle className="text-neon-cyan">Confirm Arrival for PO: <span className="text-electric-violet">{poNumber}</span></DialogTitle>
        <DialogDescription className="text-gray-400">
          Enter the total quantity received for each item.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={`qty-${item.id}`} className="col-span-2 text-gray-300">
              {item.product_name} (Requested: {item.qty_request})
            </Label>
            <Input
              id={`qty-${item.id}`}
              type="number"
              value={receivedQuantities[item.id]}
              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
              min="0"
              max={item.qty_request} {/* Max is now the total requested quantity */}
              className="col-span-2 glassmorphism border border-gray-700 text-gray-300"
              disabled={receivedQuantities[item.id] === item.qty_request} {/* Disable if total received equals requested */}
            />
            {receivedQuantities[item.id] === item.qty_request && (
              <span className="col-span-4 text-xs text-green-500">All items received.</span>
            )}
          </div>
        ))}
      </div>
      <DialogFooter className="pt-4">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="glassmorphism border border-gray-700 text-gray-300 hover:bg-gray-800">
          Cancel
        </Button>
        <Button type="submit" onClick={handleSubmitArrival} disabled={isSubmitting} className="bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300">
          {isSubmitting ? "Confirming..." : "Confirm Arrival"}
        </Button>
      </DialogFooter>
    </React.Fragment> {/* Changed from </> */}
  );
};