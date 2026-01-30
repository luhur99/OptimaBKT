import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Package } from "lucide-react";

export function AccountingDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="glassmorphism border border-neon-cyan/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">Overdue Invoices</CardTitle>
          <Receipt className="h-4 w-4 text-neon-cyan" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">7 Invoices</div> {/* Placeholder data */}
          <p className="text-xs text-gray-400">
            Total: Rp 25.000.000
          </p>
        </CardContent>
      </Card>
      <Card className="glassmorphism border border-neon-cyan/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">Inventory Value</CardTitle>
          <Package className="h-4 w-4 text-neon-cyan" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-neon-cyan">Rp 120.000.000</div> {/* Placeholder data */}
          <p className="text-xs text-gray-400">
            Current stock value
          </p>
        </CardContent>
      </Card>
    </div>
  );
}