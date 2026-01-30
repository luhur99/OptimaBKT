import { useState } from "react";
import {
  DialogContent,
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
  current_input_qty: number; // For this session's input
};

interface ConfirmArrivalModalProps {
  poId: string;
  poNumber: string;
  items: PoItemForArrival[];
  onConfirmSuccess: () => void;
  onClose: () => void;
}

export function ConfirmArrivalModal({
  poId,
  poNumber,
  items,
  onConfirmSuccess,
  onClose,
}: ConfirmArrivalModalProps) {
  const { session } = useAuthSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receivedQuantities, setReceivedQuantities] = useState<{ [key: string]: number }>(
    items.reduce((acc, item) => ({ ...acc, [item.id]: 0 }), {})
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
      const itemsToUpdate = items.map((item) => ({
        po_item_id: item.id,
        qty_received: receivedQuantities[item.id] || 0,
      })).filter(item => item.qty_received > 0); // Only send items with positive received quantity

      if (itemsToUpdate.length === 0) {
        showError("Please enter at least one received quantity.");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(
        `https://hhhzugqimtypijkdxxsm.supabase.co/functions/v1/confirm-po-arrival`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ po_id: poId, items_received: itemsToUpdate }),
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
    <DialogContent className="glassmorphism border border-electric-violet/30 text-foreground animate-in fade-in-50 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
      <DialogHeader>
        <DialogTitle className="text-neon-cyan">Confirm Arrival for PO: <span className="text-electric-violet">{poNumber}</span></DialogTitle>
        <DialogDescription className="text-gray-400">
          Enter the quantity received for each item.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={`qty-${item.id}`} className="col-span-2 text-gray-300">
              {item.product_name} (Req: {item.qty_request}, Rec: {item.qty_received})
            </Label>
            <Input
              id={`qty-${item.id}`}
              type="number"
              value={receivedQuantities[item.id]}
              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
              min="0"
              max={item.qty_request - item.qty_received}
              className="col-span-2 glassmorphism border border-gray-700 text-gray-300"
              disabled={item.qty_request === item.qty_received}
            />
            {item.qty_request === item.qty_received && (
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
    </DialogContent>
  );
}