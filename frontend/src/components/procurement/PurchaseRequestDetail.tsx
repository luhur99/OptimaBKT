import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Package, DollarSign, User, Building, FileText, Clock, Tag, Info, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { showSuccess, showError } from "@/utils/toast";
import { cn } from '@/lib/utils';
import { PurchaseRequest } from './purchase-request-columns';
import { PurchaseRequestActionDialog } from './PurchaseRequestActionDialog'; // New dialog for actions

interface PurchaseRequestDetailProps {
  request: PurchaseRequest;
  canManage: boolean;
  onUpdate: () => void;
  onClose: () => void;
}

const PurchaseRequestDetail: React.FC<PurchaseRequestDetailProps> = ({ request: initialRequest, canManage, onUpdate, onClose }) => {
  const [request, setRequest] = useState<PurchaseRequest>(initialRequest);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [currentAction, setCurrentAction] = useState<'approved' | 'rejected' | null>(null); // Now 'approved' also uses the dialog
  const [items, setItems] = useState<any[]>([]);

  const fetchRequestDetails = useCallback(async () => {
    setIsLoadingDetails(true);
    try {
      // Fetch PR details
      const { data: updatedRequest, error: requestError } = await supabase
        .from('purchase_requests')
        .select(`*, profiles!user_id (full_name), suppliers (name), po_items (product_id, qty_request, harga_beli_satuan, subtotal, suggested_selling_price, satuan, item_name, item_code)`)
        .eq('id', initialRequest.id)
        .single();

      if (requestError) throw new Error(requestError.message);

      setRequest({
        ...updatedRequest,
        requested_by_name: updatedRequest.profiles?.full_name || "N/A",
        supplier_name: updatedRequest.suppliers?.name || "N/A",
        status: updatedRequest.status as PurchaseRequest['status'],
      });
      setItems(updatedRequest.po_items || []);
    } catch (error: any) {
      console.error("Error fetching purchase request details:", error.message);
      showError("Failed to load purchase request details: " + error.message);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [initialRequest.id]);

  useEffect(() => {
    fetchRequestDetails();
  }, [fetchRequestDetails]);

  const handleActionSubmit = async (actionData: {
    status: PurchaseRequest['status'];
    notes?: string;
  }) => {
    if (!request) return;

    setIsLoadingDetails(true);
    const { status: newStatus, notes } = actionData;

    try {
      const { error: updateError } = await supabase
        .from('purchase_requests')
        .update({ status: newStatus, notes: notes })
        .eq('id', request.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      showSuccess(`Purchase Request status updated to ${newStatus.replace(/_/g, ' ').toUpperCase()}.`);
      onUpdate();
      fetchRequestDetails();
    } catch (error: any) {
      console.error('Error updating purchase request status:', error.message);
      showError(`Failed to update purchase request status: ${error.message}`);
    } finally {
      setIsLoadingDetails(false);
      setCurrentAction(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/30';
      case 'approved': return 'bg-green-600/20 text-green-300 border border-green-500/30';
      case 'rejected': return 'bg-red-600/20 text-red-300 border border-red-500/30';
      case 'waiting for received': return 'bg-blue-600/20 text-blue-300 border border-blue-500/30';
      case 'closed': return 'bg-purple-600/20 text-purple-300 border border-purple-500/30';
      default: return 'bg-gray-700/20 text-gray-400 border border-gray-600/30';
    }
  };

  const isPending = request.status === 'pending';
  // const isApproved = request.status === 'approved'; // No longer needed for button logic
  // const isFinalStatus = request.status === 'rejected' || request.status === 'closed'; // No longer needed for button logic

  if (isLoadingDetails) {
    return (
      <Card className="glassmorphism border border-electric-violet/30 h-full flex flex-col animate-pulse">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl text-neon-cyan">Loading PR Details...</CardTitle>
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
      <CardHeader className="border-b border-gray-700 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl text-neon-cyan flex items-center">
            <Tag className="mr-2 h-5 w-5" /> PR Details: <span className="text-electric-violet ml-2">{request.pr_number}</span>
          </CardTitle>
          <Button variant="ghost" onClick={onClose} className="text-neon-cyan hover:text-neon-cyan/80">
            <ArrowLeft className="mr-2 h-4 w-4" /> Close Details
          </Button>
        </div>
        <p className="text-sm text-gray-400 mt-1">Requested By: {request.requested_by_name}</p>
      </CardHeader>
      <CardContent className="p-5 flex-1 overflow-y-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-4">
          <h1 className="text-2xl font-bold text-neon-cyan">Purchase Request Information</h1>
          <div className="flex flex-wrap gap-2">
            {isPending && canManage && (
              <>
                <Button
                  className="bg-green-600 text-white hover:bg-green-700 transition-all duration-300 text-sm py-2 px-3"
                  onClick={() => setCurrentAction('approved')} // Now opens dialog for approval
                  disabled={isLoadingDetails}
                >
                  {isLoadingDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />} Approve
                </Button>
                <Button
                  className="bg-red-600 text-white hover:bg-red-700 transition-all duration-300 text-sm py-2 px-3"
                  onClick={() => setCurrentAction('rejected')} // Still uses dialog for rejection
                  disabled={isLoadingDetails}
                >
                  {isLoadingDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />} Reject
                </Button>
              </>
            )}
            <Dialog open={!!currentAction} onOpenChange={(open) => !open && setCurrentAction(null)}>
              {currentAction && (
                <PurchaseRequestActionDialog
                  isOpen={true}
                  onClose={() => setCurrentAction(null)}
                  onSubmit={handleActionSubmit}
                  request={request}
                  actionType={currentAction}
                />
              )}
            </Dialog>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center bg-gray-900/40 p-3 rounded-xl border border-gray-800/50">
            <h2 className="text-lg font-semibold text-neon-cyan">Request Items</h2>
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-tighter",
              request.ppn
                ? "bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan"
                : "bg-gray-700/20 border-gray-600/30 text-gray-400"
            )}>
              PPN 11%:&nbsp;
              <span className={request.ppn ? "text-neon-cyan" : "text-gray-500"}>
                {request.ppn ? "Aktif" : "Tidak"}
              </span>
            </div>
          </div>
          <div className="relative w-full overflow-auto mb-4">
            <table className="w-full caption-bottom text-sm text-gray-300">
              <thead className="glassmorphism border-b border-gray-700">
                <tr>
                  <th className="h-12 px-4 text-left font-medium text-neon-cyan">Product</th>
                  <th className="h-12 px-4 text-left font-medium text-neon-cyan">Qty</th>
                  <th className="h-12 px-4 text-left font-medium text-neon-cyan">Unit Price</th>
                  <th className="h-12 px-4 text-left font-medium text-neon-cyan">Suggested Price</th>
                  <th className="h-12 px-4 text-left font-medium text-neon-cyan">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-800">
                    <td className="p-2">{item.item_name} ({item.item_code})</td>
                    <td className="p-2">{item.qty_request}</td>
                    <td className="p-2">Rp {item.harga_beli_satuan?.toLocaleString("id-ID")}</td>
                    <td className="p-2">Rp {item.suggested_selling_price?.toLocaleString("id-ID")}</td>
                    <td className="p-2">Rp {item.subtotal?.toLocaleString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <div className="text-gray-300">Subtotal: Rp {items.reduce((sum, item) => sum + (item.subtotal || 0), 0).toLocaleString("id-ID")}</div>
            {request.ppn && (
              <div className="text-gray-300">PPN (11%): Rp {Math.round(items.reduce((sum, item) => sum + (item.subtotal || 0), 0) * 0.11).toLocaleString("id-ID")}</div>
            )}
            <div className="font-bold text-neon-cyan">Grand Total: Rp {(
              items.reduce((sum, item) => sum + (item.subtotal || 0), 0) +
              (request.ppn ? Math.round(items.reduce((sum, item) => sum + (item.subtotal || 0), 0) * 0.11) : 0)
            ).toLocaleString("id-ID")}</div>
          </div>
          <Separator className="bg-gray-700" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300">
            <div>
              <h2 className="text-lg font-semibold text-neon-cyan mb-3">Request Details</h2>
              <div className="space-y-2">
                <p className="flex items-center text-sm"><Tag className="mr-2 h-4 w-4 text-blue-400" /> PR Number: <span className="ml-2 font-medium">{request.pr_number}</span></p>
                <p className="flex items-center text-sm"><Building className="mr-2 h-4 w-4 text-orange-400" /> Target Warehouse: <span className="ml-2 font-medium">{request.target_warehouse_category}</span></p>
                <p className="flex items-center text-sm"><Clock className="mr-2 h-4 w-4 text-lime-400" /> Created At: <span className="ml-2 font-medium">{format(new Date(request.created_at), "PPP")}</span></p>
                <p className="flex items-center text-sm"><Info className="mr-2 h-4 w-4 text-lime-400" /> Status: <Badge className={getStatusColor(request.status)}>{request.status.replace(/_/g, ' ').toUpperCase()}</Badge></p>
                {request.notes && <p className="flex items-start text-sm"><FileText className="mr-2 h-4 w-4 text-red-400 mt-1" /> Notes: <span className="ml-2 font-medium">{request.notes}</span></p>}
              </div>
            </div>
            <Separator orientation="vertical" className="hidden md:block bg-gray-700" />
            <Separator orientation="horizontal" className="md:hidden bg-gray-700" />
            <div>
              <h2 className="text-lg font-semibold text-neon-cyan mb-3">Supplier Information</h2>
              <div className="space-y-2">
                <p className="flex items-center text-sm"><User className="mr-2 h-4 w-4 text-cyan-400" /> Supplier Name: <span className="ml-2 font-medium">{request.supplier_name}</span></p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PurchaseRequestDetail;
