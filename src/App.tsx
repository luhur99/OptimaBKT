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
import { AuthSessionProvider } from "@/hooks/use-auth-session";
import ProtectedRoute from "@/components/shared/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthSessionProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operasional/scheduling"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV"]}>
                  <OperasionalSchedulingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales/scheduling"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "SALES_DIV", "OPERASIONAL_DIV"]}>
                  <SalesSchedulingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operasional/procurement"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV"]}>
                  <ProcurementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operasional/purchase-requests"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV"]}>
                  <PurchaseRequestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operasional/billing-review"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV", "ACCOUNTING"]}>
                  <BillingReviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operasional/billing-list"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV", "ACCOUNTING"]}>
                  <BillingListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operasional/stock-movement"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV"]}>
                  <StockMovementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operasional/products"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV"]}>
                  <ProductCatalogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operasional/inventory-dashboard"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV"]}>
                  <InventoryDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operasional/delivery-orders"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV", "TECHNICIAN"]}>
                  <DeliveryOrderPage />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter >
      </AuthSessionProvider>
    </TooltipProvider >
  </QueryClientProvider >
);

export default App;