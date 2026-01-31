import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
} from "@/components/ui/dialog";
import { PurchaseOrder } from "./PurchaseOrderTable";
import { cn } from "@/lib/utils";
import { Package, CheckCircle, XCircle, Clock, Truck, Loader2, Undo2 } from "lucide-react"; // Added Undo2 icon for returns
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { useAuthSession } from "@/hooks/use-auth-session";

interface PurchaseOrderDetailProps {
  po: PurchaseOrder;
  onUpdate: () => void;
  onClose: () => void;
}

type PoItem = {
  id: string;
  product_id: string;
  product_name: string;
  qty_request: number;
  qty_received: number;
  qty_return: number;
  harga_beli_satuan: number;
  subtotal: number;
};

// Type for items in the arrival/return input state
type PoItemForInput = PoItem & {
  current_input_qty: number; // Quantity to be received/returned in this session
};

const POStatusStepper: React.FC<{ currentStatus: PurchaseOrder['status'] }> = ({ currentStatus }) => {
  const statuses: Array<PurchaseOrder['status']> = [
    'WAITING_RECEIVED',
    'RECEIVED',
    'CLOSED',
  ];

  const getStatusIcon = (status: PurchaseOrder['status'], isActive: boolean) => {
    const baseClass = "h-5 w-5";
    const activeClass = "text-neon-cyan neon-glow";
    const inactiveClass = "text-gray-500";

    switch (status) {
      case 'WAITING_RECEIVED':
        return <Clock className={cn(baseClass, isActive ? activeClass : inactiveClass)} />;
      case 'RECEIVED':
        return <Truck className={cn(baseClass, isActive ? activeClass : inactiveClass)} />;
      case 'CLOSED':
        return <CheckCircle className={cn(baseClass, isActive ? activeClass : inactiveClass)} />;
      default:
        return <Package className={cn(baseClass, inactiveClass)} />;
    }
  };

  const getStatusColorClass = (status: PurchaseOrder['status'], isActive: boolean) => {
    return isActive ? "text-neon-cyan" : "text-gray-500";
  };

  return (
    <div className="flex items-center justify-between text-sm text-gray-400">
      {statuses.map((status, index) => {
        const isActive = statuses.indexOf(currentStatus) >= index;
        return (
          <React.Fragment key={status}>
            <div className={cn("flex flex-col items-center", index > 0 && "ml-2")}>
              <div className={cn("p-2 rounded-full border-2",
                isActive ? "border-neon-cyan bg-neon-cyan/20 neon-glow" : "border-gray-700 bg-gray-800"
              )}>
                {getStatusIcon(status, isActive)}
              </div>
              <span className={cn("mt-2 text-xs font-medium", getStatusColorClass(status, isActive))}>
                {status.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            {index < statuses.length - 1 && (
              <div className={cn("flex-1 h-0.5 mx-2",
                isActive ? "bg-neon-cyan neon-glow" : "bg-gray-700"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};


export const PurchaseOrderDetail: React.FC<PurchaseOrderDetailProps> = ({
  po,
  onUpdate,
  onClose,
}) => {
  const { profile, isLoading: isAuthLoading } = useAuthSession();
  const [poItems, setPoItems] = useState<PoItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false); // Unified loading state for actions
  const [itemsForInput, setItemsForInput] = useState<PoItemForInput[]>([]);
  const [inputMode, setInputMode] = useState<'none' | 'receive' | 'return'>('none'); // 'none', 'receive', 'return'

  const fetchPoItems = useCallback(async () => {
    setIsLoadingItems(true);
    const { data, error } = await supabase
      .from("po_items")
      .select(`
        id,
        product_id,
        qty_request,
        qty_received,
        qty_return,
        harga_beli_satuan,
        subtotal,
        products (nama_barang)
      `)
      .eq("po_id", po.id);

    if (error) {
      console.error("Error fetching PO items:", error);
      showError("Failed to load PO items.");
    } else {
      const formattedItems: PoItem[] = data.map((item: any) => ({
        ...item,
        product_name: item.products?.nama_barang || "N/A",
      }));
      setPoItems(formattedItems);
      // Initialize itemsForInput when items are fetched
      setItemsForInput(formattedItems.map(item => ({
        ...item,
        current_input_qty: 0, // Default to 0 for new input
      })));
    }
    setIsLoadingItems(false);
  }, [po.id]);

  useEffect(() => {
    fetchPoItems();
  }, [fetchPoItems]);

  const handleInputChange = (itemId: string, value: number) => {
    setItemsForInput(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, current_input_qty: value }
          : item
      )
    );
  };

  const handleConfirmArrival = async () => {
    if (!profile || (profile.role !== "OPERASIONAL_DIV" && profile.role !== "SUPER_ADMIN")) {
      showError("You do not have permission to perform this action.");
      return;
    }

    setIsProcessingAction(true);
    try {
      const itemsToSubmit = itemsForInput
        .filter(item => item.current_input_qty > 0)
        .map(item => ({
          po_item_id: item.id,
          qty_received: item.current_input_qty,
        }));

      if (itemsToSubmit.length === 0) {
        showError("Please enter quantities for at least one item to receive.");
        setIsProcessingAction(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("User not authenticated.");
      }

      const response = await fetch(
        `https://hhhzugqimtypijkdxxsm.supabase.co/functions/v1/confirm-po-arrival`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            po_id: po.id,
            items_received: itemsToSubmit,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to confirm PO arrival.");
      }

      showSuccess("PO arrival confirmed successfully!");
      setInputMode('none'); // Exit input mode
      fetchPoItems(); // Re-fetch items to update received quantities
      onUpdate(); // Trigger parent to re-fetch POs and update status
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleReturnItems = async () => {
    if (!profile || (profile.role !== "OPERASIONAL_DIV" && profile.role !== "SUPER_ADMIN")) {
      showError("You do not have permission to perform this action.");
      return;
    }

    setIsProcessingAction(true);
    try {
      const itemsToSubmit = itemsForInput
        .filter(item => item.current_input_qty > 0)
        .map(item => ({
          po_item_id: item.id,
          qty_returned: item.current_input_qty,
        }));

      if (itemsToSubmit.length === 0) {
        showError("Please enter quantities for at least one item to return.");
        setIsProcessingAction(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("User not authenticated.");
      }

      const response = await fetch(
        `https://hhhzugqimtypijkdxxsm.supabase.co/functions/v1/return-po-items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            po_id: po.id,
            items_returned: itemsToSubmit,
            notes: "Items returned from PO", // Optional notes
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to return PO items.");
      }

      showSuccess("PO items returned successfully!");
      setInputMode('none'); // Exit input mode
      fetchPoItems(); // Re-fetch items to update returned quantities
      onUpdate(); // Trigger parent to re-fetch POs
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const canPerformActions = (profile?.role === "OPERASIONAL_DIV" || profile?.role === "SUPER_ADMIN");
  const canConfirmArrival = canPerformActions && (po.status === "WAITING_RECEIVED" || po.status === "RECEIVED");
  const canReturnItems = canPerformActions && (po.status === "RECEIVED" || po.status === "CLOSED"); // Can return from received or closed POs

  if (isLoadingItems || isAuthLoading) {
    return (
      <Card className="glassmorphism border border-electric-violet/30 h-full flex flex-col animate-pulse">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl text-neon-cyan">Loading PO Details...</CardTitle>
            <Button variant="ghost" disabled>Close</Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-6">
          <div className="h-8 w-3/4 bg-gray-800 rounded" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-6 w-full bg-gray-800 rounded" />
            <div className="h-6 w-full bg-gray-800 rounded" />
            <div className="h-6 w-full bg-gray-800 rounded" />
            <div className="h-6 w-full bg-gray-800 rounded" />
          </div>
          <Separator className="bg-gray-700" />
          <div className="h-24 w-full bg-gray-800 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glassmorphism border border-electric-violet/30 h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl text-neon-cyan">
            PO Details: <span className="text-electric-violet">{po.po_number}</span>
          </CardTitle>
          <Button variant="outline" onClick={onClose} className="glassmorphism border border-gray-700 text-gray-300 hover:bg-gray-800">
            Close
          </Button>
        </div>
        <p className="text-sm text-gray-400 mt-1">Supplier: {po.supplier_name}</p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-neon-cyan">Current Status</h3>
          <POStatusStepper currentStatus={po.status} />
          <Badge className="mt-2 bg-gray-700/20 text-gray-300 border border-gray-600/30">
            {po.status.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>

        <Separator className="bg-gray-700" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
          <div>
            <p className="text-sm font-medium text-gray-400">PO Number:</p>
            <p className="text-base">{po.po_number}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400">Requested By:</p>
            <p className="text-base">{po.requested_by_name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400">Supplier:</p>
            <p className="text-base">{po.supplier_name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400">Total Cost:</p>
            <p className="text-base">Rp {po.total_biaya.toLocaleString("id-ID")}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400">Created At:</p>
            <p className="text-base">{format(new Date(po.created_at), "PPP")}</p>
          </div>
        </div>

        <Separator className="bg-gray-700" />

        <h3 className="text-lg font-semibold text-neon-cyan">PO Items</h3>
        {poItems.length === 0 ? (
          <p className="text-gray-500">No items found for this Purchase Order.</p>
        ) : (
          <div className="rounded-md border border-gray-700">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="glassmorphism border-b border-gray-700">
                <tr>
                  <th className="p-2 text-neon-cyan">Product</th>
                  <th className="p-2 text-neon-cyan">Requested</th>
                  <th className="p-2 text-neon-cyan">Received</th>
                  <th className="p-2 text-neon-cyan">Returned</th>
                  {inputMode === 'receive' && <th className="p-2 text-neon-cyan">Qty to Receive</th>}
                  {inputMode === 'return' && <th className="p-2 text-neon-cyan">Qty to Return</th>}
                  <th className="p-2 text-neon-cyan">Unit Price</th>
                  <th className="p-2 text-neon-cyan">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {poItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-800 last:border-b-0 hover:bg-gray-800/50 transition-colors">
                    <td className="p-2">{item.product_name}</td>
                    <td className="p-2">{item.qty_request}</td>
                    <td className="p-2">{item.qty_received}</td>
                    <td className="p-2">{item.qty_return}</td>
                    {inputMode === 'receive' && (
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          max={item.qty_request - item.qty_received}
                          value={itemsForInput.find(i => i.id === item.id)?.current_input_qty || 0}
                          onChange={(e) => handleInputChange(item.id, parseInt(e.target.value) || 0)}
                          placeholder="0" {/* Added placeholder */}
                          className="w-24 bg-midnight-blue border-gray-700 text-gray-200"
                          disabled={isProcessingAction || item.qty_received >= item.qty_request}
                        />
                      </td>
                    )}
                    {inputMode === 'return' && (
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          max={item.qty_received - item.qty_return}
                          value={itemsForInput.find(i => i.id === item.id)?.current_input_qty || 0}
                          onChange={(e) => handleInputChange(item.id, parseInt(e.target.value) || 0)}
                          placeholder="0" {/* Added placeholder */}
                          className="w-24 bg-midnight-blue border-gray-700 text-gray-200"
                          disabled={isProcessingAction || item.qty_received <= item.qty_return}
                        />
                      </td>
                    )}
                    <td className="p-2">Rp {item.harga_beli_satuan.toLocaleString("id-ID")}</td>
                    <td className="p-2">Rp {item.subtotal.toLocaleString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end mt-6 space-x-2">
          {inputMode === 'none' && canConfirmArrival && (
            <Button
              onClick={() => setInputMode('receive')}
              className="bg-neon-cyan text-deep-charcoal hover:bg-neon-cyan/80 neon-glow-hover transition-all duration-300"
              disabled={isLoadingItems || isProcessingAction}
            >
              <Truck className="mr-2 h-4 w-4" /> Confirm Arrival
            </Button>
          )}
          {inputMode === 'none' && canReturnItems && (
            <Button
              onClick={() => setInputMode('return')}
              className="bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300"
              disabled={isLoadingItems || isProcessingAction}
            >
              <Undo2 className="mr-2 h-4 w-4" /> Return Items
            </Button>
          )}

          {inputMode === 'receive' && (
            <>
              <Button
                variant="outline"
                onClick={() => setInputMode('none')}
                className="mr-2 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
                disabled={isProcessingAction}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmArrival}
                className="bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300"
                disabled={isProcessingAction}
              >
                {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />} Save Received Quantities
              </Button>
            </>
          )}

          {inputMode === 'return' && (
            <>
              <Button
                variant="outline"
                onClick={() => setInputMode('none')}
                className="mr-2 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
                disabled={isProcessingAction}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReturnItems}
                className="bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300"
                disabled={isProcessingAction}
              >
                {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Undo2 className="mr-2 h-4 w-4" />} Save Returned Quantities
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};