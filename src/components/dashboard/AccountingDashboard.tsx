import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Package } from "lucide-react";

export function AccountingDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">7 Invoices</div> {/* Placeholder data */}
          <p className="text-xs text-muted-foreground">
            Total: Rp 25.000.000
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Rp 120.000.000</div> {/* Placeholder data */}
          <p className="text-xs text-muted-foreground">
            Current stock value
          </p>
        </CardContent>
      </Card>
    </div>
  );
}