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
import { StockAdjustmentForm } from "@/components/operasional/stock-movement/StockAdjustmentForm";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge"; // Import Badge for displaying categories

// New type definition for product with its aggregated inventory
type ProductWithInventory = {
  id: string;
  kode_barang: string;
  nama_barang: string;
  satuan?: string;
  harga_beli: number;
  harga_jual: number;
  safe_stock_limit: number;
  stok_sekarang: number; // This is total stock, not per warehouse
  updated_at: string;
  inventories: {
    warehouse_category: string;
    quantity: number;
  }[];
};

const StockMovementPage = () => {
  const { session, profile, isLoading: isAuthLoading } = useAuthSession();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<ProductWithInventory[]>([]); // Changed state type
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("transfer");

  const fetchInventory = async () => {
    setIsLoadingInventory(true);
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select(`
        id,
        kode_barang,
        nama_barang,
        satuan,
        harga_beli,
        harga_jual,
        safe_stock_limit,
        stok_sekarang,
        updated_at,
        warehouse_inventories (warehouse_category, quantity)
      `);

    if (productsError) {
      console.error("Error fetching products with inventory:", productsError);
      showError("Failed to load product inventory.");
    } else {
      const formattedData: ProductWithInventory[] = productsData.map((product: any) => ({
        id: product.id,
        kode_barang: product.kode_barang,
        nama_barang: product.nama_barang,
        satuan: product.satuan,
        harga_beli: product.harga_beli,
        harga_jual: product.harga_jual,
        safe_stock_limit: product.safe_stock_limit,
        stok_sekarang: product.stok_sekarang,
        updated_at: product.updated_at,
        inventories: product.warehouse_inventories || [],
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
                    <TableHead className="text-neon-cyan">Warehouse Inventories</TableHead> {/* Combined header */}
                    <TableHead className="text-neon-cyan">Total Stock</TableHead> {/* New column for total stock */}
                    <TableHead className="text-neon-cyan">Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((product) => (
                    <TableRow key={product.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <TableCell>
                        {product.nama_barang} (<span className="text-gray-500">{product.kode_barang}</span>)
                      </TableCell>
                      <TableCell>
                        {product.inventories.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {product.inventories.map((inv, idx) => (
                              <Badge key={idx} variant="secondary" className="bg-electric-violet/20 text-electric-violet border border-electric-violet/30">
                                {inv.warehouse_category.replace(/_/g, ' ').toUpperCase()}: {inv.quantity} units
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500">No stock in any warehouse</span>
                        )}
                      </TableCell>
                      <TableCell className="font-bold text-neon-cyan">{product.stok_sekarang}</TableCell>
                      <TableCell className="text-gray-500">{new Date(product.updated_at).toLocaleDateString()}</TableCell>
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