import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, DollarSign, User, Building, FileText, Clock, Tag, Info, Loader2, CheckCircle, XCircle, Link2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { showSuccess, showError } from "@/utils/toast";
import { UtilityRequest, UtilityRequestItem } from "./utility-request-columns";
import { UtilityRequestActionDialog } from "./UtilityRequestActionDialog";

interface UtilityRequestDetailProps {
  request: UtilityRequest;
  canManage: boolean;
  onUpdate: () => void;
  onClose: () => void;
}

const UtilityRequestDetail: React.FC<UtilityRequestDetailProps> = ({ request: initialRequest, canManage, onUpdate, onClose }) => {
  const [request, setRequest] = useState<UtilityRequest>(initialRequest);
  const [items, setItems] = useState<UtilityRequestItem[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [currentAction, setCurrentAction] = useState<"approved" | "rejected" | null>(null);

  const fetchRequestDetails = useCallback(async () => {
    setIsLoadingDetails(true);
    try {
      const [{ data: updatedRequest, error: requestError }, { data: itemsData, error: itemsError }] = await Promise.all([
        supabase
          .from("utility_requests")
          .select(`*, profiles!user_id (full_name)`)
          .eq("id", initialRequest.id)
          .single(),
        supabase
          .from("utility_request_items")
          .select("id, item_name, quantity, unit_price, total_price")
          .eq("ur_id", initialRequest.id)
          .order("created_at", { ascending: true }),
      ]);

      if (requestError) throw new Error(requestError.message);
      if (itemsError) throw new Error(itemsError.message);

      setRequest({
        ...updatedRequest,
        requested_by_name: updatedRequest.profiles?.full_name || "N/A",
        status: updatedRequest.status as UtilityRequest["status"],
      });
      setItems((itemsData || []) as UtilityRequestItem[]);
    } catch (error: any) {
      console.error("Error fetching utility request details:", error.message);
      showError("Failed to load utility request details: " + error.message);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [initialRequest.id]);

  useEffect(() => {
    fetchRequestDetails();
  }, [fetchRequestDetails]);

  const handleActionSubmit = async (actionData: {
    status: UtilityRequest["status"];
    notes?: string;
  }) => {
    setIsLoadingDetails(true);
    const { status: newStatus, notes } = actionData;

    try {
      const { error: updateError } = await supabase
        .from("utility_requests")
        .update({ status: newStatus, notes })
        .eq("id", request.id);

      if (updateError) throw new Error(updateError.message);

      showSuccess(`Utility Request status updated to ${newStatus.replace(/_/g, " ").toUpperCase()}.`);
      onUpdate();
      fetchRequestDetails();
    } catch (error: any) {
      showError(`Failed to update utility request status: ${error.message}`);
    } finally {
      setIsLoadingDetails(false);
      setCurrentAction(null);
    }
  };

  const getStatusColor = (status: UtilityRequest["status"]) => {
    switch (status) {
      case "pending":   return "bg-yellow-600/20 text-yellow-300 border border-yellow-500/30";
      case "approved":  return "bg-green-600/20 text-green-300 border border-green-500/30";
      case "rejected":  return "bg-red-600/20 text-red-300 border border-red-500/30";
      default:          return "bg-gray-700/20 text-gray-400 border border-gray-600/30";
    }
  };

  const isPending = request.status === "pending";

  if (isLoadingDetails) {
    return (
      <Card className="glassmorphism border border-electric-violet/30 h-full flex flex-col animate-pulse">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl text-neon-cyan">Loading UR Details...</CardTitle>
            <Button variant="ghost" disabled>Close</Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-6">
          <div className="h-8 w-3/4 bg-gray-800 rounded" />
          <div className="h-32 w-full bg-gray-800 rounded" />
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
            <Tag className="mr-2 h-5 w-5" /> UR Details: <span className="text-electric-violet ml-2">{request.ur_number}</span>
          </CardTitle>
          <Button variant="ghost" onClick={onClose} className="text-neon-cyan hover:text-neon-cyan/80">
            <ArrowLeft className="mr-2 h-4 w-4" /> Close Details
          </Button>
        </div>
        <p className="text-sm text-gray-400 mt-1">Requested By: {request.requested_by_name}</p>
      </CardHeader>

      <CardContent className="p-5 flex-1 overflow-y-auto space-y-6">
        {/* Header actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-neon-cyan">Utility Request Information</h1>
          <div className="flex flex-wrap gap-2">
            {isPending && canManage && (
              <>
                <Button
                  className="bg-green-600 text-white hover:bg-green-700 transition-all duration-300 text-sm py-2 px-3"
                  onClick={() => setCurrentAction("approved")}
                  disabled={isLoadingDetails}
                >
                  {isLoadingDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />} Approve
                </Button>
                <Button
                  className="bg-red-600 text-white hover:bg-red-700 transition-all duration-300 text-sm py-2 px-3"
                  onClick={() => setCurrentAction("rejected")}
                  disabled={isLoadingDetails}
                >
                  {isLoadingDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />} Reject
                </Button>
              </>
            )}
            <Dialog open={!!currentAction} onOpenChange={(open) => !open && setCurrentAction(null)}>
              {currentAction && (
                <UtilityRequestActionDialog
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

        {/* Request meta info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-neon-cyan mb-3">Request Info</h2>
            <p className="flex items-center text-sm"><Tag className="mr-2 h-4 w-4 text-blue-400" /> UR Number: <span className="ml-2 font-medium">{request.ur_number}</span></p>
            <p className="flex items-center text-sm"><User className="mr-2 h-4 w-4 text-cyan-400" /> Requested By: <span className="ml-2 font-medium">{request.requested_by_name}</span></p>
            <p className="flex items-center text-sm"><Clock className="mr-2 h-4 w-4 text-lime-400" /> Created At: <span className="ml-2 font-medium">{format(new Date(request.created_at), "PPP")}</span></p>
            <p className="flex items-center text-sm"><Info className="mr-2 h-4 w-4 text-lime-400" /> Status: <Badge className={`ml-2 ${getStatusColor(request.status)}`}>{request.status.replace(/_/g, " ").toUpperCase()}</Badge></p>
            <p className="flex items-center text-sm"><DollarSign className="mr-2 h-4 w-4 text-teal-400" /> Grand Total: <span className="ml-2 font-bold text-neon-cyan">Rp {request.total_price.toLocaleString("id-ID")}</span></p>
            {request.notes && (
              <p className="flex items-start text-sm"><FileText className="mr-2 h-4 w-4 text-red-400 mt-1" /> Notes: <span className="ml-2 font-medium">{request.notes}</span></p>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-neon-cyan mb-3">Supplier Info</h2>
            <p className="flex items-center text-sm"><Building className="mr-2 h-4 w-4 text-orange-400" /> Store Name: <span className="ml-2 font-medium">{request.supplier_name || "N/A"}</span></p>
            {request.supplier_url && (
              <p className="flex items-center text-sm">
                <Link2 className="mr-2 h-4 w-4 text-cyan-400" /> Link:{" "}
                {/^https?:\/\//i.test(request.supplier_url) ? (
                  <a
                    href={request.supplier_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 font-medium text-neon-cyan hover:underline truncate max-w-[200px]"
                  >
                    {request.supplier_url}
                  </a>
                ) : (
                  <span className="ml-2 font-medium">{request.supplier_url}</span>
                )}
              </p>
            )}
          </div>
        </div>

        <Separator className="bg-gray-700" />

        {/* Items table */}
        <div>
          <h2 className="text-lg font-semibold text-neon-cyan mb-3">Items ({items.length})</h2>
          {items.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No items found.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-gray-700">
              <table className="w-full text-sm text-gray-300">
                <thead className="bg-gray-800/60 text-xs text-gray-400 uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Unit Price</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} className="border-t border-gray-700/50 hover:bg-gray-800/30">
                      <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium">{item.item_name}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">Rp {item.unit_price.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-2 text-right font-semibold text-neon-cyan">Rp {item.total_price.toLocaleString("id-ID")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-600 bg-gray-800/40">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-gray-400 font-medium">Grand Total</td>
                    <td className="px-3 py-2 text-right font-bold text-neon-cyan">Rp {request.total_price.toLocaleString("id-ID")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UtilityRequestDetail;
