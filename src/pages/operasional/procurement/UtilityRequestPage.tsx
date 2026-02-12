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
import { UtilityRequestTable } from "@/components/procurement/UtilityRequestTable";
import { createUtilityRequestColumns, UtilityRequest } from "@/components/procurement/utility-request-columns";
import UtilityRequestDetail from "@/components/procurement/UtilityRequestDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { TableToolbar } from "@/components/shared/TableToolbar";
import { DatePreset, buildExportColumns, exportToCsv, filterRows, getDateRange } from "@/utils/table-tools";

const UtilityRequestPage = () => {
  const { session, profile, isLoading: isAuthLoading } = useAuthSession();
  const navigate = useNavigate();
  const [utilityRequests, setUtilityRequests] = useState<UtilityRequest[]>([]);
  const [isLoadingURs, setIsLoadingURs] = useState(true);
  const [selectedUR, setSelectedUR] = useState<UtilityRequest | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("custom");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchUtilityRequests = async () => {
    setIsLoadingURs(true);
    const { data, error } = await supabase
      .from("utility_requests")
      .select(`
        id,
        ur_number,
        item_name,
        quantity,
        unit_price,
        total_price,
        supplier_name,
        supplier_url,
        status,
        created_at,
        notes,
        profiles!user_id (full_name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching utility requests:", error);
      showError("Failed to load utility requests: " + error.message);
    } else {
      const formattedData: UtilityRequest[] = (data || []).map((ur: any) => ({
        ...ur,
        requested_by_name: ur.profiles?.full_name || "N/A",
        status: ur.status as UtilityRequest["status"],
      }));
      setUtilityRequests(formattedData);
    }
    setIsLoadingURs(false);
  };

  useEffect(() => {
    if (!isAuthLoading) {
      if (!session) {
        navigate("/");
        return;
      }
      if (!["SUPER_ADMIN", "OPERASIONAL_DIV", "SALES_DIV"].includes(profile?.role || "")) {
        navigate("/dashboard");
        showError("You do not have permission to access this page.");
        return;
      }
      fetchUtilityRequests();
    }
  }, [isAuthLoading, session, profile, navigate]);

  const handleURUpdate = () => {
    fetchUtilityRequests();
  };

  const columns = useMemo(() => createUtilityRequestColumns({ onSelectRequest: setSelectedUR }), []);

  const dateRange = useMemo(
    () => getDateRange(datePreset, startDate, endDate),
    [datePreset, startDate, endDate]
  );

  const filteredRequests = useMemo(
    () =>
      filterRows(
        utilityRequests,
        searchValue,
        dateRange,
        (row) => (row.created_at ? new Date(row.created_at) : null)
      ),
    [utilityRequests, searchValue, dateRange]
  );

  const exportColumns = useMemo(() => buildExportColumns<UtilityRequest>(columns), [columns]);

  const handleExport = () => {
    exportToCsv("utility-requests", exportColumns, filteredRequests);
  };

  if (isAuthLoading || isLoadingURs) {
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

  const canManage = ["SUPER_ADMIN", "OPERASIONAL_DIV"].includes(profile?.role || "");

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-neon-cyan">Utility Requests</h1>
      </div>

      <ResizablePanelGroup direction="horizontal" className="min-h-[700px] rounded-lg glassmorphism border border-neon-cyan/30">
        <ResizablePanel defaultSize={50} minSize={30}>
          <ScrollArea className="h-full p-4">
            <h2 className="text-xl font-semibold mb-4 text-neon-cyan">All Utility Requests</h2>
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
                searchPlaceholder="Cari UR..."
              />
            </div>
            {filteredRequests.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-md p-4 radar-grid-background">
                <p>No utility requests found. Initiating scan...</p>
              </div>
            ) : (
              <UtilityRequestTable columns={columns} data={filteredRequests} onRowClick={setSelectedUR} />
            )}
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-gray-700 hover:bg-neon-cyan transition-colors" />
        <ResizablePanel defaultSize={50} minSize={30}>
          <ScrollArea className="h-full p-6">
            {selectedUR ? (
              <UtilityRequestDetail
                request={selectedUR}
                canManage={canManage}
                onUpdate={handleURUpdate}
                onClose={() => setSelectedUR(null)}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-md p-4 radar-grid-background">
                Select a Utility Request from the left panel to view details and manage its status.
              </div>
            )}
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </DashboardLayout>
  );
};

export default UtilityRequestPage;
