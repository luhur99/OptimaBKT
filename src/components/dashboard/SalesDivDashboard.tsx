import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { TrendingUp, Target, PlusCircle } from "lucide-react";

export function SalesDivDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New Bookings</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">12</div> {/* Placeholder data */}
          <p className="text-xs text-muted-foreground">
            +3 from last week
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sales Target</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">75%</div> {/* Placeholder data */}
          <p className="text-xs text-muted-foreground">
            Rp 75.000.000 / Rp 100.000.000
          </p>
        </CardContent>
      </Card>
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/sales/input-order">
              <PlusCircle className="mr-2 h-4 w-4" /> Input New Order
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}