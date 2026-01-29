import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import UserManagementPage from "./pages/admin/users";
import DashboardPage from "./pages/dashboard/page";
import OperasionalSchedulingPage from "./pages/operasional/scheduling";
import BillingReviewPage from "./pages/operasional/billing-review";
import StockMovementPage from "./pages/operasional/stock-movement"; // Import the new Stock Movement page

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
          <Route path="/operasional/stock-movement" element={<StockMovementPage />} /> {/* New Stock Movement route */}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;