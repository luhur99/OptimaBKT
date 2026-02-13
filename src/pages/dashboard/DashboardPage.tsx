import React from "react";
import { useAuthSession } from "@/hooks/auth-session";
import { Skeleton } from "@/components/ui/skeleton";
import { SuperAdminDashboard } from "@/components/dashboard/SuperAdminDashboard";
import { SalesDivDashboard } from "@/components/dashboard/SalesDivDashboard";
import { OperasionalDivDashboard } from "@/components/dashboard/OperasionalDivDashboard";
import { TechnicianDashboard } from "@/components/dashboard/TechnicianDashboard";
import { AccountingDashboard } from "@/components/dashboard/AccountingDashboard";
import { UserDashboard } from "@/components/dashboard/UserDashboard";
import DashboardLayout from "@/layouts/DashboardLayout";

const DashboardPage = () => {
  const { profile } = useAuthSession();

  if (!profile) {
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
        return <UserDashboard />;
      default:
        return null;
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
