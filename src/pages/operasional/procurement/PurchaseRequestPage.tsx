import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/auth-session";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PurchaseRequestTable } from "@/components/procurement/PurchaseRequestTable";
import { createPurchaseRequestColumns, PurchaseRequest } from "@/components/procurement/purchase-request-columns";
import PurchaseRequestDetail from "@/components/procurement/PurchaseRequestDetail";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton component
import { TableToolbar } from "@/components/shared/TableToolbar";
import { DatePreset, buildExportColumns, exportToCsv, filterRows, getDateRange } from "@/utils/table-tools";

const PurchaseRequestPage = () => {
  const { session, profile, isLoading: isAuthLoading } = useAuthSession();
  const navigate = useNavigate();
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [isLoadingPRs, setIsLoadingPRs] = useState(true);
  const [selectedPR, setSelectedPR] = useState<PurchaseRequest | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("custom");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchPurchaseRequests = async () => {
    setIsLoadingPRs(true);
    const { data, error } = await supabase
      .from("purchase_requests")
      .select(`
        id,
        pr_number,
        item_name,
        item_code,
        quantity,
        unit_price,
        total_price,
        status,
        created_at,
        notes,
        target_warehouse_category,
        profiles!user_id (full_name),
        suppliers (name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching purchase requests:", error);
      showError("Failed to load purchase requests: " + error.message);
    } else {
      const formattedData: PurchaseRequest[] = data.map((pr: any) => ({
        ...pr,
        requested_by_name: pr.profiles?.full_name || "N/A",
        supplier_name: pr.suppliers?.name || "N/A",
      }));
      setPurchaseRequests(formattedData);
    }
    setIsLoadingPRs(false);
  };

  useEffect(() => {
    if (!isAuthLoading) {
      if (!session) {
        navigate("/login");
        return;
      }
      // Allow SUPER_ADMIN, OPERASIONAL_DIV, SALES_DIV to access this page
      if (!["SUPER_ADMIN", "OPERASIONAL_DIV", "SALES_DIV"].includes(profile?.role || "")) {
        navigate("/dashboard");
        showError("You do not have permission to access this page.");
        return;
      }
      fetchPurchaseRequests();
    }
  }, [isAuthLoading, session, profile, navigate]);

  const handlePRUpdate = () => {
    fetchPurchaseRequests(); // Re-fetch all PRs to update the list
    // If selectedPR is still in the list, its details will be updated by fetchRequestDetails in PurchaseRequestDetail
  };

  const columns = useMemo(() => createPurchaseRequestColumns({ onSelectRequest: setSelectedPR }), []);

  const dateRange = useMemo(
    () => getDateRange(datePreset, startDate, endDate),
    [datePreset, startDate, endDate]
  );

  const filteredRequests = useMemo(
    () =>
      filterRows(
        purchaseRequests,
        searchValue,
        dateRange,
        (row) => (row.created_at ? new Date(row.created_at) : null)
      ),
    [purchaseRequests, searchValue, dateRange]
  );

  const exportColumns = useMemo(() => buildExportColumns<PurchaseRequest>(columns), [columns]);

  const handleExport = () => {
    exportToCsv("purchase-requests", exportColumns, filteredRequests);
  };

  if (isAuthLoading || isLoadingPRs) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10 space-y-6">
          <Skeleton className="h-10 w-1/2 bg-gray-700" />
          <Skeleton className="h-[600px] w-full bg-gray-800" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session || !["SUPER_ADMIN", "OPERASIONAL_DIV", "SALES_DIV"].includes(profile?.role || "")) {
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-neon-cyan">Purchase Requests</h1>
        {/* Add any buttons for creating new PRs or other actions here if needed */}
      </div>

      <ResizablePanelGroup direction="horizontal" className="min-h-[700px] rounded-lg glassmorphism border border-neon-cyan/30">
        <ResizablePanel defaultSize={50} minSize={30}>
          <ScrollArea className="h-full p-4">
            <h2 className="text-xl font-semibold mb-4 text-neon-cyan">All Purchase Requests</h2>
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
                exportDisabled={filteredRequests.length === 0}
                searchPlaceholder="Cari PR..."
              />
            </div>
            {filteredRequests.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-md p-4 radar-grid-background">
                <p>No purchase requests found. Initiating scan...</p>
              </div>
            ) : (
              <PurchaseRequestTable columns={columns} data={filteredRequests} onRowClick={setSelectedPR} />
            )}
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-gray-700 hover:bg-neon-cyan transition-colors" />
        <ResizablePanel defaultSize={50} minSize={30}>
          <ScrollArea className="h-full p-6">
            {selectedPR ? (
              <PurchaseRequestDetail
                request={selectedPR}
                canManage={["SUPER_ADMIN", "OPERASIONAL_DIV"].includes(profile?.role || "")}
                onUpdate={handlePRUpdate}
                onClose={() => setSelectedPR(null)}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-md p-4 radar-grid-background">
                Select a Purchase Request from the left panel to view details and manage its status.
              </div>
            )}
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </DashboardLayout>
  );
};

export default PurchaseRequestPage;
