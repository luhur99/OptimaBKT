import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";
import { supabase } from "@/integrations/supabase/client";
import { createSchedulingColumns, SchedulingRequest } from "@/components/operasional/scheduling/scheduling-columns";
import { SchedulingTable } from "@/components/operasional/scheduling/SchedulingTable";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { showSuccess, showError } from "@/utils/toast";
import SchedulingRequestDetail from "@/components/operasional/scheduling/SchedulingRequestDetail"; // Diperbaiki: Menggunakan default import
import DashboardLayout from "@/layouts/DashboardLayout";

const OperasionalSchedulingPage = () => {
  const { session, profile, isLoading: isAuthLoading } = useAuthSession();
  const navigate = useNavigate();
  const [schedulingRequests, setSchedulingRequests] = useState<SchedulingRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<SchedulingRequest | null>(null);

  const fetchSchedulingRequests = async () => {
    setIsLoadingRequests(true);
    const { data, error } = await supabase
      .from("scheduling_requests")
      .select(`
        id,
        sr_number,
        customer_name,
        status,
        do_number,
        assigned_technician_id,
        full_address,
        requested_date,
        requested_time,
        contact_person,
        phone_number,
        notes,
        invoice_id,
        invoice_status,
        document_url,
        user_id,
        product_category,
        vehicle_details,
        company_name,
        customer_id,
        sales_id,
        technician_type,
        external_technician_name,
        profiles!assigned_technician_id (full_name)
      `);

    if (error) {
      console.error("Error fetching scheduling requests:", error);
      // Menampilkan pesan error spesifik dari Supabase
      showError(`Failed to load scheduling requests: ${error.message}`);
    } else {
      const formattedData: SchedulingRequest[] = data.map((req: any) => ({
        ...req,
        technician_name: req.profiles?.full_name || null,
      }));
      setSchedulingRequests(formattedData);
    }
    setIsLoadingRequests(false);
  };

  useEffect(() => {
    if (!isAuthLoading) {
      if (!session) {
        navigate("/"); // Redirect to home if not logged in
        return;
      }
      if (profile?.role !== "OPERASIONAL_DIV" && profile?.role !== "SUPER_ADMIN") {
        navigate("/dashboard"); // Redirect if not Operasional Div or Super Admin
        showError("You do not have permission to access this page.");
        return;
      }
      fetchSchedulingRequests();
    }
  }, [isAuthLoading, session, profile, navigate]);

  const handleSelectRequest = (request: SchedulingRequest) => {
    setSelectedRequest(request);
  };

  const handleRequestUpdate = () => {
    fetchSchedulingRequests();
    setSelectedRequest(null); // Clear selection after update to refresh detail view
  };

  const columns = useMemo(() => createSchedulingColumns({
    onSelectRequest: handleSelectRequest,
  }), [schedulingRequests]);

  const filteredRequests = useMemo(() => {
    if (activeTab === "all") {
      return schedulingRequests;
    }
    return schedulingRequests.filter((req) => req.status === activeTab);
  }, [schedulingRequests, activeTab]);

  if (isAuthLoading || isLoadingRequests) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10 space-y-6">
          <Skeleton className="h-10 w-1/2 bg-gray-700" />
          <div className="flex space-x-2">
            <Skeleton className="h-9 w-24 bg-gray-700" />
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

  if (!session || (profile?.role !== "OPERASIONAL_DIV" && profile?.role !== "SUPER_ADMIN")) {
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
      <h1 className="text-3xl font-bold mb-6 text-neon-cyan">Operasional Scheduling Dashboard</h1>

      <ResizablePanelGroup direction="horizontal" className="min-h-[700px] rounded-lg glassmorphism border border-neon-cyan/30">
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="p-4 h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="bg-midnight-blue border border-gray-700">
                <TabsTrigger value="all" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">All</TabsTrigger>
                <TabsTrigger value="pending" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Pending</TabsTrigger>
                <TabsTrigger value="approved" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Approved</TabsTrigger>
                <TabsTrigger value="in_progress" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">On Progress</TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Completed</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <SchedulingTable columns={columns} data={filteredRequests} />
              </TabsContent>
              <TabsContent value="pending" className="mt-4">
                <SchedulingTable columns={columns} data={filteredRequests} />
              </TabsContent>
              <TabsContent value="approved" className="mt-4">
                <SchedulingTable columns={columns} data={filteredRequests} />
              </TabsContent>
              <TabsContent value="in_progress" className="mt-4">
                <SchedulingTable columns={columns} data={filteredRequests} />
              </TabsContent>
              <TabsContent value="completed" className="mt-4">
                <SchedulingTable columns={columns} data={filteredRequests} />
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-gray-700 hover:bg-neon-cyan transition-colors" />
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="p-6 h-full">
            {selectedRequest ? (
              <SchedulingRequestDetail
                request={selectedRequest}
                onUpdate={handleRequestUpdate}
                onClose={() => setSelectedRequest(null)}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-md p-4 radar-grid-background">
                Select a scheduling request from the left panel to view details and manage its status.
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </DashboardLayout>
  );
};

export default OperasionalSchedulingPage;