import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, PackageMinus } from "lucide-react";

export function OperasionalDivDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Technician Schedule Today</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">5 Active Tasks</div> {/* Placeholder data */}
          <p className="text-xs text-muted-foreground">
            2 pending, 3 in progress
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Low Warehouse Stock</CardTitle>
          <PackageMinus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">3 Items</div> {/* Placeholder data */}
          <p className="text-xs text-muted-foreground">
            Action required for replenishment
          </p>
        </CardContent>
      </Card>
    </div>
  );
}