import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useDashboardMetrics = () => {
    // 1. Fetch Scheduling Requests (for SR Calendar)
    const schedulingRequests = useQuery({
        queryKey: ["dashboard-sr-requests"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("scheduling_requests")
                .select("id, sr_number, status, requested_date, requested_time, customer_name, technician_name, assigned_technician_id");
            if (error) throw error;
            return data;
        },
    });

    // 2. Fetch Delivery Orders (for Technician Calendar & Collision Detection)
    const deliveryOrders = useQuery({
        queryKey: ["dashboard-do-schedules"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("delivery_orders")
                .select(`
          id, 
          do_number, 
          delivery_date, 
          delivery_time, 
          status,
          scheduling_requests (
            assigned_technician_id,
            technician_name
          )
        `)
                .not("status", "eq", "cancelled");
            if (error) throw error;
            return data.map((do_item: any) => ({
                ...do_item,
                technician_id: do_item.scheduling_requests?.assigned_technician_id,
                technician_name: do_item.scheduling_requests?.technician_name,
            }));
        },
    });

    // 3. Fetch Pending Purchase Requests
    const pendingPurchaseRequests = useQuery({
        queryKey: ["dashboard-pending-prs"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("purchase_requests")
                .select("id, pr_number, item_name, quantity, status, created_at")
                .eq("status", "pending");
            if (error) throw error;
            return data;
        },
    });

    // 4. Fetch Low Stock Products
    const lowStockProducts = useQuery({
        queryKey: ["dashboard-low-stock"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("products")
                .select("id, kode_barang, nama_barang, stok_sekarang, safe_stock_limit")
                .lt("stok_sekarang", supabase.rpc('safe_stock_limit_ref', {})); // This might need adjustment if safe_stock_limit is a column

            // Fallback: fetch all and filter client-side if RPC or complex query fails
            const { data: allProducts, error: allErr } = await supabase
                .from("products")
                .select("id, kode_barang, nama_barang, stok_sekarang, safe_stock_limit");

            if (allErr) throw allErr;
            return allProducts.filter(p => p.stok_sekarang < (p.safe_stock_limit || 0));
        },
    });

    // 5. Fetch Pending Invoices
    const pendingInvoices = useQuery({
        queryKey: ["dashboard-pending-invoices"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("invoices")
                .select("id, invoice_number, total_amount, invoice_status, invoice_date")
                .eq("invoice_status", "PENDING");
            if (error) throw error;
            return data;
        },
    });

    return {
        schedulingRequests,
        deliveryOrders,
        pendingPurchaseRequests,
        lowStockProducts,
        pendingInvoices,
        isLoading:
            schedulingRequests.isLoading ||
            deliveryOrders.isLoading ||
            pendingPurchaseRequests.isLoading ||
            lowStockProducts.isLoading ||
            pendingInvoices.isLoading,
    };
};
