import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";
import { supabase } from "@/integrations/supabase/client";
import { createSchedulingColumns, SchedulingRequest } from "@/components/operasional/scheduling/scheduling-columns";
import { SchedulingTable } from "@/components/operasional/scheduling/SchedulingTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { showSuccess, showError } from "@/utils/toast";
import { ApprovalDialog } from "@/components/operasional/scheduling/ApprovalDialog";
import DashboardLayout from "@/layouts/DashboardLayout";

const OperasionalSchedulingPage = () => {
  const { session, profile, isLoading: isAuthLoading } = useAuthSession();
  const navigate = useNavigate();
  const [schedulingRequests, setSchedulingRequests] = useState<SchedulingRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [selectedRequestToApprove, setSelectedRequestToApprove] = useState<SchedulingRequest | null>(null);

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
        profiles!assigned_technician_id (full_name)
      `);

    if (error) {
      console.error("Error fetching scheduling requests:", error);
      showError("Failed to load scheduling requests.");
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

  const handleApproveClick = (request: SchedulingRequest) => {
    setSelectedRequestToApprove(request);
    setIsApproveDialogOpen(true);
  };

  const handleForceStart = async (requestId: string) => {
    if (!window.confirm("Are you sure you want to force start this request?")) return;
    try {
      const { error } = await supabase
        .from("scheduling_requests")
        .update({ status: "in_progress" })
        .eq("id", requestId);

      if (error) throw new Error(error.message);
      showSuccess("Request status updated to 'In Progress'.");
      fetchSchedulingRequests();
    } catch (error: any) {
      showError(error.message || "Failed to force start request.");
    }
  };

  const handleMarkCompleted = async (requestId: string) => {
    if (!window.confirm("Are you sure you want to mark this request as completed?")) return;
    try {
      const { error } = await supabase
        .from("scheduling_requests")
        .update({ status: "completed" })
        .eq("id", requestId);

      if (error) throw new Error(error.message);
      showSuccess("Request status updated to 'Completed'.");
      fetchSchedulingRequests();
    } catch (error: any) {
      showError(error.message || "Failed to mark request as completed.");
    }
  };

  const columns = useMemo(() => createSchedulingColumns({
    onApproveClick: handleApproveClick,
    onForceStart: handleForceStart,
    onMarkCompleted: handleMarkCompleted,
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
          <Skeleton className="h-[300px] w-full bg-gray-700" />
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="bg-midnight-blue border border-gray-700">
          <TabsTrigger value="all" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">All</TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Pending</TabsTrigger>
          <TabsTrigger value="approved" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Approved</TabsTrigger>
          <TabsTrigger value="in_progress" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">On Progress</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <SchedulingTable columns={columns} data={filteredRequests} />
        </TabsContent>
        <TabsContent value="pending">
          <SchedulingTable columns={columns} data={filteredRequests} />
        </TabsContent>
        <TabsContent value="approved">
          <SchedulingTable columns={columns} data={filteredRequests} />
        </TabsContent>
        <TabsContent value="in_progress">
          <SchedulingTable columns={columns} data={filteredRequests} />
        </TabsContent>
      </Tabs>

      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <ApprovalDialog
          request={selectedRequestToApprove}
          onApproveSuccess={fetchSchedulingRequests}
          onClose={() => setIsApproveDialogOpen(false)}
        />
      </Dialog>
    </DashboardLayout>
  );
};

export default OperasionalSchedulingPage;