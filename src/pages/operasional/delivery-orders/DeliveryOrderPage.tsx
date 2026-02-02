import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import DashboardLayout from "@/layouts/DashboardLayout";
import { DeliveryOrderTable } from "@/components/operasional/delivery-orders/DeliveryOrderTable";
import { createDeliveryOrderColumns, DeliveryOrder } from "@/components/operasional/delivery-orders/delivery-order-columns";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import DeliveryOrderDetail from "@/components/operasional/delivery-orders/DeliveryOrderDetail"; // Import new detail component

const DeliveryOrderPage = () => {
  const { session, profile, isLoading: isAuthLoading } = useAuthSession();
  const navigate = useNavigate();
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [selectedDO, setSelectedDO] = useState<DeliveryOrder | null>(null);

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
        items_json,
        profiles (full_name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching delivery orders:", error);
      showError("Failed to load delivery orders: " + error.message);
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
      fetchDeliveryOrders();
    }
  }, [isAuthLoading, session, profile, navigate]);

  const handleDOUpdate = () => {
    fetchDeliveryOrders(); // Re-fetch all DOs to update the list
    // No need to clear selectedDO, as fetchDeliveryOrders will update the object if it's still in the list
  };

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

  if (!session) {
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

      <ResizablePanelGroup direction="horizontal" className="min-h-[700px] rounded-lg glassmorphism border border-neon-cyan/30">
        <ResizablePanel defaultSize={50} minSize={30}>
          <ScrollArea className="h-full p-4">
            <h2 className="text-xl font-semibold mb-4 text-neon-cyan">All Delivery Orders</h2>
            {deliveryOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-md p-4 radar-grid-background">
                <p>No delivery orders found. Initiating scan...</p>
              </div>
            ) : (
              <DeliveryOrderTable columns={columns} data={deliveryOrders} onRowClick={setSelectedDO} />
            )}
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-gray-700 hover:bg-neon-cyan transition-colors" />
        <ResizablePanel defaultSize={50} minSize={30}>
          <ScrollArea className="h-full p-6">
            {selectedDO ? (
              <DeliveryOrderDetail
                order={selectedDO}
                onUpdate={handleDOUpdate}
                onClose={() => setSelectedDO(null)}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-md p-4 radar-grid-background">
                Select a Delivery Order from the left panel to view details and manage its status.
              </div>
            )}
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </DashboardLayout>
  );
};

export default DeliveryOrderPage;