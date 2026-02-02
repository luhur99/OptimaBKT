import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Skeleton } from "@/components/ui/skeleton";
import { SuperAdminDashboard } from "@/components/dashboard/SuperAdminDashboard";
import { SalesDivDashboard } from "@/components/dashboard/SalesDivDashboard";
import { OperasionalDivDashboard } from "@/components/dashboard/OperasionalDivDashboard";
import { TechnicianDashboard } from "@/components/dashboard/TechnicianDashboard";
import { AccountingDashboard } from "@/components/dashboard/AccountingDashboard";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useProfile } from "@/hooks/use-profile"; // Import useProfile

const DashboardPage = () => {
  const { session, isLoading: isAuthLoading } = useAuthSession();
  const { data: profile, isLoading: isProfileLoading, error: profileError } = useProfile(); // Use useProfile
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthLoading && !isProfileLoading) { // Wait for both auth and profile to load
      if (!session) {
        navigate("/"); // Redirect to home if not logged in
      }
    }
  }, [isAuthLoading, isProfileLoading, session, navigate]); // Add isProfileLoading to dependencies

  useEffect(() => {
    if (profileError) {
      console.error("DashboardPage: Profile fetch error:", profileError);
      // Optionally show a toast here, but the layout might already handle it
      navigate('/login', { replace: true }); // Redirect to login on profile error
    }
  }, [profileError, navigate]);

  if (isAuthLoading || isProfileLoading) { // Check both auth and profile loading
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10 space-y-6">
          <Skeleton className="h-10 w-3/4 bg-gray-700" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-[120px] w-full bg-gray-700" />
            <Skeleton className="h-[120px] w-full bg-gray-700" />
            <Skeleton className="h-[120px] w-full bg-gray-700" />
          </div>
          <Skeleton className="h-[150px] w-full bg-gray-700" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session || !profile) { // Ensure both session and profile are available
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen text-gray-400">
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
          <div className="text-center p-8 rounded-lg glassmorphism border border-gray-700 shadow-lg">
            <h2 className="text-2xl font-semibold text-neon-cyan">
              Akun Anda sedang diverifikasi admin.
            </h2>
            <p className="text-gray-400 mt-2">
              Mohon tunggu hingga admin mengaktifkan akun Anda.
            </p>
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6 text-neon-cyan">
        Selamat Datang, {profile.full_name}! Anda login sebagai <span className="text-electric-violet">{profile.role}</span>.
      </h1>
      {renderDashboardContent()}
    </DashboardLayout>
  );
};

export default DashboardPage;