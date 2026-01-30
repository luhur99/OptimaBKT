import React from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useAuthSession } from '@/hooks/use-auth-session';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';

const MasterDataSalesInvoicesPage: React.FC = () => {
  const { profile, isLoading: isAuthLoading, session } = useAuthSession();
  const navigate = useNavigate();

  if (isAuthLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10 space-y-6">
          <Skeleton className="h-10 w-1/2 bg-gray-700" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full bg-gray-700" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session || (profile?.role !== "SALES_DIV" && profile?.role !== "SUPER_ADMIN" && profile?.role !== "ACCOUNTING")) {
    showError("You do not have permission to access this page.");
    navigate("/dashboard");
    return null;
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6 text-neon-cyan">Master Data Sales Invoices</h1>
      <p className="text-gray-300">This page will display and manage sales invoice data.</p>
      {/* You can start adding your table and other components here */}
    </DashboardLayout>
  );
};

export default MasterDataSalesInvoicesPage;