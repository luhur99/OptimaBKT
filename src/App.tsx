import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import UserManagementPage from "./pages/admin/users/UserManagementPage"; // Updated import path
import DashboardPage from "./pages/dashboard/DashboardPage"; // Updated import path
import OperasionalSchedulingPage from "./pages/operasional/scheduling/OperasionalSchedulingPage"; // Updated import path
import BillingReviewPage from "./pages/operasional/billing-review/BillingReviewPage"; // Updated import path
import StockMovementPage from "./pages/operasional/stock-movement/StockMovementPage"; // Updated import path

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin/users" element={<UserManagementPage />} />
          <Route path="/operasional/scheduling" element={<OperasionalSchedulingPage />} />
          <Route path="/operasional/billing-review" element={<BillingReviewPage />} />
          <Route path="/operasional/stock-movement" element={<StockMovementPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;