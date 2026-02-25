import { useMemo } from "react";
import { useDashboardMetrics } from "@/hooks/use-dashboard-metrics";
import { OperationalCalendar } from "./shared/OperationalCalendar";
import { MetricAlertList } from "./shared/MetricAlertList";
import { CalendarDays, PackageMinus, Receipt, LayoutDashboard } from "lucide-react";
import { format } from "date-fns";

export function OperasionalDivDashboard() {
  const {
    schedulingRequests,
    deliveryOrders,
    lowStockProducts,
    pendingInvoices,
    isLoading
  } = useDashboardMetrics();

  const srEvents = useMemo(() => (schedulingRequests.data || []).map((sr: any) => ({
    id: sr.id,
    date: sr.requested_date,
    time: sr.requested_time,
    title: `${sr.sr_number} - ${sr.customer_name}`,
    type: "SR" as const,
    status: sr.status,
    full_address: sr.full_address,
    request_type: sr.type,
  })), [schedulingRequests.data]);

  const techEvents = useMemo(() => (deliveryOrders.data || []).map((do_item: any) => ({
    id: do_item.id,
    date: do_item.delivery_date,
    time: do_item.delivery_time,
    title: `${do_item.do_number} - ${do_item.customer_name || do_item.scheduling_requests?.customer_name || "N/A"}`,
    type: "DO" as const,
    status: do_item.status,
    technician_id: do_item.technician_id,
    technician_name: do_item.technician_name,
    requested_time: do_item.sr_requested_time,
    full_address: do_item.sr_full_address,
    request_type: do_item.sr_request_type,
  })), [deliveryOrders.data]);

  const stockAlerts = useMemo(() => (lowStockProducts.data || []).map((p: any) => ({
    id: p.id,
    title: p.nama_barang,
    subtitle: `Kode: ${p.kode_barang}`,
    value: `${p.stok_sekarang}/${p.safe_stock_limit}`,
    status: "LOW STOCK",
    statusColor: "bg-red-500/20 text-red-500",
    link: `/operasional/products`,
  })), [lowStockProducts.data]);

  const invoiceAlerts = useMemo(() => (pendingInvoices.data || []).map((inv: any) => ({
    id: inv.id,
    title: inv.invoice_number || "Draft Invoice",
    subtitle: inv.invoice_date ? format(new Date(inv.invoice_date), "dd MMM yyyy") : "No date",
    value: new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(inv.total_amount || 0),
    status: "PENDING",
    statusColor: "bg-yellow-500/20 text-yellow-500",
    link: `/operasional/billing-list`,
  })), [pendingInvoices.data]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OperationalCalendar
          title="Kalender Scheduling Request"
          events={srEvents}
          type="SR"
        />
        <OperationalCalendar
          title="Jadwal Teknisi (DO)"
          events={techEvents}
          type="TECH"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricAlertList
          title="Barang Stok Rendah"
          icon={PackageMinus}
          items={stockAlerts}
          isLoading={isLoading}
          emptyMessage="Semua stok aman"
          viewAllLink="/operasional/products"
        />
        <MetricAlertList
          title="Invoice Pending (Belum Bayar)"
          icon={Receipt}
          items={invoiceAlerts}
          isLoading={isLoading}
          emptyMessage="Tidak ada invoice pending"
          viewAllLink="/operasional/billing-list"
        />
      </div>
    </div>
  );
}
