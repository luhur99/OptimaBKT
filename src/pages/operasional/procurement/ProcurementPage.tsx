import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/auth-session";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/layouts/DashboardLayout";
import { CreatePurchaseRequestForm } from "@/components/procurement/CreatePurchaseRequestForm";
import { CreateUtilityRequestForm } from "@/components/procurement/CreateUtilityRequestForm";
import { PurchaseOrderTable, createPurchaseOrderColumns, PurchaseOrder } from "@/components/procurement/PurchaseOrderTable";
import { PurchaseOrderDetail } from "@/components/procurement/PurchaseOrderDetail";
import { Button } from "@/components/ui/button";
import { PlusCircle, Truck } from "lucide-react"; // Import Truck icon
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuickAddCustomerSupplierForm } from "@/components/shared/QuickAddCustomerSupplierForm"; // Import new form
import { TableToolbar } from "@/components/shared/TableToolbar";
import { DatePreset, buildExportColumns, exportToCsv, filterRows, getDateRange } from "@/utils/table-tools";

const ProcurementPage = () => {
  const { session, profile, isLoading: isAuthLoading } = useAuthSession();
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoadingPOs, setIsLoadingPOs] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("manage-pos");
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isQuickAddSupplierDialogOpen, setIsQuickAddSupplierDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("custom");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchPurchaseOrders = async () => {
    setIsLoadingPOs(true);
    console.log("Fetching purchase orders...");
    const { data, error } = await supabase
      .from("purchase_orders")
      .select(`
        id,
        po_number,
        status,
        total_biaya,
        created_at,
        suppliers (name),
        profiles!requested_by (full_name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching purchase orders:", error);
      showError("Failed to load purchase orders.");
    } else {
      console.log("Purchase orders fetched:", data);
      const formattedData: PurchaseOrder[] = data.map((po: any) => ({
        ...po,
        supplier_name: po.suppliers?.name || "N/A",
        requested_by_name: po.profiles?.full_name || "N/A",
      }));
      setPurchaseOrders(formattedData);
    }
    setIsLoadingPOs(false);
  };

  useEffect(() => {
    if (!isAuthLoading) {
      if (!session) {
        navigate("/login");
        return;
      }
      if (profile?.role === "STAFF") {
        setIsLoadingPOs(false);
      } else {
        fetchPurchaseOrders();
      }
    }
  }, [isAuthLoading, session, profile, navigate]);

  const handlePOUpdate = () => {
    fetchPurchaseOrders();
    setSelectedPO(null); // Clear selection to refresh detail view
  };

  const handleSupplierAdded = () => {
    // No direct action needed here, as the CreatePurchaseRequestForm will refetch suppliers on mount
    // or the user can re-open the combobox to see the new supplier.
    setIsQuickAddSupplierDialogOpen(false);
  };

  const columns = useMemo(() => createPurchaseOrderColumns(), []);

  const dateRange = useMemo(
    () => getDateRange(datePreset, startDate, endDate),
    [datePreset, startDate, endDate]
  );

  const filteredPurchaseOrders = useMemo(
    () =>
      filterRows(
        purchaseOrders,
        searchValue,
        dateRange,
        (row) => (row.created_at ? new Date(row.created_at) : null)
      ),
    [purchaseOrders, searchValue, dateRange]
  );

  const exportColumns = useMemo(() => buildExportColumns<PurchaseOrder>(columns), [columns]);

  const handleExport = () => {
    exportToCsv("purchase-orders", exportColumns, filteredPurchaseOrders);
  };

  if (isAuthLoading || isLoadingPOs) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10 space-y-6">
          <Skeleton className="h-10 w-1/2 bg-gray-700" />
          <div className="flex space-x-2">
            <Skeleton className="h-9 w-24 bg-gray-700" />
            <Skeleton className="h-9 w-24 bg-gray-700" />
          </div>
          <ResizablePanelGroup direction="horizontal" className="min-h-[700px] rounded-lg border border-gray-700">
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full items-center justify-center p-6">
                <Skeleton className="h-full w-full bg-gray-800" />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-gray-700 hover:bg-neon-cyan" />
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full items-center justify-center p-6">
                <Skeleton className="h-full w-full bg-gray-800" />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen text-gray-400">
          Unauthorized access.
        </div>
      </DashboardLayout>
    );
  }

  if (profile?.role === "STAFF") {
    return (
      <DashboardLayout>
        <h1 className="text-3xl font-bold mb-6 text-neon-cyan">Utility Request</h1>
        <Card className="glassmorphism border border-electric-violet/30">
          <CardHeader>
            <CardTitle className="text-electric-violet">New Utility Request</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateUtilityRequestForm onURCreated={() => {
              showSuccess("Utility Request created successfully!");
            }} />
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6 text-neon-cyan">Procurement Management</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="bg-midnight-blue border border-gray-700">
          <TabsTrigger value="create-pr" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Create Purchase Request</TabsTrigger>
          <TabsTrigger value="create-ur" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Create Utility Request</TabsTrigger>
          <TabsTrigger value="manage-pos" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Manage Purchase Orders</TabsTrigger>
        </TabsList>
        <TabsContent value="create-pr" className="mt-4">
          <Card className="glassmorphism border border-electric-violet/30">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-electric-violet">New Purchase Request</CardTitle>
              <Dialog open={isQuickAddSupplierDialogOpen} onOpenChange={setIsQuickAddSupplierDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-neon-cyan text-deep-charcoal hover:bg-neon-cyan/80 neon-glow-hover transition-all duration-300">
                    <Truck className="mr-2 h-4 w-4" /> Quick Add Supplier
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] glassmorphism border border-neon-cyan/30">
                  <DialogHeader>
                    <DialogTitle className="text-neon-cyan">Quick Add Supplier</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Quickly add a new supplier.
                    </DialogDescription>
                  </DialogHeader>
                  <QuickAddCustomerSupplierForm
                    defaultType="supplier"
                    onQuickAddSuccess={handleSupplierAdded}
                    onClose={() => setIsQuickAddSupplierDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <CreatePurchaseRequestForm onPRCreated={() => {
                showSuccess("Purchase Request created successfully! It will appear in 'Manage Purchase Orders' once approved.");
                setActiveTab("manage-pos");
                fetchPurchaseOrders();
              }} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="create-ur" className="mt-4">
          <Card className="glassmorphism border border-electric-violet/30">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-electric-violet">New Utility Request</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateUtilityRequestForm onURCreated={() => {
                showSuccess("Utility Request created successfully!");
              }} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="manage-pos" className="mt-4">
          <ResizablePanelGroup direction="horizontal" className="min-h-[700px] rounded-lg glassmorphism border border-neon-cyan/30">
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="p-4 h-full">
                <h2 className="text-xl font-semibold mb-4 text-neon-cyan">All Purchase Orders</h2>
                <div className="mb-4">
                  <TableToolbar
                    searchValue={searchValue}
                    onSearchChange={setSearchValue}
                    datePreset={datePreset}
                    onDatePresetChange={setDatePreset}
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onExport={handleExport}
                    exportDisabled={filteredPurchaseOrders.length === 0}
                    searchPlaceholder="Cari PO..."
                  />
                </div>
                <PurchaseOrderTable
                  columns={columns}
                  data={filteredPurchaseOrders}
                  onRowClick={setSelectedPO}
                />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-gray-700 hover:bg-neon-cyan transition-colors" />
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="p-6 h-full">
                {selectedPO ? (
                  <PurchaseOrderDetail
                    po={selectedPO}
                    onUpdate={handlePOUpdate}
                    onClose={() => setSelectedPO(null)}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-md p-4 radar-grid-background">
                    Select a Purchase Order from the left panel to view details and manage arrival.
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default ProcurementPage;
