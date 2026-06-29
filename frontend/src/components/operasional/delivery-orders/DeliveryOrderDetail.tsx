import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Truck, CheckCircle, XCircle, Clock, FileText, User, MapPin, Phone, Building, Tag, Info, Loader2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { showSuccess, showError } from "@/utils/toast";
import { DeliveryOrderActionDialog } from './DeliveryOrderActionDialog';
import { DeliveryOrder } from './delivery-order-columns';


interface SchedulingRequestDetails {
  sr_number: string;
  type: string;
  full_address: string;
  landmark?: string;
  requested_date: string;
  requested_time?: string;
  contact_person: string;
  phone_number?: string;
  customer_name: string;
  company_name?: string;
  product_category?: string;
  vehicle_details?: string;
  technician_name?: string;
  external_technician_name?: string;
  technician_type?: 'INTERNAL' | 'EXTERNAL';
  document_url?: string;
}

interface DeliveryOrderDetailProps {
  order: DeliveryOrder;
  onUpdate: () => void;
  onClose: () => void;
}

const DeliveryOrderDetail: React.FC<DeliveryOrderDetailProps> = ({ order: initialOrder, onUpdate, onClose }) => {
  const [order, setOrder] = useState<DeliveryOrder>(initialOrder);
  const [schedulingRequest, setSchedulingRequest] = useState<SchedulingRequestDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [currentAction, setCurrentAction] = useState<'in progress' | 'completed' | 'cancelled' | null>(null);

  const fetchOrderDetails = useCallback(async () => {
    setIsLoadingDetails(true);
    try {
      const { data: updatedOrder, error: orderError } = await supabase
        .from('delivery_orders')
        .select(`
          *,
          profiles (full_name)
        `)
        .eq('id', initialOrder.id)
        .single();

      if (orderError) throw new Error(orderError.message);
      setOrder({
        ...updatedOrder,
        user_full_name: updatedOrder.profiles?.full_name || "System",
        status: updatedOrder.status as DeliveryOrder['status'],
      });

      if (updatedOrder.request_id) {
        let requestIdToUse: string | null = updatedOrder.request_id;

        // Check if it's the string "null" and treat it as actual null
        if (typeof updatedOrder.request_id === 'string' && updatedOrder.request_id.toLowerCase() === 'null') {
          requestIdToUse = null;
        }

        if (requestIdToUse) { // Only proceed if it's a valid (non-null string) UUID
          const { data: srData, error: srError } = await supabase
            .from('scheduling_requests')
            .select(`
              sr_number,
              type,
              full_address,
              landmark,
              requested_date,
              requested_time,
              contact_person,
              phone_number,
              customer_name,
              company_name,
              product_category,
              vehicle_details,
              technician_name,
              external_technician_name,
              technician_type,
              document_url
            `)
            .eq('id', requestIdToUse) // Use the cleaned value
            .single();

          if (srError) {
            console.warn("Could not fetch associated scheduling request:", srError.message);
            setSchedulingRequest(null);
          } else {
            setSchedulingRequest(srData);
          }
        } else {
          setSchedulingRequest(null);
        }
      } else {
        setSchedulingRequest(null);
      }
    } catch (error: any) {
      console.error("Error fetching delivery order details:", error.message);
      showError("Failed to load delivery order details: " + error.message);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [initialOrder.id]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const handleActionSubmit = async (actionData: {
    status: DeliveryOrder['status'];
    notes?: string;
  }) => {
    if (!order) return;

    setIsLoadingDetails(true);
    const { status: newStatus, notes } = actionData;

    try {
      const { error: updateError } = await supabase
        .from('delivery_orders')
        .update({ status: newStatus, notes: notes })
        .eq('id', order.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // If status is completed, trigger stock deduction for the associated invoice
      if (newStatus === 'completed') {
        // Fetch associated scheduling_request to get invoice_id
        const { data: schedulingRequest, error: srError } = await supabase
          .from('scheduling_requests')
          .select('invoice_id')
          .eq('id', order.request_id)
          .single();

        if (srError) {
          showError('Failed to fetch associated invoice for stock deduction.');
        } else if (schedulingRequest?.invoice_id) {
          // Call the deduct-sales-stock edge function
          const baseUrl = import.meta.env.VITE_SUPABASE_URL;
          const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
          if (baseUrl && accessToken) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            const response = await fetch(
              `${baseUrl}/functions/v1/deduct-sales-stock`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ invoice_id: schedulingRequest.invoice_id }),
                signal: controller.signal,
              }
            );
            clearTimeout(timeoutId);
            const data = await response.json();
            if (!response.ok) {
              showError(data.error || 'Failed to deduct stock for invoice.');
            } else {
              showSuccess('Stock deducted successfully for invoice.');
            }
          } else {
            showError('Supabase URL or access token not configured for stock deduction.');
          }
        }
      }

      showSuccess(`Delivery Order status updated to ${newStatus.replace(/_/g, ' ').toUpperCase()}.`);
      onUpdate();
      fetchOrderDetails();
    } catch (error: any) {
      console.error('Error updating delivery order status:', error.message);
      showError(`Failed to update delivery order status: ${error.message}`);
    } finally {
      setIsLoadingDetails(false);
      setCurrentAction(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/30';
      case 'in progress': return 'bg-blue-600/20 text-blue-300 border border-blue-500/30';
      case 'completed': return 'bg-green-600/20 text-green-300 border border-green-500/30';
      case 'cancelled': return 'bg-red-600/20 text-red-300 border border-red-500/30';
      default: return 'bg-gray-700/20 text-gray-400 border border-gray-600/30';
    }
  };

  const isPending = order.status === 'pending';
  const isInProgress = order.status === 'in progress';
  const isFinalStatus = order.status === 'completed' || order.status === 'cancelled';

  if (isLoadingDetails) {
    return (
      <Card className="glassmorphism border border-electric-violet/30 h-full flex flex-col animate-pulse">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl text-neon-cyan">Loading DO Details...</CardTitle>
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
            <Truck className="mr-2 h-5 w-5" /> DO Details: <span className="text-electric-violet ml-2">{order.do_number}</span>
          </CardTitle>
          <Button variant="ghost" onClick={onClose} className="text-neon-cyan hover:text-neon-cyan/80">
            <ArrowLeft className="mr-2 h-4 w-4" /> Close Details
          </Button>
        </div>
        <p className="text-sm text-gray-400 mt-1">Created By: {order.user_full_name}</p>
      </CardHeader>
      <CardContent className="p-5 flex-1 overflow-y-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-4">
          <h1 className="text-2xl font-bold text-neon-cyan">Delivery Order Information</h1>
          <div className="flex flex-wrap gap-2">
            {isPending && (
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300 text-sm py-2 px-3"
                onClick={() => setCurrentAction('in progress')}
                disabled={isLoadingDetails}
              >
                {isLoadingDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />} Set In Progress
              </Button>
            )}
            {isInProgress && (
              <Button
                className="bg-green-600 text-white hover:bg-green-700 transition-all duration-300 text-sm py-2 px-3"
                onClick={() => setCurrentAction('completed')}
                disabled={isLoadingDetails}
              >
                {isLoadingDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />} Mark Completed
              </Button>
            )}
            {!isFinalStatus && (
              <Button
                className="bg-red-600 text-white hover:bg-red-700 transition-all duration-300 text-sm py-2 px-3"
                onClick={() => setCurrentAction('cancelled')}
                disabled={isLoadingDetails}
              >
                {isLoadingDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />} Cancel DO
              </Button>
            )}
            <Dialog open={!!currentAction} onOpenChange={(open) => !open && setCurrentAction(null)}>
              {currentAction && (
                <DeliveryOrderActionDialog
                  isOpen={!!currentAction}
                  onClose={() => setCurrentAction(null)}
                  onSubmit={handleActionSubmit}
                  order={order}
                  actionType={currentAction}
                />
              )}
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300">
          <div>
            <h2 className="text-lg font-semibold text-neon-cyan mb-3">Delivery Order Info</h2>
            <div className="space-y-2">
              <div className="flex items-center text-sm"><Tag className="mr-2 h-4 w-4 text-blue-400" /> DO Number: <span className="ml-2 font-medium">{order.do_number}</span></div>
              <div className="flex items-center text-sm"><User className="mr-2 h-4 w-4 text-yellow-400" /> Created By: <span className="ml-2 font-medium">{order.user_full_name}</span></div>
              <div className="flex items-center text-sm"><Clock className="mr-2 h-4 w-4 text-purple-400" /> Delivery Date: <span className="ml-2 font-medium">{format(new Date(order.delivery_date), "PPP")}</span></div>
              <div className="flex items-center text-sm"><Clock className="mr-2 h-4 w-4 text-teal-400" /> Delivery Time: <span className="ml-2 font-medium">{order.delivery_time || 'N/A'}</span></div>
              <div className="flex items-center text-sm"><Info className="mr-2 h-4 w-4 text-lime-400" /> Status: <Badge className={getStatusColor(order.status)}>{order.status.replace(/_/g, ' ').toUpperCase()}</Badge></div>
              {order.notes && <div className="flex items-start text-sm"><FileText className="mr-2 h-4 w-4 text-orange-400 mt-1" /> Notes: <span className="ml-2 font-medium">{order.notes}</span></div>}
            </div>
          </div>

          <Separator orientation="vertical" className="hidden md:block bg-gray-700" />
          <Separator orientation="horizontal" className="md:hidden bg-gray-700" />

          {schedulingRequest && (
            <div>
              <h2 className="text-lg font-semibold text-neon-cyan mb-3">Associated Scheduling Request</h2>
              <div className="space-y-2">
                <div className="flex items-center text-sm"><Tag className="mr-2 h-4 w-4 text-blue-400" /> SR Number: <span className="ml-2 font-medium">{schedulingRequest.sr_number}</span></div>
                <div className="flex items-center text-sm"><Info className="mr-2 h-4 w-4 text-blue-400" /> Type: <span className="ml-2 font-medium">{schedulingRequest.type}</span></div>
                <div className="flex items-center text-sm"><User className="mr-2 h-4 w-4 text-yellow-400" /> Customer: <span className="ml-2 font-medium">{schedulingRequest.customer_name}</span></div>
                {schedulingRequest.company_name && <div className="flex items-center text-sm"><Building className="mr-2 h-4 w-4 text-indigo-400" /> Company: <span className="ml-2 font-medium">{schedulingRequest.company_name}</span></div>}
                <div className="flex items-start text-sm"><MapPin className="mr-2 h-4 w-4 text-red-400 mt-1" /> Address: <span className="ml-2 font-medium">{schedulingRequest.full_address}</span></div>
                {schedulingRequest.landmark && <div className="flex items-start text-sm"><MapPin className="mr-2 h-4 w-4 text-red-400 mt-1" /> Landmark: <span className="ml-2 font-medium">{schedulingRequest.landmark}</span></div>}
                <div className="flex items-center text-sm"><Phone className="mr-2 h-4 w-4 text-green-400" /> Contact Phone: <span className="ml-2 font-medium">{schedulingRequest.phone_number || 'N/A'}</span></div>
                <div className="flex items-center text-sm"><User className="mr-2 h-4 w-4 text-cyan-400" /> Technician: <span className="ml-2 font-medium">{schedulingRequest.technician_name || 'N/A'} {schedulingRequest.technician_type === 'EXTERNAL' && '(External)'}</span></div>
                {schedulingRequest.product_category && <div className="flex items-center text-sm"><Tag className="mr-2 h-4 w-4 text-pink-400" /> Product Category: <span className="ml-2 font-medium">{schedulingRequest.product_category}</span></div>}
                {schedulingRequest.vehicle_details && <div className="flex items-center text-sm"><Truck className="mr-2 h-4 w-4 text-orange-400" /> Vehicle: <span className="ml-2 font-medium">{schedulingRequest.vehicle_details}</span></div>}
                {schedulingRequest.document_url && (
                  <div className="flex items-center text-sm">
                    <FileText className="mr-2 h-4 w-4 text-emerald-400" /> Document:
                    <a href={schedulingRequest.document_url} target="_blank" rel="noopener noreferrer" className="ml-2 font-medium text-blue-400 hover:underline">
                      View Document
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {order.items_json && (order.items_json as any[]).length > 0 && (
          <>
            <Separator className="bg-gray-700" />
            <h3 className="text-lg font-semibold text-neon-cyan">Delivery Items</h3>
            <div className="rounded-md border border-gray-700">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="glassmorphism border-b border-gray-700">
                  <tr>
                    <th className="p-2 text-neon-cyan">Item Name</th>
                    <th className="p-2 text-neon-cyan">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items_json as any[]).map((item, index) => (
                    <tr key={index} className="border-b border-gray-800 last:border-b-0 hover:bg-gray-800/50 transition-colors">
                      <td className="p-2">{item.name}</td>
                      <td className="p-2">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryOrderDetail;
