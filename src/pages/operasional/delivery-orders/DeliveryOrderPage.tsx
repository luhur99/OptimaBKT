import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import DashboardLayout from "@/layouts/DashboardLayout";
import { DeliveryOrderTable, createDeliveryOrderColumns, DeliveryOrder } from "@/components/operasional/delivery-orders/DeliveryOrderTable";
import { Truck } from "lucide-react";

const DeliveryOrderPage = () => {
  const { session, profile, isLoading: isAuthLoading } = useAuthSession();
  const navigate = useNavigate();
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  const fetchDeliveryOrders = async () => {
    setIsLoadingOrders(true);
    const { data, error } = await supabase
      .from("delivery_orders")
      .select(`
        id,
        do_number,
        request_id,
        user_id,
        delivery_date,
        delivery_time,
        status,
        notes,
        created_at,
        profiles (full_name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching delivery orders:", error);
      showError("Failed to load delivery orders.");
    } else {
      const formattedData: DeliveryOrder[] = data.map((order: any) => ({
        ...order,
        user_full_name: order.profiles?.full_name || "System",
      }));
      setDeliveryOrders(formattedData);
    }
    setIsLoadingOrders(false);
  };

  useEffect(() => {
    if (!isAuthLoading) {
      if (!session) {
        navigate("/");
        return;
      }
      if (profile?.role !== "OPERASIONAL_DIV" && profile?.role !== "SUPER_ADMIN") {
        navigate("/dashboard");
        showError("You do not have permission to access this page.");
        return;
      }
      fetchDeliveryOrders();
    }
  }, [isAuthLoading, session, profile, navigate]);

  const columns = useMemo(() => createDeliveryOrderColumns(), []);

  if (isAuthLoading || isLoadingOrders) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10 space-y-6">
          <Skeleton className="h-10 w-1/2 bg-gray-700" />
          <Skeleton className="h-[600px] w-full bg-gray-800" />
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-neon-cyan">Delivery Orders</h1>
        {/* Add any buttons for creating new DOs or other actions here if needed */}
      </div>

      <ScrollArea className="h-[calc(100vh-180px)] pr-4">
        {deliveryOrders.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-md p-4 radar-grid-background">
            <p>No delivery orders found. Initiating scan...</p>
          </div>
        ) : (
          <DeliveryOrderTable columns={columns} data={deliveryOrders} />
        )}
      </ScrollArea>
    </DashboardLayout>
  );
};

export default DeliveryOrderPage;