import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const UserManagementPage = lazy(() => import("./pages/admin/users/UserManagementPage"));
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));
const OperasionalSchedulingPage = lazy(
  () => import("./pages/operasional/scheduling/OperasionalSchedulingPage")
);
const BillingReviewPage = lazy(
  () => import("./pages/operasional/billing-review/BillingReviewPage")
);
const StockMovementPage = lazy(
  () => import("./pages/operasional/stock-movement/StockMovementPage")
);
const ProductCatalogPage = lazy(
  () => import("./pages/operasional/products/ProductCatalogPage")
);
const SalesSchedulingPage = lazy(
  () => import("./pages/sales/scheduling/SalesSchedulingPage")
);
const InventoryDashboardPage = lazy(
  () => import("./pages/operasional/inventory-dashboard/InventoryDashboardPage")
);
const ProcurementPage = lazy(
  () => import("./pages/operasional/procurement/ProcurementPage")
);
const DeliveryOrderPage = lazy(
  () => import("./pages/operasional/delivery-orders/DeliveryOrderPage")
);
const PurchaseRequestPage = lazy(
  () => import("./pages/operasional/procurement/PurchaseRequestPage")
);
const BillingListPage = lazy(
  () => import("./pages/operasional/billing-list/BillingListPage")
);
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SupabaseTestPage = lazy(() => import("./pages/SupabaseTestPage"));
import { AuthSessionProvider } from "@/hooks/auth-session";
import ProtectedRoute from "@/components/shared/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthSessionProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-deep-charcoal text-foreground">
                Loading...
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/supabase-test" element={<SupabaseTestPage />} />

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
          </Suspense>
        </BrowserRouter>
      </AuthSessionProvider>
    </TooltipProvider >
  </QueryClientProvider >
);

export default App;
