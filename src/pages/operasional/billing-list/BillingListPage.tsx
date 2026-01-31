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
import { createBillingListColumns, Invoice } from "@/components/operasional/billing-list/billing-list-columns";
import BillingListDetail from "@/components/operasional/billing-list/BillingListDetail";

const BillingListPage = () => {
  const { session, profile, isLoading: isAuthLoading } = useAuthSession();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    setIsLoadingInvoices(true);
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
        document_url,
        profiles!user_id (full_name)
      `)
      .eq("invoice_status", "issued") // Filter for issued invoices
      .order("invoice_date", { ascending: false });

    if (error) {
      console.error("Error fetching invoices:", error);
      showError("Failed to load invoices: " + error.message);
    } else {
      const formattedData: Invoice[] = data.map((inv: any) => ({
        ...inv,
        user_full_name: inv.profiles?.full_name || "System",
        payment_status: inv.payment_status as Invoice['payment_status'],
        invoice_status: inv.invoice_status as Invoice['invoice_status'],
      }));
      setInvoices(formattedData);
    }
    setIsLoadingInvoices(false);
  };

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
      fetchInvoices();
    }
  }, [isAuthLoading, session, profile, navigate]);

  const handleInvoiceUpdate = () => {
    fetchInvoices(); // Re-fetch all invoices to update the list
    // If selectedInvoice is still in the list, its details will be updated by fetchInvoiceDetails in BillingListDetail
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
            {invoices.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-md p-4 radar-grid-background">
                <p>No issued invoices found. Scanning...</p>
              </div>
            ) : (
              <BillingListTable columns={columns} data={invoices} onRowClick={setSelectedInvoice} />
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