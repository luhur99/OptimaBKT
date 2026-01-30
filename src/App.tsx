import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import IndexPage from './pages/Index';
import LoginPage from './pages/Login';
import PrivateRoute from './components/PrivateRoute';
import { Toaster } from './components/ui/toaster';
import OperasionalSchedulingPage from './pages/operasional/scheduling/OperasionalSchedulingPage';
import OperasionalDeliveryOrderPage from './pages/operasional/delivery-orders/OperasionalDeliveryOrderPage'; // Import the new page
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV", "TECHNICIAN", "SALES", "WAREHOUSE_STAFF", "PURCHASING_STAFF"]}><IndexPage /></PrivateRoute>} />
        
        {/* Operasional Routes */}
        <Route path="/operasional/scheduling" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV", "TECHNICIAN"]}><OperasionalSchedulingPage /></PrivateRoute>} />
        <Route path="/operasional/delivery-orders" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV", "WAREHOUSE_STAFF"]}><OperasionalDeliveryOrderPage /></PrivateRoute>} /> {/* New Route */}
        <Route path="/operasional/invoices" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV", "SALES"]}><OperasionalInvoicesPage /></PrivateRoute>} />
        <Route path="/operasional/sales-details" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "SALES"]}><OperasionalSalesDetailsPage /></PrivateRoute>} />

        {/* Purchasing Routes */}
        <Route path="/purchasing/purchase-requests" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "PURCHASING_STAFF"]}><PurchasingPurchaseRequestsPage /></PrivateRoute>} />
        <Route path="/purchasing/purchase-orders" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "PURCHASING_STAFF", "WAREHOUSE_STAFF"]}><PurchasingPurchaseOrdersPage /></PrivateRoute>} />

        {/* Warehouse Routes */}
        <Route path="/warehouse/products" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "WAREHOUSE_STAFF", "PURCHASING_STAFF"]}><WarehouseProductsPage /></PrivateRoute>} />
        <Route path="/warehouse/inventories" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "WAREHOUSE_STAFF"]}><WarehouseInventoriesPage /></PrivateRoute>} />
        <Route path="/warehouse/stock-ledger" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "WAREHOUSE_STAFF"]}><WarehouseStockLedgerPage /></PrivateRoute>} />

        {/* Master Data Routes */}
        <Route path="/master-data/customers" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "SALES", "OPERASIONAL_DIV"]}><MasterDataCustomersPage /></PrivateRoute>} />
        <Route path="/master-data/suppliers" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "PURCHASING_STAFF"]}><MasterDataSuppliersPage /></PrivateRoute>} />
        <Route path="/master-data/technicians" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "OPERASIONAL_DIV"]}><MasterDataTechniciansPage /></PrivateRoute>} />
        <Route path="/master-data/warehouse-categories" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "WAREHOUSE_STAFF"]}><MasterDataWarehouseCategoriesPage /></PrivateRoute>} />
        <Route path="/master-data/sales-invoices" element={<PrivateRoute allowedRoles={["SUPER_ADMIN", "SALES"]}><MasterDataSalesInvoicesPage /></PrivateRoute>} />

        {/* Settings Route */}
        <Route path="/settings" element={<PrivateRoute allowedRoles={["SUPER_ADMIN"]}><SettingsPage /></PrivateRoute>} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;