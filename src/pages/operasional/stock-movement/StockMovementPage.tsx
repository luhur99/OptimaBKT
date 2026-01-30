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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { StockMovementForm } from "@/components/operasional/stock-movement/StockMovementForm";
import { StockAdjustmentForm } from "@/components/operasional/stock-movement/StockAdjustmentForm"; // Import new form
import DashboardLayout from "@/layouts/DashboardLayout";

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
  const [activeTab, setActiveTab] = useState<string>("transfer"); // New state for active tab

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
          <Skeleton className="h-10 w-1/2 bg-gray-700" />
          <div className="flex space-x-2">
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
      <h1 className="text-3xl font-bold mb-6 text-neon-cyan">Stock Movement Management</h1>

      <ResizablePanelGroup direction="horizontal" className="min-h-[700px] rounded-lg glassmorphism border border-neon-cyan/30">
        <ResizablePanel defaultSize={50} minSize={30}>
          <ScrollArea className="h-full p-4">
            <h2 className="text-xl font-semibold mb-4 text-neon-cyan">Current Warehouse Inventory</h2>
            {inventory.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-md p-4 radar-grid-background">
                <p>No inventory items found. Initiating scan...</p>
              </div>
            ) : (
              <Table className="text-gray-300">
                <TableHeader className="glassmorphism border-b border-gray-700">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-neon-cyan">Product</TableHead>
                    <TableHead className="text-neon-cyan">Warehouse</TableHead>
                    <TableHead className="text-neon-cyan">Quantity</TableHead>
                    <TableHead className="text-neon-cyan">Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow key={item.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <TableCell>
                        {item.product_name} (<span className="text-gray-500">{item.product_code}</span>)
                      </TableCell>
                      <TableCell className="text-electric-violet">{item.warehouse_category}</TableCell>
                      <TableCell className="font-bold text-neon-cyan">{item.quantity}</TableCell>
                      <TableCell className="text-gray-500">{new Date(item.updated_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-gray-700 hover:bg-neon-cyan transition-colors" />
        <ResizablePanel defaultSize={50} minSize={30}>
          <ScrollArea className="h-full p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="bg-midnight-blue border border-gray-700">
                <TabsTrigger value="transfer" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Stock Transfer</TabsTrigger>
                <TabsTrigger value="adjustment" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Stock Adjustment</TabsTrigger>
              </TabsList>
              <TabsContent value="transfer" className="mt-4">
                <Card className="glassmorphism border border-electric-violet/30">
                  <CardHeader>
                    <CardTitle className="text-electric-violet">Move Stock Between Warehouses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StockMovementForm onMoveSuccess={fetchInventory} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="adjustment" className="mt-4">
                <Card className="glassmorphism border border-electric-violet/30">
                  <CardHeader>
                    <CardTitle className="text-electric-violet">Adjust Stock Quantity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StockAdjustmentForm onAdjustmentSuccess={fetchInventory} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </DashboardLayout>
  );
};

export default StockMovementPage;