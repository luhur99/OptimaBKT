import React, { useEffect } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useAuthSession } from '@/hooks/use-auth-session';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';

const MasterDataSalesInvoicesPage: React.FC = () => {
  const { profile, isLoading: isAuthLoading, session } = useAuthSession();
  const navigate = useNavigate();
  const allowedRoles = ["SUPER_ADMIN", "SALES_DIV"];

  useEffect(() => {
    if (!isAuthLoading && !session) {
      navigate("/login");
      return;
    }
    if (!isAuthLoading && session && profile && !allowedRoles.includes(profile.role)) {
      showError("You do not have permission to access this page.");
      navigate("/dashboard");
    }
  }, [isAuthLoading, session, profile, navigate]);

  if (isAuthLoading || !session || !profile || !allowedRoles.includes(profile.role)) {
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

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6 text-neon-cyan">Master Data Sales Invoices</h1>
      <p className="text-gray-300">This page will manage sales invoices master data.</p>
    </DashboardLayout>
  );
};

export default MasterDataSalesInvoicesPage;