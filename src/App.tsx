import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import IndexPage from './pages/Index';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './components/PrivateRoute';
import { Toaster } from './components/ui/toaster';
import OperasionalSchedulingPage from './pages/operasional/scheduling/OperasionalSchedulingPage';
import OperasionalDeliveryOrderPage from './pages/operasional/delivery-orders/OperasionalDeliveryOrderPage';
import OperasionalInvoicesPage from './pages/operasional/invoices/OperasionalInvoicesPage';
import OperasionalSalesDetailsPage from './pages/operasional/sales-details/OperasionalSalesDetailsPage';
import PurchasingPurchaseRequestsPage from './pages/purchasing/purchase-requests/PurchasingPurchaseRequestsPage';
import PurchasingPurchaseOrdersPage from './pages/purchasing/purchase-orders/PurchasingPurchaseOrdersPage';
import WarehouseProductsPage from './pages/warehouse/products/WarehouseProductsPage';
import WarehouseInventoriesPage from './pages/warehouse/inventories/WarehouseInventoriesPage';
import WarehouseStockLedgerPage from './pages/warehouse/stock-ledger/WarehouseStockLedgerPage';
import MasterDataCustomersPage from './pages/master-data/customers/MasterDataCustomersPage';
import MasterDataSuppliersPage from './pages/master-data/suppliers/MasterDataSuppliersPage';
import MasterDataTechniciansPage from './pages/master-data/technicians/MasterDataTechniciansPage';
import MasterDataWarehouseCategoriesPage from './pages/master-data/warehouse-categories/MasterDataWarehouseCategoriesPage';
import MasterDataSalesInvoicesPage from './pages/master-data/sales-invoices/MasterDataSalesInvoicesPage';
import SettingsPage from './pages/SettingsPage';
import DashboardPage from './pages/dashboard/DashboardPage'; // Import DashboardPage
import BillingReviewPage from './pages/operasional/billing-review/BillingReviewPage'; // Import BillingReviewPage
import ProcurementPage from './pages/operasional/procurement/ProcurementPage'; // Import ProcurementPage
import ProductCatalogPage from './pages/operasional/products/ProductCatalogPage'; // Import ProductCatalogPage
import InventoryDashboardPage from './pages/operasional/inventory-dashboard/InventoryDashboardPage'; // Import InventoryDashboardPage
import StockMovementPage from './pages/operasional/stock-movement/StockMovementPage'; // Import StockMovementPage
import UserManagementPage from './pages/admin/users/UserManagementPage'; // Import UserManagementPage

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV", "TECHNICIAN", "SALES_DIV", "WAREHOUSE_STAFF", "PURCHASING_STAFF", "ACCOUNTING", "USER"]}><IndexPage /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV", "TECHNICIAN", "SALES_DIV", "WAREHOUSE_STAFF", "PURCHASING_STAFF", "ACCOUNTING", "USER"]}><DashboardPage /></PrivateRoute>} />
        
        {/* Operasional Routes */}
        <Route path="/operasional/scheduling" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV", "TECHNICIAN"]}><OperasionalSchedulingPage /></PrivateRoute>} />
        <Route path="/operasional/delivery-orders" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV", "WAREHOUSE_STAFF"]}><OperasionalDeliveryOrderPage /></PrivateRoute>} />
        <Route path="/operasional/invoices" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV", "SALES_DIV", "ACCOUNTING"]}><OperasionalInvoicesPage /></PrivateRoute>} />
        <Route path="/operasional/sales-details" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "SALES_DIV"]}><OperasionalSalesDetailsPage /></PrivateRoute>} />
        <Route path="/operasional/billing-review" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV", "ACCOUNTING"]}><BillingReviewPage /></PrivateRoute>} />


        {/* Purchasing Routes */}
        <Route path="/purchasing/purchase-requests" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV", "SALES_DIV"]}><ProcurementPage /></PrivateRoute>} />
        <Route path="/purchasing/purchase-orders" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV"]}><ProcurementPage /></PrivateRoute>} />

        {/* Warehouse Routes */}
        <Route path="/warehouse/products" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV"]}><ProductCatalogPage /></PrivateRoute>} />
        <Route path="/warehouse/inventories" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV"]}><InventoryDashboardPage /></PrivateRoute>} />
        <Route path="/warehouse/stock-movement" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV"]}><StockMovementPage /></PrivateRoute>} />
        <Route path="/warehouse/stock-ledger" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV"]}><WarehouseStockLedgerPage /></PrivateRoute>} />

        {/* Master Data Routes */}
        <Route path="/master-data/customers" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "SALES_DIV", "OPERASIONAL_DIV"]}><MasterDataCustomersPage /></PrivateRoute>} />
        <Route path="/master-data/suppliers" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV"]}><MasterDataSuppliersPage /></PrivateRoute>} />
        <Route path="/master-data/technicians" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV"]}><MasterDataTechniciansPage /></PrivateRoute>} />
        <Route path="/master-data/warehouse-categories" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV"]}><MasterDataWarehouseCategoriesPage /></PrivateRoute>} />
        <Route path="/master-data/sales-invoices" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "SALES_DIV", "ACCOUNTING"]}><MasterDataSalesInvoicesPage /></PrivateRoute>} />

        {/* Admin Routes */}
        <Route path="/admin/users" element={<PrivateRoute allowedRoles={["SUPER_ADMIN"]}><UserManagementPage /></PrivateRoute>} />

        {/* Settings Route */}
        <Route path="/settings" element={<PrivateRoute allowedRoles={["SUPER_ADMIN"]}><SettingsPage /></PrivateRoute>} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;