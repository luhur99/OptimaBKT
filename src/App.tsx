import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionContextProvider } from "@supabase/auth-ui-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/layouts/AuthLayout";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import ProtectedRoute from "@/components/ProtectedRoute";
import SettingsPage from "@/pages/SettingsPage";
import ProfilePage from "@/pages/ProfilePage";
import SchedulingRequestsPage from "@/pages/scheduling/SchedulingRequestsPage"; // Import the new page

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionContextProvider supabaseClient={supabase}>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Outlet />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              >
                <Route index element={<Index />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="scheduling-requests" element={<SchedulingRequestsPage />} /> {/* Add new route */}
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SessionContextProvider>
    </QueryClientProvider>
  );
}

export default App;