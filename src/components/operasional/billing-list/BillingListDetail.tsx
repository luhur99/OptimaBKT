import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, DollarSign, User, Calendar, FileText, Building, Clock, Loader2, CheckCircle, XCircle, Info, Truck, Tag, Receipt } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { format } from 'date-fns';
import { showSuccess, showError } from "@/utils/toast";
import { Invoice, InvoiceDocumentStatus } from './billing-list-columns';
import { BillingListActionDialog } from './BillingListActionDialog';

interface InvoiceItem {
  id: string;
  product_id?: string;
  item_name: string;
  item_code?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  unit_type?: string;
  invoice_number?: string; // Added invoice_number
}

type InvoiceItemDraft = {
  id?: string;
  product_id?: string;
  tempId: string;
  item_name: string;
  item_code?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  unit_type?: string;
  invoice_number?: string;
  isNew?: boolean;
};

type ProductWithInventory = {
  id: string;
  kode_barang: string;
  nama_barang: string;
  harga_jual: number;
  satuan?: string;
  product_type?: 'GOODS' | 'SERVICE';
  inventories: {
    warehouse_category: string;
    quantity: number;
  }[];
};

type PendingItemAction = {
  type: 'save' | 'delete';
  item: InvoiceItemDraft;
};

const EDITED_NOTE_TAG = 'Edited by user';

interface BillingListDetailProps {
  invoice: Invoice;
  onUpdate: () => void;
  onClose: () => void;
}

