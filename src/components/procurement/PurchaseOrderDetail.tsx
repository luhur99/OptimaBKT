import React from "react";
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
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmArrivalModal, PoItemForArrival } from "./ConfirmArrivalModal";
import { PurchaseOrder } from "./PurchaseOrderTable";
import { cn } from "@/lib/utils";
import { Package, CheckCircle, XCircle, Clock, Truck } from "lucide-react";
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
  product_name: string; // From join
  qty_request: number;
  qty_received: number;
  qty_return: number;
  harga_beli_satuan: number;
  subtotal: number;
};

const POStatusStepper: React.FC<{ currentStatus: PurchaseOrder['status'] }> = ({ currentStatus }) => {
  const statuses: Array<PurchaseOrder['status']> = [
    'PR_PENDING', // This status is for the PR, not PO. PO starts at WAITING_RECEIVED.
    'WAITING_RECEIVED',
    'RECEIVED',
    'CLOSED',
  ];

  // Adjust statuses to start from where a PO would typically be
  const relevantStatuses = statuses.slice(1); // Start from WAITING_RECEIVED

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
      {relevantStatuses.map((status, index) => {
        const isActive = relevantStatuses.indexOf(currentStatus) >= index;
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
            {index < relevantStatuses.length - 1 && (
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
  const { profile } = useAuthSession();
  const [poItems, setPoItems] = React.useState<PoItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = React.useState(true);
  const [isConfirmArrivalDialogOpen, setIsConfirmArrivalDialogOpen] = React.useState(false);

  const fetchPoItems = React.useCallback(async () => {
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
    }
    setIsLoadingItems(false);
  }, [po.id]);

  React.useEffect(() => {
    fetchPoItems();
  }, [fetchPoItems]);

  const handleConfirmArrivalSuccess = () => {
    fetchPoItems(); // Re-fetch items to update received quantities
    onUpdate(); // Trigger parent to re-fetch POs and update status
  };

  const canConfirmArrival = (profile?.role === "OPERASIONAL_DIV" || profile?.role === "SUPER_ADMIN") &&
                            (po.status === "WAITING_RECEIVED" || po.status === "RECEIVED");

  const itemsForArrivalModal: PoItemForArrival[] = poItems.map(item => ({
    id: item.id,
    product_name: item.product_name,
    qty_request: item.qty_request,
    qty_received: item.qty_received,
    current_input_qty: 0, // Initial input for the modal
  }));

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
        {isLoadingItems ? (
          <div className="space-y-2">
            <div className="h-8 w-full bg-gray-800 rounded" />
            <div className="h-8 w-full bg-gray-800 rounded" />
          </div>
        ) : poItems.length === 0 ? (
          <p className="text-gray-500">No items found for this Purchase Order.</p>
        ) : (
          <div className="rounded-md border border-gray-700">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="glassmorphism border-b border-gray-700">
                <tr>
                  <th className="p-2 text-neon-cyan">Product</th>
                  <th className="p-2 text-neon-cyan">Requested</th>
                  <th className="p-2 text-neon-cyan">Received</th>
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
                    <td className="p-2">Rp {item.harga_beli_satuan.toLocaleString("id-ID")}</td>
                    <td className="p-2">Rp {item.subtotal.toLocaleString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end mt-6">
          {canConfirmArrival && (
            <Dialog open={isConfirmArrivalDialogOpen} onOpenChange={setIsConfirmArrivalDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-neon-cyan text-deep-charcoal hover:bg-neon-cyan/80 neon-glow-hover transition-all duration-300">
                  Confirm Arrival
                </Button>
              </DialogTrigger>
              <ConfirmArrivalModal
                poId={po.id}
                poNumber={po.po_number}
                items={itemsForArrivalModal}
                onConfirmSuccess={handleConfirmArrivalSuccess}
                onClose={() => setIsConfirmArrivalDialogOpen(false)}
              />
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
};