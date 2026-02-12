import React, { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/auth-session";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const { session, profile, isLoading } = useAuthSession();
    const location = useLocation();
    const navigate = useNavigate();
    const [hasShownProfileError, setHasShownProfileError] = useState(false);

    useEffect(() => {
        if (!allowedRoles || isLoading || !session || profile || hasShownProfileError) {
            return;
        }

        showError("Profile data is unavailable. Please try again or contact an administrator.");
        setHasShownProfileError(true);
    }, [allowedRoles, isLoading, session, profile, hasShownProfileError]);

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

    if (allowedRoles) {
        if (!profile) {
            return (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center text-gray-400 space-y-3">
                        <div>
                            <p className="text-lg font-semibold">Access blocked</p>
                            <p className="text-sm">Profile data is unavailable. Please try again or contact an administrator.</p>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <Button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="bg-electric-violet text-white hover:bg-electric-violet/80"
                            >
                                Retry
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={async () => {
                                    const { error } = await supabase.auth.signOut();
                                    if (error) {
                                        showError("Failed to log out: " + error.message);
                                        return;
                                    }
                                    navigate("/login", { replace: true });
                                }}
                            >
                                Logout
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (!allowedRoles.includes(profile.role)) {
            // If user is authenticated but doesn't have the required role, redirect to dashboard
            return <Navigate to="/dashboard" replace />;
        }
    }

    return <>{children}</>;
};

export default ProtectedRoute;