const BillingListDetail: React.FC<BillingListDetailProps> = ({ invoice: initialInvoice, onUpdate, onClose }) => {
  const [invoice, setInvoice] = useState<Invoice>(initialInvoice);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItemDraft[]>([]);
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [srNumber, setSrNumber] = useState<string | null>(null); // New state for SR Number
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [currentAction, setCurrentAction] = useState<'paid' | 'overdue' | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingItemAction | null>(null);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [itemForm, setItemForm] = useState<InvoiceItemDraft | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  const hasUserEditedInvoice = useMemo(() => (invoice.notes || '').includes(EDITED_NOTE_TAG), [invoice.notes]);

  const buildEditedNote = (existing?: string) => {
    if (existing?.includes(EDITED_NOTE_TAG)) {
      return existing;
    }
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm');
    const note = `${EDITED_NOTE_TAG} on ${timestamp}`;
    return existing ? `${existing}\n${note}` : note;
  };

  const calculateItemSubtotal = (quantity: number, unitPrice: number) => {
    const safeQuantity = Number.isFinite(quantity) ? Math.max(0, quantity) : 0;
    const safeUnitPrice = Number.isFinite(unitPrice) ? Math.max(0, unitPrice) : 0;
    return safeQuantity * safeUnitPrice;
  };

  const calculateTotals = (items: InvoiceItemDraft[], withTax?: boolean) => {
    const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const tax = withTax ? Math.round(subtotal * 0.11) : 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const persistInvoiceTotals = async (items: InvoiceItemDraft[]) => {
    const { subtotal, tax, total } = calculateTotals(items, invoice.with_tax);
    const updatedNotes = buildEditedNote(invoice.notes);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          subtotal_amount: subtotal,
          tax_amount: tax,
          total_amount: total,
          notes: updatedNotes,
        })
        .eq('id', invoice.id);

      if (error) {
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          const { error: fallbackError } = await supabase
            .from('invoices')
            .update({
              total_amount: total,
              notes: updatedNotes,
            })
            .eq('id', invoice.id);
          if (fallbackError) {
            throw fallbackError;
          }
        } else {
          throw error;
        }
      }

      setInvoice((prev) => ({
        ...prev,
        subtotal_amount: subtotal,
        tax_amount: tax,
        total_amount: total,
        notes: updatedNotes,
      }));
    } catch (error: any) {
      console.error('Error updating invoice totals:', error.message);
      showError(`Failed to update invoice totals: ${error.message}`);
    }
  };

  const fetchInvoiceDetails = useCallback(async () => {
    if (!mountedRef.current) return;
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
          stock_deducted,
          updated_at,
          subtotal_amount,
          tax_amount,
          with_tax
        `)
        .eq('id', initialInvoice.id)
        .single();

      let finalInvoice = updatedInvoice;

      if (invoiceError) {
        if (invoiceError.message.includes("column") && invoiceError.message.includes("does not exist")) {
          const { data: fallback, error: fallbackError } = await supabase
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
              stock_deducted,
              updated_at
            `)
            .eq('id', initialInvoice.id)
            .single();
          if (fallbackError) throw fallbackError;
          finalInvoice = fallback;
        } else {
          throw invoiceError;
        }
      }

      if (!mountedRef.current) return;
      setInvoice({
        ...finalInvoice,
        user_full_name: (finalInvoice as any).profiles?.full_name || "System",
        payment_status: finalInvoice.payment_status as Invoice['payment_status'],
        invoice_status: finalInvoice.invoice_status as InvoiceDocumentStatus,
      });

      // Fetch SR Number from scheduling_requests table
      const { data: srData, error: srError } = await supabase
        .from('scheduling_requests')
        .select('sr_number')
        .eq('invoice_id', initialInvoice.id)
        .single();

      if (!mountedRef.current) return;
      if (srError && srError.code !== 'PGRST116') {
        setSrNumber(null);
      } else {
        setSrNumber(srData?.sr_number || null);
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', initialInvoice.id);

      if (!mountedRef.current) return;
      if (itemsError) {
        setInvoiceItems([]);
      } else {
        const mappedItems = (itemsData || []).map((item: InvoiceItem) => ({
          ...item,
          tempId: item.id,
          isNew: false,
        }));
        setInvoiceItems(mappedItems);
      }

    } catch (error: any) {
      if (!mountedRef.current) return;
      showError("Failed to load invoice details: " + error.message);
    } finally {
      if (mountedRef.current) setIsLoadingDetails(false);
    }
  }, [initialInvoice.id]);

  useEffect(() => {
    fetchInvoiceDetails();
  }, [fetchInvoiceDetails]);

  const fetchProducts = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsLoadingProducts(true);
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        kode_barang,
        nama_barang,
        harga_jual,
        satuan,
        product_type,
        warehouse_inventories (warehouse_category, quantity)
      `);

    if (!mountedRef.current) return;
    if (error) {
      showError('Failed to load product catalog.');
    } else {
      const formatted = (data || []).map((product: any) => ({
        id: product.id,
        kode_barang: product.kode_barang,
        nama_barang: product.nama_barang,
        harga_jual: product.harga_jual,
        satuan: product.satuan,
        product_type: product.product_type,
        inventories: product.warehouse_inventories || [],
      }));
      setProducts(formatted);
    }
    setIsLoadingProducts(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!baseUrl) {
          throw new Error("Supabase URL is not configured.");
        }

        const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
        if (!accessToken) {
          throw new Error("User not authenticated for stock deduction.");
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const deductStockResponse = await fetch(
          `${baseUrl}/functions/v1/deduct-sales-stock`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ invoice_id: invoice.id }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);
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

  const getSelectedProduct = () => {
    if (!selectedProductId) return null;
    return products.find((product) => product.id === selectedProductId) || null;
  };

  const getSiapJualStock = (product: ProductWithInventory | null) => {
    if (!product) return 0;
    const inventory = product.inventories.find((inv) => inv.warehouse_category === 'siap_jual');
    return inventory?.quantity ?? 0;
  };

  const getItemSiapJualStock = (item: InvoiceItemDraft) => {
    const product = products.find((product) => product.id === item.product_id) || null;
    return getSiapJualStock(product);
  };

  const openAddItemDialog = () => {
    setItemForm({
      tempId: `temp-${Date.now()}`,
      item_name: '',
      item_code: '',
      quantity: 1,
      unit_price: 0,
      subtotal: 0,
      unit_type: '',
      invoice_number: invoice.invoice_number,
      isNew: true,
    });
    setSelectedProductId(null);
    setIsItemDialogOpen(true);
  };

  const openEditItemDialog = (item: InvoiceItemDraft) => {
    const productId = item.product_id || products.find((product) => product.kode_barang === item.item_code)?.id || null;
    setItemForm({ ...item });
    setSelectedProductId(productId);
    setIsItemDialogOpen(true);
  };

  const handleItemFormChange = (field: keyof InvoiceItemDraft, value: string | number) => {
    setItemForm((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value } as InvoiceItemDraft;
      if (field === 'quantity' || field === 'unit_price') {
        updated.subtotal = calculateItemSubtotal(updated.quantity, updated.unit_price);
      }
      return updated;
    });
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setSelectedProductId(productId);
    setItemForm((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        product_id: product.id,
        item_name: product.nama_barang,
        item_code: product.kode_barang,
        unit_price: product.harga_jual,
        unit_type: product.satuan || prev.unit_type,
      };
      updated.subtotal = calculateItemSubtotal(updated.quantity, updated.unit_price);
      return updated;
    });
  };

  const validateItem = (item: InvoiceItemDraft) => {
    if (!item.product_id) {
      showError('Please select a product from the catalog.');
      return false;
    }
    if (!item.item_name.trim()) {
      showError('Item name is required.');
      return false;
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      showError('Quantity must be greater than 0.');
      return false;
    }
    if (!Number.isFinite(item.unit_price) || item.unit_price < 0) {
      showError('Unit price must be 0 or greater.');
      return false;
    }
    const product = products.find((prod) => prod.id === item.product_id) || null;
    const stock = getSiapJualStock(product);
    if (product?.product_type !== 'SERVICE' && stock <= 0) {
      showError('Stok tidak tersedia di gudang siap_jual.');
      return false;
    }
    if (product?.product_type !== 'SERVICE' && item.quantity > stock) {
      showError(`Stok tidak cukup di gudang siap_jual. Tersedia ${stock}.`);
      return false;
    }
    return true;
  };

  const getStockValidation = (item: InvoiceItemDraft | null) => {
    if (!item?.product_id) return { canSave: false, message: 'Pilih produk terlebih dahulu.' };
    const product = products.find((prod) => prod.id === item.product_id) || null;
    if (product?.product_type === 'SERVICE') return { canSave: true, message: '' };
    const stock = getSiapJualStock(product);
    if (stock <= 0) return { canSave: false, message: 'Stok tidak tersedia di gudang siap_jual.' };
    if (item.quantity > stock) return { canSave: false, message: `Stok tidak cukup. Tersedia ${stock}.` };
    return { canSave: true, message: '' };
  };

  const handleSaveInvoiceItem = () => {
    if (!itemForm) return;
    if (!validateItem(itemForm)) return;
    setPendingAction({ type: 'save', item: itemForm });
    setIsItemDialogOpen(false);
  };

  const handleDeleteInvoiceItem = (item: InvoiceItemDraft) => {
    setPendingAction({ type: 'delete', item });
  };

  const executePendingAction = async () => {
    if (!pendingAction) return;
    setIsSavingItem(true);
    const { type, item } = pendingAction;

    try {
      if (type === 'save') {
        const payload = {
          invoice_id: invoice.id,
          product_id: item.product_id || null,
          item_name: item.item_name,
          item_code: item.item_code || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: calculateItemSubtotal(item.quantity, item.unit_price),
          unit_type: item.unit_type || null,
        };

        if (item.isNew || !item.id) {
          const { data, error } = await supabase
            .from('invoice_items')
            .insert(payload)
            .select('*')
            .single();

          if (error) throw error;

          const newItem = { ...data, tempId: data.id, isNew: false } as InvoiceItemDraft;
          setInvoiceItems((prev) => [...prev, newItem]);
          const updatedItems = [...invoiceItems, newItem];
          await persistInvoiceTotals(updatedItems);

          showSuccess('Invoice item added.');
        } else {
          const { data, error } = await supabase
            .from('invoice_items')
            .update(payload)
            .eq('id', item.id)
            .select('*')
            .single();

          if (error) throw error;

          const updatedItem = { ...data, tempId: data.id, isNew: false } as InvoiceItemDraft;
          const updatedItems = invoiceItems.map((existing) => (
            existing.tempId === item.tempId
              ? updatedItem
              : existing
          ));
          setInvoiceItems(updatedItems);
          await persistInvoiceTotals(updatedItems);

          showSuccess('Invoice item updated.');
        }
      }

      if (type === 'delete') {
        if (!item.id) {
          setInvoiceItems((prev) => prev.filter((existing) => existing.tempId !== item.tempId));
          await persistInvoiceTotals(invoiceItems.filter((existing) => existing.tempId !== item.tempId));
          showSuccess('Invoice item removed.');
        } else {
          const { error } = await supabase
            .from('invoice_items')
            .delete()
            .eq('id', item.id);
          if (error) throw error;

          const remainingItems = invoiceItems.filter((existing) => existing.tempId !== item.tempId);
          setInvoiceItems(remainingItems);
          await persistInvoiceTotals(remainingItems);
          showSuccess('Invoice item deleted.');
        }
      }

      onUpdate();
    } catch (error: any) {
      console.error('Error saving invoice item:', error.message);
      showError(`Failed to update invoice item: ${error.message}`);
    } finally {
      setIsSavingItem(false);
      setPendingAction(null);
    }
  };

  if (isLoadingDetails) {
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
            {isPendingPayment && isInvoicePending && ( // Only show buttons if payment is pending AND invoice is in PENDING document status
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

              <Separator className="bg-gray-800 my-2" />

              <div className="flex items-center text-sm"><DollarSign className="mr-2 h-4 w-4 text-gray-400" /> Subtotal: <span className="ml-2 font-medium text-gray-400">Rp {invoice.subtotal_amount?.toLocaleString("id-ID") || invoice.total_amount.toLocaleString("id-ID")}</span></div>
              {invoice.with_tax && (
                <div className="flex items-center text-sm"><Receipt className="mr-2 h-4 w-4 text-neon-cyan" /> Pajak (11%): <span className="ml-2 font-medium text-neon-cyan">Rp {invoice.tax_amount?.toLocaleString("id-ID")}</span></div>
              )}
              <div className="flex items-center text-sm"><DollarSign className="mr-2 h-4 w-4 text-lime-400" /> Total Tagihan: <span className="ml-2 font-bold text-lg text-neon-cyan">Rp {invoice.total_amount.toLocaleString("id-ID")}</span></div>

              <Separator className="bg-gray-800 my-2" />

              <div className="flex items-center text-sm"><Info className="mr-2 h-4 w-4 text-lime-400" /> Payment Status: <Badge className={getPaymentStatusColor(invoice.payment_status)}>{invoice.payment_status.replace(/_/g, ' ').toUpperCase()}</Badge></div>
              {invoice.payment_status === 'paid' && invoice.updated_at && (
                <div className="flex items-center text-sm"><Calendar className="mr-2 h-4 w-4 text-lime-400" /> Tanggal Paid: <span className="ml-2 font-medium">{format(new Date(invoice.updated_at), "dd/MM/yy")}</span></div>
              )}
              <div className="flex items-center text-sm"><Info className="mr-2 h-4 w-4 text-lime-400" /> Invoice Status: <Badge className={getInvoiceDocumentStatusColor(invoice.invoice_status)}>{invoice.invoice_status.replace(/_/g, ' ').toUpperCase()}</Badge></div>
              {hasUserEditedInvoice && (
                <div className="flex items-center text-sm"><Info className="mr-2 h-4 w-4 text-orange-400" /> Edit Status: <Badge className="bg-orange-600/20 text-orange-300 border border-orange-500/30">Edited by user</Badge></div>
              )}
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
            <div className="flex justify-end mb-3">
              <Button
                onClick={openAddItemDialog}
                className="bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 border border-neon-cyan/40"
              >
                Add Item
              </Button>
            </div>
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
                      <th className="p-2 text-neon-cyan">Siap Jual Stock</th>
                      <th className="p-2 text-neon-cyan">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItems.map((item) => (
                      <tr key={item.id} className="border-b border-gray-800 last:border-b-0 hover:bg-gray-800/50 transition-colors">
                        <td className="p-2">{item.item_name} {item.item_code ? `(${item.item_code})` : ''}</td>
                        <td className="p-2">{item.quantity} {item.unit_type || ''}</td>
                        <td className="p-2">Rp {item.unit_price.toLocaleString("id-ID")}</td>
                        <td className="p-2">Rp {item.subtotal.toLocaleString("id-ID")}</td>
                        <td className="p-2">{getItemSiapJualStock(item).toLocaleString("id-ID")}</td>
                        <td className="p-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-blue-600/80 hover:bg-blue-600 text-white"
                              onClick={() => openEditItemDialog(item)}
                              disabled={isSavingItem}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteInvoiceItem(item)}
                              disabled={isSavingItem}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <Dialog
        open={isItemDialogOpen}
        onOpenChange={(open) => {
          setIsItemDialogOpen(open);
          if (!open) {
            setItemForm(null);
            setSelectedProductId(null);
          }
        }}
      >
        <DialogContent className="bg-gray-950 border border-gray-700 text-gray-200 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-neon-cyan">{itemForm?.isNew ? 'Add Invoice Item' : 'Edit Invoice Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Product Catalog</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between border-gray-700 bg-gray-900/40 text-gray-200"
                    disabled={isLoadingProducts}
                  >
                    {selectedProductId
                      ? `${getSelectedProduct()?.nama_barang} (${getSelectedProduct()?.kode_barang})`
                      : isLoadingProducts
                      ? 'Loading products...'
                      : 'Select product'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[420px]">
                  <Command>
                    <CommandInput placeholder="Search product..." />
                    <CommandList>
                      <CommandEmpty>No products found.</CommandEmpty>
                      <CommandGroup>
                        {products.map((product) => (
                          <CommandItem
                            key={product.id}
                            value={`${product.nama_barang} ${product.kode_barang}`}
                            onSelect={() => handleProductSelect(product.id)}
                          >
                            {product.nama_barang} ({product.kode_barang})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedProductId && (
                <p className="text-xs text-gray-400">
                  Stok siap_jual: {getSiapJualStock(getSelectedProduct()).toLocaleString('id-ID')} unit.
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-300">Item Name</Label>
                <Input
                  value={itemForm?.item_name || ''}
                  onChange={(event) => handleItemFormChange('item_name', event.target.value)}
                  className="bg-gray-900/40 border-gray-700 text-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Item Code</Label>
                <Input
                  value={itemForm?.item_code || ''}
                  onChange={(event) => handleItemFormChange('item_code', event.target.value)}
                  className="bg-gray-900/40 border-gray-700 text-gray-200"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-gray-300">Quantity</Label>
                  <Input
                    type="number"
                    min={0}
                    value={itemForm?.quantity ?? 0}
                    onChange={(event) => handleItemFormChange('quantity', Number(event.target.value))}
                    className="bg-gray-900/40 border-gray-700 text-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Unit</Label>
                  <Input
                    value={itemForm?.unit_type || ''}
                    onChange={(event) => handleItemFormChange('unit_type', event.target.value)}
                    className="bg-gray-900/40 border-gray-700 text-gray-200"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Unit Price</Label>
                <Input
                  type="number"
                  min={0}
                  value={itemForm?.unit_price ?? 0}
                  onChange={(event) => handleItemFormChange('unit_price', Number(event.target.value))}
                  className="bg-gray-900/40 border-gray-700 text-gray-200"
                />
              </div>
              <div className="text-sm text-gray-400">Subtotal: Rp {itemForm?.subtotal?.toLocaleString('id-ID') || '0'}</div>
            </div>
          </div>
          {itemForm && !getStockValidation(itemForm).canSave && (
            <p className="text-xs text-orange-300">{getStockValidation(itemForm).message}</p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsItemDialogOpen(false)} className="border-gray-700 text-gray-200">
              Cancel
            </Button>
            <Button
              onClick={handleSaveInvoiceItem}
              className="bg-neon-cyan text-gray-950 hover:bg-neon-cyan/90"
              disabled={!!itemForm && !getStockValidation(itemForm).canSave}
            >
              Save Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent className="bg-gray-950 border border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-neon-cyan">Confirm changes</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {pendingAction?.type === 'delete'
                ? 'Are you sure you want to delete this invoice item? This will update the invoice totals.'
                : 'Save changes to this invoice item? This will update the invoice totals.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-200">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-neon-cyan text-gray-950 hover:bg-neon-cyan/90"
              onClick={executePendingAction}
              disabled={isSavingItem}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default BillingListDetail;
