import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Skeleton } from "@/components/ui/skeleton";
import { showSuccess, showError } from "@/utils/toast";
import DashboardLayout from "@/layouts/DashboardLayout";
import { CreateSchedulingRequestForm } from "@/components/sales/scheduling/CreateSchedulingRequestForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, UserPlus } from "lucide-react"; // Import UserPlus icon
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuickAddCustomerSupplierForm } from "@/components/shared/QuickAddCustomerSupplierForm"; // Import new form

const SalesSchedulingPage = () => {
  const { session, profile, isLoading: isAuthLoading } = useAuthSession();
  const navigate = useNavigate();
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [isQuickAddCustomerDialogOpen, setIsQuickAddCustomerDialogOpen] = useState(false);

  useEffect(() => {
    if (!isAuthLoading) {
      if (!session) {
        navigate("/"); // Redirect to home if not logged in
        return;
      }
    }
  }, [isAuthLoading, session, profile, navigate]);

  const handleRequestCreated = () => {
    showSuccess("Scheduling request created successfully!");
    setIsFormSubmitted(true);
    // Optionally, navigate to a confirmation page or clear the form
    // For now, we'll just reset the form state
    setTimeout(() => setIsFormSubmitted(false), 100); // Reset after a short delay
  };

  const handleCustomerAdded = () => {
    // No direct action needed here, as the CreateSchedulingRequestForm will refetch customers on mount
    // or the user can re-open the combobox to see the new customer.
    setIsQuickAddCustomerDialogOpen(false);
  };

  if (isAuthLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10 space-y-6">
          <Skeleton className="h-10 w-1/2 bg-gray-700" />
          <Skeleton className="h-[500px] w-full bg-gray-800" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-neon-cyan">Create New Scheduling Request</h1>
        <Dialog open={isQuickAddCustomerDialogOpen} onOpenChange={setIsQuickAddCustomerDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-neon-cyan text-deep-charcoal hover:bg-neon-cyan/80 neon-glow-hover transition-all duration-300">
              <UserPlus className="mr-2 h-4 w-4" /> Quick Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] glassmorphism border border-neon-cyan/30">
            <DialogHeader>
              <DialogTitle className="text-neon-cyan">Quick Add Customer</DialogTitle>
              <DialogDescription className="text-gray-400">
                Quickly add a new customer.
              </DialogDescription>
            </DialogHeader>
            <QuickAddCustomerSupplierForm
              defaultType="customer"
              onQuickAddSuccess={handleCustomerAdded}
              onClose={() => setIsQuickAddCustomerDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      <Card className="glassmorphism border border-electric-violet/30">
        <CardHeader>
          <CardTitle className="text-electric-violet">Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateSchedulingRequestForm onFormSubmit={handleRequestCreated} key={isFormSubmitted ? 'submitted' : 'new'} />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default SalesSchedulingPage;