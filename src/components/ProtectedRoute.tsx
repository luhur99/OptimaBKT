"use client";

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthSession } from '@/hooks/use-auth-session';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthLayout } from '@/layouts/AuthLayout';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { session, isLoading } = useAuthSession();

  if (isLoading) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center text-gray-400">
          <Skeleton className="h-8 w-64 bg-gray-700" />
        </div>
      </AuthLayout>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;