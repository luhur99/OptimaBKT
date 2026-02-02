import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import DashboardLayout from "@/layouts/DashboardLayout";
import { BillingListTable } from "@/components/operasional/billing-list/BillingListTable";
import { createBillingListColumns, Invoice, InvoiceDocumentStatus } from "@/components/operasional/billing-list/billing-list-columns";
import BillingListDetail from "@/components/operasional/billing-list/BillingListDetail";
import { useQuery } from "@tanstack/react-query"; // Import useQuery

const BillingListPage = () => {
  const { session, profile, isLoading: isAuthLoading } = useAuthSession();
  const navigate = useNavigate();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Refactor fetchInvoices to use useQuery
  const { data: invoices, isLoading: isLoadingInvoices, error: invoicesError, refetch: refetchInvoices } = useQuery<Invoice[]>({
    queryKey: ["invoices", session?.user?.id, profile?.role], // Query key includes user ID and role
    queryFn: async () => {
      if (!session?.user?.id || !profile?.role) {
        return []; // Return empty array if not authenticated or role is missing
      }

      console.log("BillingListPage: fetchInvoices called via useQuery.");
      const { data, error } = await supabase
        .from("invoices")
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
          document_url
        `)
        .in("invoice_status", ["PENDING", "PAID"])
        .order("invoice_date", { ascending: false });

      if (error) {
        console.error("Error fetching invoices:", error);
        throw new Error("Failed to load invoices: " + error.message); // Throw error for react-query to catch
      }

      // Fetch profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name");

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        // Don't throw, just log and proceed without full_name if profiles fail
      }

      const profileMap = new Map(profilesData?.map(p => [p.id, p.full_name]));

      const formattedData: Invoice[] = data.map((inv: any) => ({
        ...inv,
        user_full_name: profileMap.get(inv.user_id) || "System",
        payment_status: inv.payment_status as Invoice['payment_status'],
        invoice_status: inv.invoice_status as InvoiceDocumentStatus,
      }));
      return formattedData;
    },
    enabled: !isAuthLoading && !!session && ["SUPER_ADMIN", "OPERASIONAL_DIV", "ACCOUNTING"].includes(profile?.role || ""), // Only run query if authenticated and authorized
    // Removed staleTime and refetchOnWindowFocus to rely on global defaults
  });

  useEffect(() => {
    if (!isAuthLoading) {
      if (!session) {
        navigate("/");
        return;
      }
      if (!["SUPER_ADMIN", "OPERASIONAL_DIV", "ACCOUNTING"].includes(profile?.role || "")) {
        navigate("/dashboard");
        showError("You do not have permission to access this page.");
        return;
      }
      // No need to call fetchInvoices here, useQuery handles it based on 'enabled'
    }
  }, [isAuthLoading, session, profile, navigate]);

  useEffect(() => {
    if (invoicesError) {
      showError(invoicesError.message);
    }
  }, [invoicesError]);

  const handleInvoiceUpdate = () => {
    refetchInvoices(); // Use refetch from useQuery
    // No need to clear selectedInvoice, as refetch will update the object if it's still in the list
  };

  const columns = useMemo(() => createBillingListColumns({ onSelectInvoice: setSelectedInvoice }), []);

  if (isAuthLoading || isLoadingInvoices) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10 space-y-6">
          <Skeleton className="h-10 w-1/2 bg-gray-700" />
          <Skeleton className="h-[600px] w-full bg-gray-800" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session || !["SUPER_ADMIN", "OPERASIONAL_DIV", "ACCOUNTING"].includes(profile?.role || "")) {
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
        <h1 className="text-3xl font-bold text-neon-cyan">Billing List</h1>
        {/* Add any buttons for other actions here if needed */}
      </div>

      <ResizablePanelGroup direction="horizontal" className="min-h-[700px] rounded-lg glassmorphism border border-neon-cyan/30">
        <ResizablePanel defaultSize={50} minSize={30}>
          <ScrollArea className="h-full p-4">
            <h2 className="text-xl font-semibold mb-4 text-neon-cyan">Issued Invoices</h2>
            {(invoices?.length || 0) === 0 ? ( // Use invoices?.length
              <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-md p-4 radar-grid-background">
                <p>No issued invoices found. Scanning...</p>
              </div>
            ) : (
              <BillingListTable columns={columns} data={invoices || []} onRowClick={setSelectedInvoice} />
            )}
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-gray-700 hover:bg-neon-cyan transition-colors" />
        <ResizablePanel defaultSize={50} minSize={30}>
          <ScrollArea className="h-full p-6">
            {selectedInvoice ? (
              <BillingListDetail
                invoice={selectedInvoice}
                onUpdate={handleInvoiceUpdate}
                onClose={() => setSelectedInvoice(null)}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-md p-4 radar-grid-background">
                Select an Invoice from the left panel to view details and manage its payment status.
              </div>
            )}
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </DashboardLayout>
  );
};

export default BillingListPage;