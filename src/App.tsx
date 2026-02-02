import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import UserManagementPage from "./pages/admin/users/UserManagementPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import OperasionalSchedulingPage from "./pages/operasional/scheduling/OperasionalSchedulingPage";
import BillingReviewPage from "./pages/operasional/billing-review/BillingReviewPage";
import StockMovementPage from "./pages/operasional/stock-movement/StockMovementPage";
import ProductCatalogPage from "./pages/operasional/products/ProductCatalogPage";
import SalesSchedulingPage from "./pages/sales/scheduling/SalesSchedulingPage";
import InventoryDashboardPage from "./pages/operasional/inventory-dashboard/InventoryDashboardPage";
import ProcurementPage from "./pages/operasional/procurement/ProcurementPage";
import DeliveryOrderPage from "./pages/operasional/delivery-orders/DeliveryOrderPage";
import PurchaseRequestPage from "./pages/operasional/procurement/PurchaseRequestPage";
import BillingListPage from "./pages/operasional/billing-list/BillingListPage";
import LoginPage from "./pages/LoginPage";
import { AuthSessionProvider } from "./components/AuthSessionProvider"; // Import AuthSessionProvider dari lokasi baru

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthSessionProvider> {/* Wrap the entire application with AuthSessionProvider */}
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/operasional/scheduling" element={<OperasionalSchedulingPage />} />
            <Route path="/sales/scheduling" element={<SalesSchedulingPage />} />
            <Route path="/operasional/procurement" element={<ProcurementPage />} />
            <Route path="/operasional/purchase-requests" element={<PurchaseRequestPage />} />
            <Route path="/operasional/billing-review" element={<BillingReviewPage />} />
            <Route path="/operasional/billing-list" element={<BillingListPage />} />
            <Route path="/operasional/stock-movement" element={<StockMovementPage />} />
            <Route path="/operasional/products" element={<ProductCatalogPage />} />
            <Route path="/operasional/inventory-dashboard" element={<InventoryDashboardPage />} />
            <Route path="/operasional/delivery-orders" element={<DeliveryOrderPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthSessionProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;