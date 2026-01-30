import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { TrendingUp, Target, PlusCircle } from "lucide-react";

export function SalesDivDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="glassmorphism border border-neon-cyan/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">New Bookings</CardTitle>
          <TrendingUp className="h-4 w-4 text-neon-cyan" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-neon-cyan">12</div> {/* Placeholder data */}
          <p className="text-xs text-gray-400">
            +3 from last week
          </p>
        </CardContent>
      </Card>
      <Card className="glassmorphism border border-neon-cyan/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">Sales Target</CardTitle>
          <Target className="h-4 w-4 text-neon-cyan" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-neon-cyan">75%</div> {/* Placeholder data */}
          <p className="text-xs text-gray-400">
            Rp 75.000.000 / Rp 100.000.000
          </p>
        </CardContent>
      </Card>
      <Card className="lg:col-span-3 glassmorphism border border-electric-violet/30">
        <CardHeader>
          <CardTitle className="text-lg text-electric-violet">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild className="bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300">
            <Link to="/sales/input-order">
              <PlusCircle className="mr-2 h-4 w-4" /> Input New Order
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}