import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, DollarSign, User, Calendar, FileText, Building, Clock, Loader2, CheckCircle, XCircle, Info, Truck, Tag } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { showSuccess, showError } from "@/utils/toast";
import { Invoice, InvoiceDocumentStatus } from './billing-list-columns';
import { BillingListActionDialog } from './BillingListActionDialog';
import { useProfile } from "@/hooks/use-profile"; // Import useProfile

interface InvoiceItem {
  id: string;
  item_name: string;
  item_code?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  unit_type?: string;
  invoice_number?: string; // Added invoice_number
}

interface BillingListDetailProps {
  invoice: Invoice;
  onUpdate: () => void;
  onClose: () => void;
}

const BillingListDetail: React.FC<BillingListDetailProps> = ({ invoice: initialInvoice, onUpdate, onClose }) => {
  const { data: profile, isLoading: isProfileLoading } = useProfile(); // Use useProfile
  const [invoice, setInvoice] = useState<Invoice>(initialInvoice);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [srNumber, setSrNumber] = useState<string | null>(null); // New state for SR Number
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [currentAction, setCurrentAction] = useState<'paid' | 'overdue' | null>(null);

  const fetchInvoiceDetails = useCallback(async () => {
    console.log(`BillingListDetail: fetchInvoiceDetails called for invoice ID: ${initialInvoice.id}`);
    setIsLoadingDetails(true);
    try {
      const { data: updatedInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          customer_name,
          company_name,
          total_amount,
          payment_status,
          invoice_status,
          user_id,
          do_number,
          notes,
          document_url,
          stock_deducted
        `)
        .eq('id', initialInvoice.id)
        .single();

      if (invoiceError) throw new Error(invoiceError.message);
      setInvoice({
        ...updatedInvoice,
        user_full_name: updatedInvoice.profiles?.full_name || "System", // Manually join
        payment_status: updatedInvoice.payment_status as Invoice['payment_status'],
        invoice_status: updatedInvoice.invoice_status as InvoiceDocumentStatus, // Cast to new enum type
      });

      // Fetch SR Number from scheduling_requests table
      const { data: srData, error: srError } = await supabase
        .from('scheduling_requests')
        .select('sr_number')
        .eq('invoice_id', initialInvoice.id)
        .single();

      if (srError && srError.code !== 'PGRST116') { // PGRST116 means "no rows found"
        console.warn("Could not fetch associated scheduling request SR number:", srError.message);
        setSrNumber(null);
      } else {
        setSrNumber(srData?.sr_number || null);
      }

      console.log(`BillingListDetail: Fetching invoice_items for invoice_id: ${initialInvoice.id}`); // New log
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', initialInvoice.id);

      if (itemsError) {
        console.warn("Could not fetch associated invoice items:", itemsError.message);
        setInvoiceItems([]);
      } else {
        console.log("BillingListDetail: Fetched itemsData from Supabase:", itemsData); // New log
        setInvoiceItems(itemsData || []);
        console.log("BillingListDetail: Invoice items state after set:", itemsData || []); // New log
      }

    } catch (error: any) {
      console.error("Error fetching invoice details:", error.message);
      showError("Failed to load invoice details: " + error.message);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [initialInvoice.id]);

  useEffect(() => {
    fetchInvoiceDetails();
  }, [fetchInvoiceDetails]);

  const handleActionSubmit = async (actionData: {
    payment_status: Invoice['payment_status'];
    notes?: string;
  }) => {
    if (!invoice) return;

    setIsLoadingDetails(true);
    const { payment_status: newPaymentStatus, notes } = actionData;

    try {
      const updatePayload: { payment_status: Invoice['payment_status']; notes?: string; invoice_status?: InvoiceDocumentStatus } = {
        payment_status: newPaymentStatus,
        notes: notes,
      };

      // If payment status becomes 'paid', also update invoice_status to 'PAID'
      if (newPaymentStatus === 'paid') {
        updatePayload.invoice_status = 'PAID';
      }

      const { error: updateError } = await supabase
        .from('invoices')
        .update(updatePayload)
        .eq('id', invoice.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // If the invoice is marked as 'paid', call the deduct-sales-stock edge function
      if (newPaymentStatus === 'paid' && !invoice.stock_deducted) {
        const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
        if (!accessToken) {
          throw new Error("User not authenticated for stock deduction.");
        }

        const deductStockResponse = await fetch(
          `https://hhhzugqimtypijkdxxsm.supabase.co/functions/v1/deduct-sales-stock`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ invoice_id: invoice.id }),
          }
        );

        const deductStockData = await deductStockResponse.json();

        if (!deductStockResponse.ok) {
          // Specific error message for stock insufficiency
          if (deductStockData.error && deductStockData.error.includes("Insufficient stock")) {
            throw new Error("Stok Gudang Siap Jual Tidak Mencukupi!");
          }
          throw new Error(deductStockData.error || "Failed to deduct stock for invoice.");
        }
        showSuccess("Stock deducted successfully!");
      }


      showSuccess(`Invoice payment status updated to ${newPaymentStatus.replace(/_/g, ' ').toUpperCase()}.`);
      onUpdate();
      fetchInvoiceDetails();
    } catch (error: any) {
      console.error('Error updating invoice payment status:', error.message);
      showError(`Failed to update invoice payment status: ${error.message}`);
    } finally {
      setIsLoadingDetails(false);
      setCurrentAction(null);
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/30';
      case 'paid': return 'bg-green-600/20 text-green-300 border border-green-500/30';
      case 'overdue': return 'bg-red-600/20 text-red-300 border border-red-500/30';
      default: return 'bg-gray-700/20 text-gray-400 border border-gray-600/30';
    }
  };

  const getInvoiceDocumentStatusColor = (status: InvoiceDocumentStatus) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-600/20 text-gray-300 border border-gray-500/30';
      case 'PENDING': return 'bg-blue-600/20 text-blue-300 border border-blue-500/30';
      case 'PAID': return 'bg-green-600/20 text-green-300 border border-green-500/30';
      case 'CANCELLED': return 'bg-red-600/20 text-red-300 border border-red-500/30';
      default: return 'bg-gray-700/20 text-gray-400 border border-gray-600/30';
    }
  };

  const isPendingPayment = invoice.payment_status === 'pending';
  const isInvoicePending = invoice.invoice_status === 'PENDING'; // Check if invoice is in PENDING document status

  // Check if the current user has permission to perform actions
  const canPerformAction = profile?.role === "SUPER_ADMIN" || profile?.role === "ACCOUNTING";

  if (isLoadingDetails || isProfileLoading) { // Added isProfileLoading
    return (
      <Card className="glassmorphism border border-electric-violet/30 h-full flex flex-col animate-pulse">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl text-neon-cyan">Loading Invoice Details...</CardTitle>
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
            <FileText className="mr-2 h-5 w-5" /> Invoice Details: <span className="text-electric-violet ml-2">{invoice.invoice_number}</span>
          </CardTitle>
          <Button variant="ghost" onClick={onClose} className="text-neon-cyan hover:text-neon-cyan/80">
            <ArrowLeft className="mr-2 h-4 w-4" /> Close Details
          </Button>
        </div>
        <div className="text-sm text-gray-400 mt-1">Created By: {invoice.user_full_name}</div>
      </CardHeader>
      <CardContent className="p-5 flex-1 overflow-y-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-4">
          <h1 className="text-2xl font-bold text-neon-cyan">Invoice Information</h1>
          <div className="flex flex-wrap gap-2">
            {canPerformAction && isPendingPayment && isInvoicePending && ( // Only show buttons if payment is pending AND invoice is in PENDING document status AND user has permission
              <>
                <Button
                  className="bg-green-600 text-white hover:bg-green-700 transition-all duration-300 text-sm py-2 px-3"
                  onClick={() => setCurrentAction('paid')}
                  disabled={isLoadingDetails}
                >
                  {isLoadingDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />} Mark Paid
                </Button>
                <Button
                  className="bg-red-600 text-white hover:bg-red-700 transition-all duration-300 text-sm py-2 px-3"
                  onClick={() => setCurrentAction('overdue')}
                  disabled={isLoadingDetails}
                >
                  {isLoadingDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />} Mark Overdue
                </Button>
              </>
            )}
            <Dialog open={!!currentAction} onOpenChange={(open) => !open && setCurrentAction(null)}>
              {currentAction && (
                <BillingListActionDialog
                  isOpen={!!currentAction}
                  onClose={() => setCurrentAction(null)}
                  onSubmit={handleActionSubmit}
                  invoice={invoice}
                  actionType={currentAction}
                />
              )}
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300">
          <div>
            <h2 className="text-lg font-semibold text-neon-cyan mb-3">Invoice Details</h2>
            <div className="space-y-2">
              <div className="flex items-center text-sm"><FileText className="mr-2 h-4 w-4 text-blue-400" /> Invoice Number: <span className="ml-2 font-medium">{invoice.invoice_number}</span></div>
              {srNumber && <div className="flex items-center text-sm"><Tag className="mr-2 h-4 w-4 text-purple-400" /> SR Number: <span className="ml-2 font-medium">{srNumber}</span></div>}
              {invoice.do_number && <div className="flex items-center text-sm"><Truck className="mr-2 h-4 w-4 text-teal-400" /> DO Number: <span className="ml-2 font-medium">{invoice.do_number}</span></div>}
              <div className="flex items-center text-sm"><Calendar className="mr-2 h-4 w-4 text-purple-400" /> Invoice Date: <span className="ml-2 font-medium">{format(new Date(invoice.invoice_date), "PPP")}</span></div>
              {invoice.due_date && <div className="flex items-center text-sm"><Clock className="mr-2 h-4 w-4 text-teal-400" /> Due Date: <span className="ml-2 font-medium">{format(new Date(invoice.due_date), "PPP")}</span></div>}
              <div className="flex items-center text-sm"><User className="mr-2 h-4 w-4 text-yellow-400" /> Customer Name: <span className="ml-2 font-medium">{invoice.customer_name}</span></div>
              {invoice.company_name && <div className="flex items-center text-sm"><Building className="mr-2 h-4 w-4 text-indigo-400" /> Company Name: <span className="ml-2 font-medium">{invoice.company_name}</span></div>}
              <div className="flex items-center text-sm"><DollarSign className="mr-2 h-4 w-4 text-lime-400" /> Total Amount: <span className="ml-2 font-medium">Rp {invoice.total_amount.toLocaleString("id-ID")}</span></div>
              <div className="flex items-center text-sm"><Info className="mr-2 h-4 w-4 text-lime-400" /> Payment Status: <Badge className={getPaymentStatusColor(invoice.payment_status)}>{invoice.payment_status.replace(/_/g, ' ').toUpperCase()}</Badge></div>
              <div className="flex items-center text-sm"><Info className="mr-2 h-4 w-4 text-lime-400" /> Invoice Status: <Badge className={getInvoiceDocumentStatusColor(invoice.invoice_status)}>{invoice.invoice_status.replace(/_/g, ' ').toUpperCase()}</Badge></div>
              {invoice.notes && <div className="flex items-start text-sm"><FileText className="mr-2 h-4 w-4 text-orange-400 mt-1" /> Notes: <span className="ml-2 font-medium">{invoice.notes}</span></div>}
              {invoice.document_url && (
                <div className="flex items-center text-sm">
                  <FileText className="mr-2 h-4 w-4 text-emerald-400" /> Document:
                  <a href={invoice.document_url} target="_blank" rel="noopener noreferrer" className="ml-2 font-medium text-blue-400 hover:underline">
                    View Document
                  </a>
                </div>
              )}
            </div>
          </div>

          <Separator orientation="vertical" className="hidden md:block bg-gray-700" />
          <Separator orientation="horizontal" className="md:hidden bg-gray-700" />

          <div>
            <h2 className="text-lg font-semibold text-neon-cyan mb-3">Invoice Items</h2>
            {invoiceItems.length === 0 ? (
              <p className="text-gray-500">No items found for this invoice.</p>
            ) : (
              <div className="rounded-md border border-gray-700">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="glassmorphism border-b border-gray-700">
                    <tr>
                      <th className="p-2 text-neon-cyan">Item Name</th>
                      <th className="p-2 text-neon-cyan">Qty</th>
                      <th className="p-2 text-neon-cyan">Unit Price</th>
                      <th className="p-2 text-neon-cyan">Subtotal</th>
                      <th className="p-2 text-neon-cyan">Invoice Number</th> {/* New column header */}
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItems.map((item) => (
                      <tr key={item.id} className="border-b border-gray-800 last:border-b-0 hover:bg-gray-800/50 transition-colors">
                        <td className="p-2">{item.item_name} ({item.item_code})</td>
                        <td className="p-2">{item.quantity} {item.unit_type}</td>
                        <td className="p-2">Rp {item.unit_price.toLocaleString("id-ID")}</td>
                        <td className="p-2">Rp {item.subtotal.toLocaleString("id-ID")}</td>
                        <td className="p-2">{item.invoice_number || 'N/A'}</td> {/* Display invoice_number */}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BillingListDetail;