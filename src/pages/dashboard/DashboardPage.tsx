import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Skeleton } from "@/components/ui/skeleton";
import { SuperAdminDashboard } from "@/components/dashboard/SuperAdminDashboard";
import { SalesDivDashboard } from "@/components/dashboard/SalesDivDashboard";
import { OperasionalDivDashboard } from "@/components/dashboard/OperasionalDivDashboard";
import { TechnicianDashboard } from "@/components/dashboard/TechnicianDashboard";
import { AccountingDashboard } from "@/components/dashboard/AccountingDashboard";
import DashboardLayout from "@/layouts/DashboardLayout"; // Import the new layout

const DashboardPage = () => {
  const { session, profile, isLoading } = useAuthSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !session) {
      navigate("/"); // Redirect to home if not logged in
    }
  }, [isLoading, session, navigate]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10 space-y-6">
          <Skeleton className="h-10 w-3/4" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-[120px] w-full" />
          </div>
          <Skeleton className="h-[150px] w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session || !profile) {
    // This case should ideally be handled by the useEffect redirect,
    // but as a fallback, we can show a message or redirect again.
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          Redirecting...
        </div>
      </DashboardLayout>
    );
  }

  const renderDashboardContent = () => {
    switch (profile.role) {
      case "SUPER_ADMIN":
        return <SuperAdminDashboard />;
      case "SALES_DIV":
        return <SalesDivDashboard />;
      case "OPERASIONAL_DIV":
        return <OperasionalDivDashboard />;
      case "TECHNICIAN":
        return <TechnicianDashboard />;
      case "ACCOUNTING":
        return <AccountingDashboard />;
      case "USER":
      default:
        return (
          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-800">
              Akun Anda sedang diverifikasi admin.
            </h2>
            <p className="text-gray-600 mt-2">
              Mohon tunggu hingga admin mengaktifkan akun Anda.
            </p>
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">
        Selamat Datang, {profile.full_name}! Anda login sebagai {profile.role}.
      </h1>
      {renderDashboardContent()}
    </DashboardLayout>
  );
};

export default DashboardPage;