import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useDashboardMetrics = () => {
    // 1. Fetch Scheduling Requests (for SR Calendar)
    const schedulingRequests = useQuery({
        queryKey: ["dashboard-sr-requests-v2"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("scheduling_requests")
                .select("id, sr_number, status, requested_date, requested_time, customer_name, technician_name, assigned_technician_id, full_address, type, user_id");
            if (error) throw error;
            return data;
        },
    });

    // 2. Fetch Delivery Orders (for Technician Calendar & Collision Detection)
    const deliveryOrders = useQuery({
        queryKey: ["dashboard-do-schedules-v2"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("delivery_orders")
                .select(`
                    id,
                    do_number,
                    delivery_date,
                    delivery_time,
                    status,
                    request_id,
                    scheduling_requests!request_id (
                        status,
                        customer_name,
                        assigned_technician_id,
                        technician_name,
                        full_address,
                        type,
                        requested_time
                    )
                `)
                .not("status", "eq", "cancelled");
            if (error) throw error;
            // Filter client-side: only DOs linked to approved/in_progress/completed SRs
            const activeDOs = data
                .filter((do_item: any) => {
                    const srStatus = do_item.scheduling_requests?.status;
                    return srStatus && ["approved", "in_progress", "completed"].includes(srStatus);
                })
                .map((do_item: any) => {
                    const sr = Array.isArray(do_item.scheduling_requests)
                        ? do_item.scheduling_requests[0]
                        : do_item.scheduling_requests;
                    return {
                        ...do_item,
                        customer_name: sr?.customer_name,
                        technician_id: sr?.assigned_technician_id,
                        technician_name: sr?.technician_name,
                        sr_full_address: sr?.full_address,
                        sr_request_type: sr?.type,
                        sr_requested_time: sr?.requested_time,
                    };
                });
            return activeDOs;
        },
    });

    // 3. Fetch Pending Purchase Requests
    const pendingPurchaseRequests = useQuery({
        queryKey: ["dashboard-pending-prs"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("purchase_requests")
                .select("id, pr_number, status, created_at, profiles!user_id (full_name), po_items (qty_request)")
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
                .select("id, kode_barang, nama_barang, stok_sekarang, safe_stock_limit");

            if (error) throw error;
            return data.filter(p => p.stok_sekarang < (p.safe_stock_limit || 0));
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
