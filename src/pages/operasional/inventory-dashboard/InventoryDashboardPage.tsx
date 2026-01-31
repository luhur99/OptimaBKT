import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
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
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  RadialBarChart,
  RadialBar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { Package, History } from "lucide-react";
import { format } from "date-fns";

// Type definitions
type WarehouseInventorySummary = {
  warehouse_category: string;
  total_quantity: number;
  fill: string; // Color for the radial chart
};

type StockLedgerEntry = {
  id: string;
  event_date: string;
  product_name: string;
  event_type: string;
  quantity: number;
  from_warehouse_category?: string;
  to_warehouse_category?: string;
  user_name: string;
  notes?: string;
};

const COLORS = {
  siap_jual: "#00F2FF", // Neon Cyan
  rusak: "#FF0070", // Pink/Red
  maintenance: "#7000FF", // Electric Violet
  "R&D": "#FFD700", // Gold
  lain_lain: "#808080", // Gray
};

const InventoryDashboardPage = () => {
  const { session, profile, isLoading: isAuthLoading } = useAuthSession();
  const navigate = useNavigate();
  const [inventorySummary, setInventorySummary] = useState<WarehouseInventorySummary[]>([]);
  const [stockLedger, setStockLedger] = useState<StockLedgerEntry[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const fetchInventoryData = async () => {
    setIsLoadingData(true);
    try {
      // Fetch inventory summary for radial chart
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("warehouse_inventories")
        .select("warehouse_category, quantity");

      if (inventoryError) throw new Error(inventoryError.message);

      const summaryMap = new Map<string, number>();
      inventoryData.forEach((item) => {
        summaryMap.set(
          item.warehouse_category,
          (summaryMap.get(item.warehouse_category) || 0) + item.quantity
        );
      });

      const totalOverallQuantity = Array.from(summaryMap.values()).reduce((sum, qty) => sum + qty, 0);

      const formattedSummary: WarehouseInventorySummary[] = Array.from(summaryMap.entries()).map(
        ([category, quantity]) => ({
          warehouse_category: category.replace(/_/g, ' ').toUpperCase(),
          total_quantity: quantity,
          fill: COLORS[category as keyof typeof COLORS] || COLORS.lain_lain,
          percentage: totalOverallQuantity > 0 ? (quantity / totalOverallQuantity) * 100 : 0,
        })
      );
      setInventorySummary(formattedSummary);

      // Fetch stock ledger
      console.log("Fetching stock ledger entries..."); // Log start of fetch
      const { data: ledgerData, error: ledgerError } = await supabase
        .from("stock_ledger")
        .select(`
          id,
          event_date,
          event_type,
          quantity,
          from_warehouse_category,
          to_warehouse_category,
          notes,
          products (nama_barang),
          profiles (full_name)
        `)
        .order("event_date", { ascending: false })
        .limit(50); // Limit to recent 50 entries

      if (ledgerError) {
        console.error("Error fetching stock ledger:", ledgerError); // Log error
        throw new Error(ledgerError.message);
      } else {
        console.log("Stock ledger data received:", ledgerData); // Log successful data
      }

      const formattedLedger: StockLedgerEntry[] = ledgerData.map((entry: any) => ({
        id: entry.id,
        event_date: entry.event_date,
        product_name: entry.products?.nama_barang || "N/A",
        event_type: entry.event_type.replace(/_/g, ' ').toUpperCase(),
        quantity: entry.quantity,
        from_warehouse_category: entry.from_warehouse_category?.replace(/_/g, ' ').toUpperCase() || "-",
        to_warehouse_category: entry.to_warehouse_category?.replace(/_/g, ' ').toUpperCase() || "-",
        user_name: entry.profiles?.full_name || "System",
        notes: entry.notes || "-",
      }));
      setStockLedger(formattedLedger);

    } catch (error: any) {
      console.error("Error fetching inventory data:", error);
      showError("Failed to load inventory data: " + error.message);
    } finally {
      setIsLoadingData(false);
    }
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
      fetchInventoryData();
    }
  }, [isAuthLoading, session, profile, navigate]);

  if (isAuthLoading || isLoadingData) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10 space-y-6">
          <Skeleton className="h-10 w-1/2 bg-gray-700" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[400px] w-full bg-gray-800" />
            <Skeleton className="h-[400px] w-full bg-gray-800" />
          </div>
          <Skeleton className="h-[300px] w-full bg-gray-800" />
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
      <h1 className="text-3xl font-bold mb-6 text-neon-cyan">Inventory Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="glassmorphism border border-neon-cyan/30 p-4 radar-grid-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold text-neon-cyan">Stock Distribution</CardTitle>
            <Package className="h-6 w-6 text-electric-violet" />
          </CardHeader>
          <CardContent className="h-[350px] w-full flex items-center justify-center">
            {inventorySummary.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="10%"
                  outerRadius="80%"
                  barSize={15}
                  data={inventorySummary}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar
                    minAngle={15}
                    label={{ position: "insideStart", fill: "#fff", fontSize: 10 }}
                    background
                    clockWise
                    dataKey="total_quantity"
                  />
                  <Legend
                    iconSize={10}
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    wrapperStyle={{ fontSize: "12px", color: "hsl(var(--foreground))" }}
                    formatter={(value, entry) => (
                      <span style={{ color: entry.color }}>
                        {value} ({entry.payload.percentage.toFixed(1)}%)
                      </span>
                    )}
                  />
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      `${value} units`,
                      props.payload.warehouse_category,
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--midnight-blue))",
                      borderColor: "hsl(var(--neon-cyan)/30)",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500">No inventory data available.</p>
            )}
          </CardContent>
        </Card>

        <Card className="glassmorphism border border-electric-violet/30 p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold text-electric-violet">Overall Stock Summary</CardTitle>
            <History className="h-6 w-6 text-neon-cyan" />
          </CardHeader>
          <CardContent className="space-y-4 text-gray-300">
            {inventorySummary.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {inventorySummary.map((item) => (
                  <div key={item.warehouse_category} className="flex items-center justify-between p-2 rounded-md bg-gray-800/50 border border-gray-700">
                    <span className="text-sm font-medium" style={{ color: item.fill }}>{item.warehouse_category}</span>
                    <span className="text-base font-bold">{item.total_quantity} units</span>
                  </div>
                ))}
                <div className="col-span-2 flex items-center justify-between p-3 rounded-md bg-neon-cyan/20 border border-neon-cyan/50 mt-2 neon-glow">
                  <span className="text-lg font-bold text-neon-cyan">Total Stock</span>
                  <span className="text-xl font-extrabold text-neon-cyan">
                    {inventorySummary.reduce((sum, item) => sum + item.total_quantity, 0)} units
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No summary available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glassmorphism border border-neon-cyan/30 p-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold text-neon-cyan">Stock Movement Ledger</CardTitle>
          <History className="h-6 w-6 text-electric-violet" />
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] rounded-md border border-gray-700">
            {stockLedger.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-md p-4 radar-grid-background">
                <p>No stock movement records found. Initiating scan...</p>
              </div>
            ) : (
              <Table className="text-gray-300">
                <TableHeader className="glassmorphism border-b border-gray-700 sticky top-0 bg-deep-charcoal z-10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-neon-cyan font-mono">Date</TableHead>
                    <TableHead className="text-neon-cyan font-mono">Product</TableHead>
                    <TableHead className="text-neon-cyan font-mono">Event Type</TableHead>
                    <TableHead className="text-neon-cyan font-mono">Qty</TableHead>
                    <TableHead className="text-neon-cyan font-mono">From</TableHead>
                    <TableHead className="text-neon-cyan font-mono">To</TableHead>
                    <TableHead className="text-neon-cyan font-mono">By User</TableHead>
                    <TableHead className="text-neon-cyan font-mono">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockLedger.map((entry) => (
                    <TableRow key={entry.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <TableCell className="font-mono text-xs text-gray-400">{format(new Date(entry.event_date), "yyyy-MM-dd")}</TableCell>
                      <TableCell className="font-mono text-sm text-neon-cyan">{entry.product_name}</TableCell>
                      <TableCell className="font-mono text-sm text-electric-violet">{entry.event_type}</TableCell>
                      <TableCell className="font-mono text-sm font-bold text-neon-cyan">{entry.quantity}</TableCell>
                      <TableCell className="font-mono text-sm text-gray-400">{entry.from_warehouse_category}</TableCell>
                      <TableCell className="font-mono text-sm text-gray-400">{entry.to_warehouse_category}</TableCell>
                      <TableCell className="font-mono text-sm text-gray-400">{entry.user_name}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">{entry.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default InventoryDashboardPage;