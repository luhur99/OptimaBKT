import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Trash2, CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/layouts/DashboardLayout"; // Import the new layout

// Type definitions
type SchedulingRequestQueueItem = {
  id: string;
  sr_number: string;
  do_number?: string;
  customer_name: string;
  full_address: string;
  technician_name?: string;
  document_url?: string; // Assuming technicians can upload documents/photos
  user_id: string; // The user who created the request
  invoice_id: string; // The UUID of the DRAFT invoice created in Stage 1
};

type Product = {
  id: string;
  kode_barang: string;
  nama_barang: string;
  harga_jual: number;
  satuan?: string;
};

type InvoiceItemForm = {
  tempId: string; // For UI keying
  product_id: string;
  item_name: string;
  item_code: string;
  quantity: number;
  unit_price: number;
  unit_type?: string;
  subtotal: number;
};

const BillingReviewPage = () => {
  const { session, profile, isLoading: isAuthLoading } = useAuthSession();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<SchedulingRequestQueueItem[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SchedulingRequestQueueItem | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItemForm[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());

  const fetchQueue = async () => {
    setIsLoadingQueue(true);
    const { data, error } = await supabase
      .from("scheduling_requests")
      .select(`
        id,
        sr_number,
        do_number,
        customer_name,
        full_address,
        document_url,
        user_id,
        invoice_id,
        profiles!assigned_technician_id (full_name)
      `)
      .eq("status", "completed")
      .eq("invoice_status", "DRAFT"); // Filter for DRAFT invoices

    if (error) {
      console.error("Error fetching billing review queue:", error);
      showError("Failed to load billing review queue.");
    } else {
      const formattedData: SchedulingRequestQueueItem[] = data.map((req: any) => ({
        ...req,
        technician_name: req.profiles?.full_name || null,
      }));
      setQueue(formattedData);
    }
    setIsLoadingQueue(false);
  };

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    const { data, error } = await supabase
      .from("products")
      .select("id, kode_barang, nama_barang, harga_jual, satuan");

    if (error) {
      console.error("Error fetching products:", error);
      showError("Failed to load products.");
    } else {
      setProducts(data || []);
    }
    setIsLoadingProducts(false);
  };

  useEffect(() => {
    if (!isAuthLoading) {
      if (!session) {
        navigate("/");
        return;
      }
      if (profile?.role !== "OPERASIONAL_DIV" && profile?.role !== "SUPER_ADMIN") {
        navigate("/dashboard");
        showError("You do not have permission to access this page.");
        return;
      }
      fetchQueue();
      fetchProducts();
    }
  }, [isAuthLoading, session, profile, navigate]);

  const handleSelectRequest = (request: SchedulingRequestQueueItem) => {
    setSelectedRequest(request);
    setInvoiceItems([]); // Clear previous items when selecting a new request
    // Optionally, fetch existing invoice items if the invoice was partially filled
    // For now, we assume it's always starting fresh for DRAFT invoices
  };

  const handleAddInvoiceItem = () => {
    setInvoiceItems((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        product_id: "",
        item_name: "",
        item_code: "",
        quantity: 1,
        unit_price: 0,
        unit_type: "",
        subtotal: 0,
      },
    ]);
  };

  const handleRemoveInvoiceItem = (tempId: string) => {
    setInvoiceItems((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const handleInvoiceItemChange = (
    tempId: string,
    field: keyof InvoiceItemForm,
    value: any
  ) => {
    setInvoiceItems((prev) =>
      prev.map((item) => {
        if (item.tempId === tempId) {
          const updatedItem = { ...item, [field]: value };
          if (field === "quantity" || field === "unit_price") {
            updatedItem.subtotal = updatedItem.quantity * updatedItem.unit_price;
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleProductSelect = (tempId: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setInvoiceItems((prev) =>
        prev.map((item) => {
          if (item.tempId === tempId) {
            const updatedItem = {
              ...item,
              product_id: product.id,
              item_name: product.nama_barang,
              item_code: product.kode_barang,
              unit_price: product.harga_jual,
              unit_type: product.satuan,
            };
            updatedItem.subtotal = updatedItem.quantity * updatedItem.unit_price;
            return updatedItem;
          }
          return item;
        })
      );
    }
  };

  const grandTotal = useMemo(() => {
    return invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [invoiceItems]);

  const handleFinalizeInvoice = async () => {
    if (!selectedRequest) {
      showError("Please select a scheduling request to finalize.");
      return;
    }
    if (invoiceItems.length === 0) {
      showError("Please add at least one invoice item.");
      return;
    }
    if (invoiceItems.some(item => !item.product_id || item.quantity <= 0 || item.unit_price <= 0)) {
      showError("Please ensure all invoice items have a selected product, quantity > 0, and unit price > 0.");
      return;
    }

    setIsFinalizing(true);
    try {
      // 1. Update the existing invoice (created in Stage 1)
      const { data: updatedInvoice, error: updateInvoiceError } = await supabase
        .from("invoices")
        .update({
          invoice_date: format(invoiceDate, "yyyy-MM-dd"),
          total_amount: grandTotal,
          invoice_status: "issued", // Mark as issued
        })
        .eq("id", selectedRequest.invoice_id)
        .select("invoice_number")
        .single();

      if (updateInvoiceError || !updatedInvoice) {
        throw new Error(updateInvoiceError?.message || "Failed to update invoice.");
      }

      const generatedInvoiceNumber = updatedInvoice.invoice_number;

      // 2. Insert invoice items
      const itemsToInsert = invoiceItems.map((item) => ({
        invoice_id: selectedRequest.invoice_id, // Link to the existing invoice
        user_id: session?.user?.id,
        product_id: item.product_id,
        item_name: item.item_name,
        item_code: item.item_code,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        unit_type: item.unit_type,
        scheduling_id: selectedRequest.id, // Link to scheduling request
      }));

      const { error: invoiceItemsError } = await supabase
        .from("invoice_items")
        .insert(itemsToInsert);

      if (invoiceItemsError) {
        throw new Error(invoiceItemsError.message || "Failed to insert invoice items.");
      }

      // 3. Update scheduling_requests invoice_status to FINAL
      const { error: updateRequestError } = await supabase
        .from("scheduling_requests")
        .update({
          invoice_status: "FINAL", // Mark as finalized
        })
        .eq("id", selectedRequest.id);

      if (updateRequestError) {
        throw new Error(updateRequestError.message || "Failed to update scheduling request status.");
      }

      // 4. Call Edge Function to deduct stock
      const deductStockResponse = await fetch(
        `https://hhhzugqimtypijkdxxsm.supabase.co/functions/v1/deduct-sales-stock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ invoice_id: selectedRequest.invoice_id }),
        }
      );

      const deductStockData = await deductStockResponse.json();

      if (!deductStockResponse.ok) {
        throw new Error(deductStockData.error || "Failed to deduct stock for invoice.");
      }


      showSuccess(`Invoice ${generatedInvoiceNumber} has been issued and stock deducted.`);
      setSelectedRequest(null); // Clear selected request
      setInvoiceItems([]); // Clear invoice items
      fetchQueue(); // Refresh the queue
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred during finalization.");
    } finally {
      setIsFinalizing(false);
    }
  };

  if (isAuthLoading || isLoadingQueue || isLoadingProducts) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10 space-y-6">
          <Skeleton className="h-10 w-1/2" />
          <ResizablePanelGroup direction="horizontal" className="min-h-[700px] rounded-lg border">
            <ResizablePanel defaultSize={30}>
              <div className="flex h-full items-center justify-center p-6">
                <Skeleton className="h-full w-full" />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={70}>
              <div className="flex h-full items-center justify-center p-6">
                <Skeleton className="h-full w-full" />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </DashboardLayout>
    );
  }

  if (!session || (profile?.role !== "OPERASIONAL_DIV" && profile?.role !== "SUPER_ADMIN")) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          Unauthorized access.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Antrean Melengkapi Item Invoice</h1>

      <ResizablePanelGroup direction="horizontal" className="min-h-[700px] rounded-lg border">
        <ResizablePanel defaultSize={30} minSize={20}>
          <ScrollArea className="h-full p-4">
            <h2 className="text-xl font-semibold mb-4">Completed Requests (DRAFT Invoice)</h2>
            {queue.length === 0 ? (
              <p className="text-muted-foreground">No completed requests awaiting billing review.</p>
            ) : (
              <div className="space-y-3">
                {queue.map((req) => (
                  <Card
                    key={req.id}
                    className={cn(
                      "cursor-pointer hover:bg-accent",
                      selectedRequest?.id === req.id && "border-primary bg-accent"
                    )}
                    onClick={() => handleSelectRequest(req)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{req.sr_number}</CardTitle>
                      <Badge className="bg-yellow-100 text-yellow-800">DRAFT Invoice</Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{req.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{req.do_number || "No DO"}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70} minSize={50}>
          <ScrollArea className="h-full p-6">
            {selectedRequest ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Detail Request: {selectedRequest.sr_number}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">SR Number:</p>
                    <p className="text-lg">{selectedRequest.sr_number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">DO Number:</p>
                    <p className="text-lg">{selectedRequest.do_number || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Customer Name:</p>
                    <p className="text-lg">{selectedRequest.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Assigned Technician:</p>
                    <p className="text-lg">{selectedRequest.technician_name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Full Address:</p>
                    <p className="text-lg">{selectedRequest.full_address}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Invoice Date:</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[240px] pl-3 text-left font-normal",
                            !invoiceDate && "text-muted-foreground"
                          )}
                        >
                          {invoiceDate ? (
                            format(invoiceDate, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={invoiceDate}
                          onSelect={(date) => date && setInvoiceDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {selectedRequest.document_url && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Technician Document/Photo:</p>
                    <a
                      href={selectedRequest.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Document
                    </a>
                  </div>
                )}

                <h3 className="text-xl font-semibold mt-8 mb-4">Invoice Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-[100px]">Qty</TableHead>
                      <TableHead className="w-[150px]">Unit Price</TableHead>
                      <TableHead className="w-[150px]">Subtotal</TableHead>
                      <TableHead className="w-[50px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceItems.map((item) => (
                      <TableRow key={item.tempId}>
                        <TableCell>
                          <Select
                            value={item.product_id}
                            onValueChange={(value) => handleProductSelect(item.tempId, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.nama_barang} ({product.kode_barang})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {item.product_id && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.item_code} - {item.unit_type}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleInvoiceItemChange(
                                item.tempId,
                                "quantity",
                                parseInt(e.target.value) || 0
                              )
                            }
                            min="1"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) =>
                              handleInvoiceItemChange(
                                item.tempId,
                                "unit_price",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          Rp {item.subtotal.toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleRemoveInvoiceItem(item.tempId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={handleAddInvoiceItem}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="flex justify-end items-center mt-4 space-x-4">
                  <Label className="text-lg font-semibold">Grand Total:</Label>
                  <span className="text-xl font-bold">
                    Rp {grandTotal.toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="flex justify-end mt-6">
                  <Button
                    onClick={handleFinalizeInvoice}
                    disabled={isFinalizing || invoiceItems.length === 0 || grandTotal <= 0}
                  >
                    {isFinalizing ? "Finalizing..." : "Finalize & Generate Invoice"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a completed request from the left panel to review and generate invoice.
              </div>
            )}
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </DashboardLayout>
  );
};

export default BillingReviewPage;