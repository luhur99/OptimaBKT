import { useEffect, useState, useMemo, useRef } from "react";
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
import { PlusCircle, Trash2, CalendarIcon, Search } from "lucide-react";
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
import DashboardLayout from "@/layouts/DashboardLayout";
import { Progress } from "@/components/ui/progress"; // Assuming shadcn Progress component
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

// Type definitions
type InvoiceDocumentStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'CANCELLED';

type SchedulingRequestQueueItem = {
  id: string;
  sr_number: string;
  do_number?: string;
  customer_name: string;
  full_address: string;
  technician_name?: string;
  document_url?: string;
  user_id: string;
  invoice_id: string; // Keep this as it's the FK
  invoice_number?: string; // Add this to display
  invoice_status: InvoiceDocumentStatus; // Use new enum type
  progress_status: number; // Added for progress bar
};

type Product = {
  id: string;
  kode_barang: string;
  nama_barang: string;
  harga_jual: number;
  satuan?: string;
};

type InvoiceItemForm = {
  tempId: string;
  product_id: string;
  item_name: string;
  item_code: string;
  quantity: number;
  unit_price: number;
  unit_type?: string;
  subtotal: number;
};

// Simple CountUp component
const CountUp: React.FC<{ value: number }> = ({ value }) => {
  const [currentValue, setCurrentValue] = useState(0);
  const ref = useRef(currentValue);

  useEffect(() => {
    ref.current = currentValue;
  }, [currentValue]);

  useEffect(() => {
    let start: number | null = null;
    const duration = 500; // milliseconds

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = (timestamp - start) / duration;
      const animatedValue = Math.min(progress, 1) * (value - ref.current) + ref.current;
      setCurrentValue(animatedValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrentValue(value);
      }
    };

    if (value !== currentValue) {
      start = null; // Reset start time for new animation
      requestAnimationFrame(animate);
    }
  }, [value]);

  return <>{currentValue.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>;
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
  const [activeRowId, setActiveRowId] = useState<string | null>(null); // State for active row in table

  const hasUnsavedChanges = useMemo(() => {
    return selectedRequest !== null && invoiceItems.length > 0;
  }, [selectedRequest, invoiceItems]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = ""; // Required for Chrome
        return ""; // Required for Firefox
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

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
        status,
        technician_name,
        invoice_status,
        invoices (invoice_number)
      `)
      .eq("status", "completed")
      .eq("invoice_status", "DRAFT"); // Filter by new DRAFT enum

    if (error) {
      console.error("Error fetching billing review queue:", error);
      showError("Failed to load billing review queue: " + error.message);
    } else {
      const formattedData: SchedulingRequestQueueItem[] = data.map((req: any) => ({
        ...req,
        technician_name: req.technician_name || null,
        invoice_number: req.invoices?.invoice_number || null, // Extract invoice_number
        invoice_status: req.invoice_status as InvoiceDocumentStatus, // Cast to new enum type
        progress_status: Math.floor(Math.random() * 100) + 1, // Placeholder progress
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
      if (profile?.role !== "OPERASIONAL_DIV" && profile?.role !== "SUPER_ADMIN" && profile?.role !== "ACCOUNTING") {
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
    setInvoiceItems([]);
    setActiveRowId(null);
  };

  const handleAddInvoiceItem = () => {
    const newTempId = crypto.randomUUID();
    setInvoiceItems((prev) => [
      ...prev,
      {
        tempId: newTempId,
        product_id: "",
        item_name: "",
        item_code: "",
        quantity: 1,
        unit_price: 0,
        unit_type: "",
        subtotal: 0,
      },
    ]);
    setActiveRowId(newTempId); // Set new row as active
  };

  const handleRemoveInvoiceItem = (tempId: string) => {
    setInvoiceItems((prev) => prev.filter((item) => item.tempId !== tempId));
    if (activeRowId === tempId) {
      setActiveRowId(null);
    }
  };

  const handleInvoiceItemChange = (
    tempId: string,
    field: keyof InvoiceItemForm,
    value: any
  ) => {
    setInvoiceItems((prev) =>
      prev.map((item) => {
        if (item.tempId === tempId) {
          let updatedItem = { ...item, [field]: value };

          if (field === "quantity" || field === "unit_price") {
            // If quantity or unit_price changes, recalculate subtotal
            updatedItem.subtotal = updatedItem.quantity * updatedItem.unit_price;
          } else if (field === "subtotal") {
            // If subtotal changes, derive unit_price if quantity is not zero
            if (updatedItem.quantity > 0) {
              updatedItem.unit_price = updatedItem.subtotal / updatedItem.quantity;
            } else {
              updatedItem.unit_price = 0; // Or handle as appropriate if quantity is zero
            }
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
              unit_price: product.harga_jual, // Pre-fill unit price
              unit_type: product.satuan,
            };
            updatedItem.subtotal = updatedItem.quantity * updatedItem.unit_price; // Initial subtotal calculation
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
          invoice_status: "PENDING", // Set to PENDING after finalization
          payment_status: "pending", // Payment status is pending by default
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
        invoice_id: selectedRequest.invoice_id,
        user_id: session?.user?.id,
        product_id: item.product_id,
        item_name: item.item_name,
        item_code: item.item_code,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        unit_type: item.unit_type,
        scheduling_id: selectedRequest.id,
      }));

      const { error: invoiceItemsError } = await supabase
        .from("invoice_items")
        .insert(itemsToInsert);

      if (invoiceItemsError) {
        throw new Error(invoiceItemsError.message || "Failed to insert invoice items.");
      }

      // 3. Update scheduling_requests invoice_status to PENDING
      const { error: updateRequestError } = await supabase
        .from("scheduling_requests")
        .update({
          invoice_status: "PENDING", // Update scheduling_requests.invoice_status to PENDING
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
        // Specific error message for stock insufficiency
        if (deductStockData.error && deductStockData.error.includes("Insufficient stock")) {
          throw new Error("Stok Gudang Siap Jual Tidak Mencukupi!");
        }
        throw new Error(deductStockData.error || "Failed to deduct stock for invoice.");
      }


      showSuccess(`Invoice ${generatedInvoiceNumber} has been issued and stock deducted.`);
      setSelectedRequest(null);
      setInvoiceItems([]);
      fetchQueue();
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
          <Skeleton className="h-10 w-1/2 bg-gray-700" />
          <ResizablePanelGroup direction="horizontal" className="min-h-[700px] rounded-lg border border-gray-700">
            <ResizablePanel defaultSize={30}>
              <div className="flex h-full items-center justify-center p-6">
                <Skeleton className="h-full w-full bg-gray-800" />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-gray-700 hover:bg-neon-cyan" />
            <ResizablePanel defaultSize={70}>
              <div className="flex h-full items-center justify-center p-6">
                <Skeleton className="h-full w-full bg-gray-800" />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </DashboardLayout>
    );
  }

  if (!session || (profile?.role !== "OPERASIONAL_DIV" && profile?.role !== "SUPER_ADMIN" && profile?.role !== "ACCOUNTING")) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen text-gray-400">
          Unauthorized access.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6 text-neon-cyan">Antrean Melengkapi Item Invoice</h1>

      <ResizablePanelGroup direction="horizontal" className="min-h-[700px] rounded-lg glassmorphism border border-neon-cyan/30">
        <ResizablePanel defaultSize={30} minSize={20}>
          <ScrollArea className="h-full p-4">
            <h2 className="text-xl font-semibold mb-4 text-neon-cyan">Completed Requests (DRAFT Invoice)</h2>
            {queue.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-md p-4 radar-grid-background">
                <p>No completed requests awaiting billing review. Scanning...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3"> {/* Bento Box Grid */}
                {queue.map((req) => (
                  <Card
                    key={req.id}
                    className={cn(
                      "cursor-pointer glassmorphism border transition-all duration-200",
                      "hover:bg-gray-800/50",
                      selectedRequest?.id === req.id
                        ? "border-neon-cyan neon-glow"
                        : "border-gray-700"
                    )}
                    onClick={() => handleSelectRequest(req)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-neon-cyan">{req.sr_number}</CardTitle>
                      <Badge className="bg-yellow-600/20 text-yellow-300 border border-yellow-500/30">DRAFT Invoice</Badge>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <p className="text-sm text-gray-400">{req.customer_name}</p>
                      <p className="text-xs text-gray-500">{req.do_number || "No DO"}</p>
                      <div className="mt-3">
                        <Label className="text-xs text-gray-500">Billing Progress</Label>
                        <Progress value={req.progress_status} className="h-2 mt-1 bg-gray-700 [&>*]:bg-neon-cyan" />
                        <span className="text-xs text-gray-500 float-right mt-1">{req.progress_status}%</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-gray-700 hover:bg-neon-cyan transition-colors" />
        <ResizablePanel defaultSize={70} minSize={50}>
          <ScrollArea className="h-full p-6">
            {selectedRequest ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-neon-cyan">Detail Invoice: <span className="text-electric-violet">{selectedRequest.sr_number}</span></h2>
                <div className="grid grid-cols-2 gap-4 text-gray-300">
                  <div>
                    <p className="text-sm font-medium text-gray-400">SR Number:</p>
                    <p className="text-lg text-neon-cyan">{selectedRequest.sr_number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Invoice Number:</p>
                    <p className="text-lg text-neon-cyan">{selectedRequest.invoice_number || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">DO Number:</p>
                    <p className="text-lg">{selectedRequest.do_number || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Customer Name:</p>
                    <p className="text-lg">{selectedRequest.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Assigned Technician:</p>
                    <p className="text-lg">{selectedRequest.technician_name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Full Address:</p>
                    <p className="text-lg">{selectedRequest.full_address}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Invoice Date:</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[240px] pl-3 text-left font-normal glassmorphism border border-gray-700 text-gray-300 hover:bg-gray-800",
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
                      <PopoverContent className="w-auto p-0 glassmorphism border border-gray-700" align="start">
                        <Calendar
                          mode="single"
                          selected={invoiceDate}
                          onSelect={(date) => date && setInvoiceDate(date)}
                          initialFocus
                          className="text-gray-300"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {selectedRequest.document_url && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2 text-gray-400">Technician Document/Photo:</p>
                    <a
                      href={selectedRequest.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neon-cyan hover:underline"
                    >
                      View Document
                    </a>
                  </div>
                )}

                <h3 className="text-xl font-semibold mt-8 mb-4 text-neon-cyan">Invoice Items</h3>
                <Table className="text-gray-300">
                  <TableHeader className="glassmorphism border-b border-gray-700">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-neon-cyan">Product</TableHead>
                      <TableHead className="w-[100px] text-neon-cyan">Qty</TableHead>
                      <TableHead className="w-[150px] text-neon-cyan">Unit Price</TableHead>
                      <TableHead className="w-[150px] text-neon-cyan">Subtotal</TableHead>
                      <TableHead className="w-[50px] text-neon-cyan">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceItems.map((item) => (
                      <TableRow
                        key={item.tempId}
                        className={cn(
                          "border-b border-gray-800 transition-all duration-300",
                          "hover:bg-gray-800/50",
                          activeRowId === item.tempId && "border-electric-violet animate-pulse-glow"
                        )}
                        onClick={() => setActiveRowId(item.tempId)}
                      >
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between glassmorphism border border-gray-700 text-gray-300 hover:bg-gray-800"
                              >
                                {item.product_id
                                  ? products.find((product) => product.id === item.product_id)?.nama_barang
                                  : "Select Product"}
                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 glassmorphism border border-gray-700">
                              <Command>
                                <CommandInput placeholder="Search product..." className="text-gray-300" />
                                <CommandList>
                                  <CommandEmpty>No product found.</CommandEmpty>
                                  <CommandGroup>
                                    {products.map((product) => (
                                      <CommandItem
                                        key={product.id}
                                        value={product.nama_barang}
                                        onSelect={() => {
                                          handleProductSelect(item.tempId, product.id);
                                        }}
                                        className="text-gray-300 hover:bg-gray-800/50"
                                      >
                                        {product.nama_barang} ({product.kode_barang})
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {item.product_id && (
                            <p className="text-xs text-gray-500 mt-1">
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
                            className="glassmorphism border border-gray-700 text-gray-300"
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
                            className="glassmorphism border border-gray-700 text-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.subtotal}
                            onChange={(e) =>
                              handleInvoiceItemChange(
                                item.tempId,
                                "subtotal",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            step="0.01"
                            className="glassmorphism border border-gray-700 text-gray-300 font-bold text-neon-cyan"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleRemoveInvoiceItem(item.tempId)}
                            className="bg-red-600/40 hover:bg-red-600/60 border border-red-700/50 text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <TableCell colSpan={5}>
                        <Button
                          variant="outline"
                          className="w-full glassmorphism border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/20 transition-all duration-300"
                          onClick={handleAddInvoiceItem}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="flex justify-end mt-6">
                  <Button
                    onClick={handleFinalizeInvoice}
                    disabled={isFinalizing || invoiceItems.length === 0 || grandTotal <= 0}
                    className="bg-electric-violet text-white text-lg px-8 py-6 hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300"
                  >
                    {isFinalizing ? "Finalizing..." : "Finalize & Generate Invoice"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-md p-4 radar-grid-background">
                Select a completed request from the left panel to review and generate invoice.
              </div>
            )}
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Sticky Footer for Grand Total */}
      <div className="fixed bottom-0 left-0 right-0 md:ml-72 p-4 bg-deep-charcoal/80 glassmorphism border-t border-neon-cyan/30 flex justify-end items-center z-40">
        <div className="flex items-center space-x-8">
          <div className="text-right">
            <Label className="text-sm text-gray-400">Subtotal</Label>
            <p className="text-lg font-semibold text-gray-300">Rp <CountUp value={grandTotal} /></p>
          </div>
          <div className="text-right">
            <Label className="text-sm text-gray-400">Calculated Tax</Label>
            <p className="text-lg font-semibold text-gray-300">Rp <CountUp value={grandTotal * 0.1} /></p> {/* Placeholder tax */}
          </div>
          <div className="text-right">
            <Label className="text-lg font-semibold text-gray-200">LIVE TOTAL</Label>
            <p className="text-4xl font-extrabold neon-cyan-text">Rp <CountUp value={grandTotal * 1.1} /></p> {/* Placeholder total with tax */}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BillingReviewPage;