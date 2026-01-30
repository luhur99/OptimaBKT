import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, DollarSign, HardHat } from "lucide-react";

export function SuperAdminDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="glassmorphism border border-neon-cyan/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">Total Staff</CardTitle>
          <Users className="h-4 w-4 text-neon-cyan" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-neon-cyan">25</div> {/* Placeholder data */}
          <p className="text-xs text-gray-400">
            +10% from last month
          </p>
        </CardContent>
      </Card>
      <Card className="glassmorphism border border-neon-cyan/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">Total Transactions Today</CardTitle>
          <DollarSign className="h-4 w-4 text-neon-cyan" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-neon-cyan">Rp 15.000.000</div> {/* Placeholder data */}
          <p className="text-xs text-gray-400">
            +5% from yesterday
          </p>
        </CardContent>
      </Card>
      <Card className="glassmorphism border border-neon-cyan/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">System Status</CardTitle>
          <HardHat className="h-4 w-4 text-neon-cyan" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">Operational</div> {/* Placeholder data */}
          <p className="text-xs text-gray-400">
            All services running
          </p>
        </CardContent>
      </Card>
      <Card className="lg:col-span-3 glassmorphism border border-electric-violet/30">
        <CardHeader>
          <CardTitle className="text-lg text-electric-violet">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild className="bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300">
            <Link to="/admin/users">Go to User Management</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}