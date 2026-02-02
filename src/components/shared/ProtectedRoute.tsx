import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthSession } from "@/hooks/auth-session";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const { session, profile, isLoading } = useAuthSession();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="space-y-4 w-full max-w-md px-4">
                    <Skeleton className="h-12 w-full bg-gray-700" />
                    <Skeleton className="h-64 w-full bg-gray-700" />
                </div>
            </div>
        );
    }

    if (!session) {
        // Redirect to login but save the current location to redirect back after login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        // If user is authenticated but doesn't have the required role, redirect to dashboard
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
