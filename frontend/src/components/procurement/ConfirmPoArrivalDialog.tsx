import React, { useState, useEffect } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Loader2 } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/auth-session";
import { cn } from "@/lib/utils";

interface PoItem {
  id: string;
  product_id: string;
  product_name: string;
  qty_request: number;
  qty_received: number; // Already received quantity
  qty_return: number;
  qty_balance: number; // Added qty_balance
  harga_beli_satuan: number;
  subtotal: number;
}

interface PoItemForArrivalInput extends PoItem {
  current_input_qty: number; // Quantity to be received in this session
}

interface ConfirmPoArrivalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  poId: string;
  initialPoItems: PoItem[];
  onArrivalConfirmed: () => void;
}

export const ConfirmPoArrivalDialog: React.FC<ConfirmPoArrivalDialogProps> = ({
  isOpen,
  onClose,
  poId,
  initialPoItems,
  onArrivalConfirmed,
}) => {
  const { session } = useAuthSession();
  const [itemsForArrivalInput, setItemsForArrivalInput] = useState<PoItemForArrivalInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      console.log("ConfirmPoArrivalDialog: Initializing itemsForArrivalInput with initialPoItems:", initialPoItems); // Added log
      setItemsForArrivalInput(
        initialPoItems.map((item) => ({
          ...item,
          current_input_qty: 0,
        }))
      );
    }
  }, [isOpen, initialPoItems]);

  const handleInputChange = (itemId: string, value: number) => {
    setItemsForArrivalInput((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, current_input_qty: value }
          : item
      )
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const itemsToSubmit = itemsForArrivalInput
        .filter((item) => item.current_input_qty > 0)
        .map((item) => ({
          po_item_id: item.id,
          qty_received: item.current_input_qty,
        }));

      if (itemsToSubmit.length === 0) {
        showError("Please enter quantities for at least one item to receive.");
        setIsSubmitting(false);
        return;
      }

      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!baseUrl) {
        showError("Supabase URL is not configured.");
        setIsSubmitting(false);
        return;
      }

      const accessToken = session?.access_token;
      if (!accessToken) {
        showError("You must be signed in to confirm PO arrival.");
        setIsSubmitting(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(
        `${baseUrl}/functions/v1/confirm-po-arrival`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            po_id: poId,
            items_received: itemsToSubmit,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to confirm PO arrival.");
      }

      showSuccess("PO arrival confirmed successfully!");
      onArrivalConfirmed();
      onClose();
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[700px] glassmorphism border border-electric-violet/30 text-foreground animate-in fade-in-50 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
      <DialogHeader>
        <DialogTitle className="text-neon-cyan">Confirm Purchase Order Arrival</DialogTitle>
        <DialogDescription className="text-gray-400">
          Enter the quantities of items received for this Purchase Order.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <ScrollArea className="h-[300px] rounded-md border border-gray-700">
          <Table className="text-gray-300">
            <TableHeader className="glassmorphism border-b border-gray-700 sticky top-0 bg-deep-charcoal z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-neon-cyan">Product</TableHead>
                <TableHead className="text-neon-cyan">Requested</TableHead>
                <TableHead className="text-neon-cyan">Already Received</TableHead>
                <TableHead className="text-neon-cyan">Balance</TableHead> {/* New column header */}
                <TableHead className="text-neon-cyan">Qty to Receive</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsForArrivalInput.map((item) => (
                <TableRow key={item.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell>{item.qty_request}</TableCell>
                  <TableCell>{item.qty_received}</TableCell>
                  <TableCell className="font-bold text-electric-violet">{item.qty_balance}</TableCell> {/* Display qty_balance */}
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max={item.qty_balance} // Max input is the current balance
                      value={item.current_input_qty}
                      onChange={(e) => handleInputChange(item.id, parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-24 bg-midnight-blue border-gray-700 text-gray-200"
                      disabled={isSubmitting || item.qty_balance <= 0} // Disable if balance is 0 or less
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
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
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />} Confirm Arrival
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};
