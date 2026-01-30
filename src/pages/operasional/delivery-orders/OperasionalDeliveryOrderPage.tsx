import React from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useAuthSession } from '@/hooks/use-auth-session';
import { Skeleton } from '@/components/ui/skeleton';

const OperasionalDeliveryOrderPage: React.FC = () => {
  const { profile, isLoading: isAuthLoading } = useAuthSession();

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

  if (!profile || (profile.role !== "OPERASIONAL_DIV" && profile.role !== "SUPER_ADMIN" && profile.role !== "WAREHOUSE_STAFF")) {
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
      <h1 className="text-3xl font-bold mb-6 text-neon-cyan">Delivery Orders</h1>
      <p className="text-gray-300">This page will display a list of all delivery orders.</p>
      {/* You can start adding your table and other components here */}
    </DashboardLayout>
  );
};

export default OperasionalDeliveryOrderPage;