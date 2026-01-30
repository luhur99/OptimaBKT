import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, PackageMinus } from "lucide-react";

export function OperasionalDivDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="glassmorphism border border-neon-cyan/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">Technician Schedule Today</CardTitle>
          <CalendarDays className="h-4 w-4 text-neon-cyan" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-neon-cyan">5 Active Tasks</div> {/* Placeholder data */}
          <p className="text-xs text-gray-400">
            2 pending, 3 in progress
          </p>
        </CardContent>
      </Card>
      <Card className="glassmorphism border border-neon-cyan/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">Low Warehouse Stock</CardTitle>
          <PackageMinus className="h-4 w-4 text-neon-cyan" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">3 Items</div> {/* Placeholder data */}
          <p className="text-xs text-gray-400">
            Action required for replenishment
          </p>
        </CardContent>
      </Card>
    </div>
  );
}