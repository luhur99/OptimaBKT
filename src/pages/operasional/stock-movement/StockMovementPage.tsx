import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { StockMovementForm } from "@/components/operasional/stock-movement/StockMovementForm"; // Updated import path
import DashboardLayout from "@/layouts/DashboardLayout"; // Import the new layout

type WarehouseInventoryItem = {
  id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  warehouse_category: string;
  quantity: number;
  updated_at: string;
};

const StockMovementPage = () => {
  const { session, profile, isLoading: isAuthLoading } = useAuthSession();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<WarehouseInventoryItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);

  const fetchInventory = async () => {
    setIsLoadingInventory(true);
    const { data, error } = await supabase
      .from("warehouse_inventories")
      .select(`
        id,
        product_id,
        warehouse_category,
        quantity,
        updated_at,
        products (nama_barang, kode_barang)
      `);

    if (error) {
      console.error("Error fetching warehouse inventory:", error);
      showError("Failed to load warehouse inventory.");
    } else {
      const formattedData: WarehouseInventoryItem[] = data.map((item: any) => ({
        ...item,
        product_name: item.products?.nama_barang || "N/A",
        product_code: item.products?.kode_barang || "N/A",
      }));
      setInventory(formattedData);
    }
    setIsLoadingInventory(false);
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
      fetchInventory();
    }
  }, [isAuthLoading, session, profile, navigate]);

  if (isAuthLoading || isLoadingInventory) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10 space-y-6">
          <Skeleton className="h-10 w-1/2" />
          <ResizablePanelGroup direction="horizontal" className="min-h-[700px] rounded-lg border">
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full items-center justify-center p-6">
                <Skeleton className="h-full w-full" />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full items-center justify-center p-6">
                <Skeleton className="h-full w-full" />
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
        <div className="flex items-center justify-center min-h-screen">
          Unauthorized access.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Stock Movement Management</h1>

      <ResizablePanelGroup direction="horizontal" className="min-h-[700px] rounded-lg border">
        <ResizablePanel defaultSize={50} minSize={30}>
          <ScrollArea className="h-full p-4">
            <h2 className="text-xl font-semibold mb-4">Current Warehouse Inventory</h2>
            {inventory.length === 0 ? (
              <p className="text-muted-foreground">No inventory items found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.product_name} ({item.product_code})
                      </TableCell>
                      <TableCell>{item.warehouse_category}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{new Date(item.updated_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={30}>
          <ScrollArea className="h-full p-6">
            <h2 className="text-xl font-semibold mb-4">Move Stock</h2>
            <Card>
              <CardHeader>
                <CardTitle>Initiate Stock Transfer</CardTitle>
              </CardHeader>
              <CardContent>
                <StockMovementForm onMoveSuccess={fetchInventory} />
              </CardContent>
            </Card>
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </DashboardLayout>
  );
};

export default StockMovementPage;