import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Skeleton } from "@/components/ui/skeleton";
import { showSuccess, showError } from "@/utils/toast";
import DashboardLayout from "@/layouts/DashboardLayout";
import { CreateSchedulingRequestForm } from "@/components/sales/scheduling/CreateSchedulingRequestForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SalesSchedulingPage = () => {
  const { session, profile, isLoading: isAuthLoading } = useAuthSession();
  const navigate = useNavigate();
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);

  useEffect(() => {
    if (!isAuthLoading) {
      if (!session) {
        navigate("/"); // Redirect to home if not logged in
        return;
      }
      if (profile?.role !== "SALES_DIV" && profile?.role !== "SUPER_ADMIN") {
        navigate("/dashboard"); // Redirect if not Sales Div or Super Admin
        showError("You do not have permission to access this page.");
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

  if (!session || (profile?.role !== "SALES_DIV" && profile?.role !== "SUPER_ADMIN")) {
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
      <h1 className="text-3xl font-bold mb-6 text-neon-cyan">Create New Scheduling Request</h1>
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