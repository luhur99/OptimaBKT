import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthSession } from '@/hooks/use-auth-session';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';

interface PrivateRouteProps {
  allowedRoles: Array<'SUPER_ADMIN' | 'OPERASIONAL_DIV' | 'SALES_DIV' | 'TECHNICIAN' | 'ACCOUNTING' | 'USER' | 'WAREHOUSE_STAFF' | 'PURCHASING_STAFF'>;
  children?: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ allowedRoles, children }) => {
  const { session, profile, isLoading } = useAuthSession();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10 space-y-6">
          <Skeleton className="h-10 w-1/2 bg-gray-700" />
          <Skeleton className="h-[200px] w-full bg-gray-800" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    // Not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    // Logged in but profile not loaded or doesn't exist (should be handled by handle_new_user trigger)
    // For now, redirect to login or a waiting page
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen text-gray-400">
          Loading user profile...
        </div>
      </DashboardLayout>
    );
  }

  if (!allowedRoles.includes(profile.role)) {
    // Logged in but unauthorized role, redirect to dashboard
    showError("You do not have permission to access this page.");
    return <Navigate to="/dashboard" replace />;
  }

  // Authenticated and authorized, render children or Outlet
  return children ? <>{children}</> : <Outlet />;
};

export default PrivateRoute;