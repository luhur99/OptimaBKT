import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, CheckCircle } from "lucide-react";

export function TechnicianDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Your Active Tasks (Work Orders)</CardTitle>
          <Wrench className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">2 Tasks</div> {/* Placeholder data */}
          <p className="text-xs text-muted-foreground">
            Next task: Installation at Jl. Merdeka No. 10
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Update Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Button>
            <CheckCircle className="mr-2 h-4 w-4" /> Mark Task as Complete
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}