import { useDashboardMetrics } from "@/hooks/use-dashboard-metrics";
import { MetricAlertList } from "./shared/MetricAlertList";
import { Receipt, Package } from "lucide-react";
import { format } from "date-fns";

export function AccountingDashboard() {
  const { pendingInvoices, lowStockProducts, isLoading } = useDashboardMetrics();

  const invoiceAlerts = (pendingInvoices.data || []).map((inv: any) => ({
    id: inv.id,
    title: inv.invoice_number || "Draft Invoice",
    subtitle: inv.invoice_date ? format(new Date(inv.invoice_date), "dd MMM yyyy") : "No date",
    value: new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(inv.total_amount || 0),
    status: "PENDING",
    statusColor: "bg-yellow-500/20 text-yellow-500",
    link: `/operasional/billing-list`,
  }));

  const stockAlerts = (lowStockProducts.data || []).map((p: any) => ({
    id: p.id,
    title: p.nama_barang,
    subtitle: `STOK: ${p.stok_sekarang}`,
    value: `Limit: ${p.safe_stock_limit}`,
    status: "LOW",
    statusColor: "bg-red-500/20 text-red-500",
    link: `/operasional/products`,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricAlertList
          title="Tagihan Pending (Belum Bayar)"
          icon={Receipt}
          items={invoiceAlerts}
          isLoading={isLoading}
          emptyMessage="Tidak ada tagihan pending"
          viewAllLink="/operasional/billing-list"
        />
        <MetricAlertList
          title="Peringatan Stok Gudang"
          icon={Package}
          items={stockAlerts}
          isLoading={isLoading}
          emptyMessage="Semua stok aman"
          viewAllLink="/operasional/products"
        />
      </div>
    </div>
  );
}
