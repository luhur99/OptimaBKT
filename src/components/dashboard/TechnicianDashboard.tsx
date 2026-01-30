import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, CheckCircle } from "lucide-react";

export function TechnicianDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="glassmorphism border border-neon-cyan/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">Your Active Tasks (Work Orders)</CardTitle>
          <Wrench className="h-4 w-4 text-neon-cyan" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-neon-cyan">2 Tasks</div> {/* Placeholder data */}
          <p className="text-xs text-gray-400">
            Next task: Installation at Jl. Merdeka No. 10
          </p>
        </CardContent>
      </Card>
      <Card className="glassmorphism border border-electric-violet/30">
        <CardHeader>
          <CardTitle className="text-lg text-electric-violet">Update Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300">
            <CheckCircle className="mr-2 h-4 w-4" /> Mark Task as Complete
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}