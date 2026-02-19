import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, DollarSign, HardHat, Loader2, ShoppingCart, PackageMinus, Receipt, CalendarDays } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useDashboardMetrics } from "@/hooks/use-dashboard-metrics";
import { MetricAlertList } from "./shared/MetricAlertList";
import { OperationalCalendar } from "./shared/OperationalCalendar";

export function SuperAdminDashboard() {
  const {
    schedulingRequests,
    deliveryOrders,
    pendingPurchaseRequests,
    lowStockProducts,
    pendingInvoices,
    isLoading: isLoadingMetrics
  } = useDashboardMetrics();

  const { data: staffCount, isLoading: isLoadingStaff } = useQuery({
    queryKey: ["staff-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: todayRevenue, isLoading: isLoadingRevenue } = useQuery({
    queryKey: ["today-revenue"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("invoices")
        .select("total_amount")
        .eq("invoice_date", today);
      if (error) throw error;
      return data.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    },
  });

  const srEvents = useMemo(() => (schedulingRequests.data || []).map((sr: any) => ({
    id: sr.id,
    date: sr.requested_date,
    time: sr.requested_time,
    title: `${sr.sr_number} - ${sr.customer_name}`,
    type: "SR" as const,
    status: sr.status,
  })), [schedulingRequests.data]);

  const techEvents = useMemo(() => (deliveryOrders.data || []).map((do_item: any) => ({
    id: do_item.id,
    date: do_item.delivery_date,
    time: do_item.delivery_time,
    title: `${do_item.do_number} - ${do_item.customer_name || "N/A"}`,
    type: "DO" as const,
    status: do_item.status,
    technician_id: do_item.technician_id,
    technician_name: do_item.technician_name,
  })), [deliveryOrders.data]);

  const prAlerts = useMemo(() => (pendingPurchaseRequests.data || []).map((pr: any) => ({
    id: pr.id,
    title: pr.item_name,
    subtitle: `${pr.pr_number} - ${pr.quantity} unit - Oleh: ${pr.profiles?.full_name || "Unknown"}`,
    status: pr.status,
    statusColor: "bg-yellow-500/20 text-yellow-500",
    link: `/operasional/procurement`,
  })), [pendingPurchaseRequests.data]);

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="glassmorphism border border-neon-cyan/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-neon-cyan" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neon-cyan">
              {isLoadingStaff ? <Loader2 className="h-4 w-4 animate-spin" /> : staffCount}
            </div>
            <p className="text-xs text-gray-400">
              Staff aktif di sistem
            </p>
          </CardContent>
        </Card>
        <Card className="glassmorphism border border-neon-cyan/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Transaksi Hari Ini</CardTitle>
            <DollarSign className="h-4 w-4 text-neon-cyan" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neon-cyan">
              {isLoadingRevenue ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(todayRevenue || 0)
              )}
            </div>
            <p className="text-xs text-gray-400">
              Total nilai invoice hari ini
            </p>
          </CardContent>
        </Card>
        <Card className="glassmorphism border border-neon-cyan/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Status Sistem</CardTitle>
            <HardHat className="h-4 w-4 text-neon-cyan" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Operasional</div>
            <p className="text-xs text-gray-400">
              Semua layanan berjalan normal
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OperationalCalendar
          title="Global Scheduling Request"
          events={srEvents}
          type="SR"
        />
        <OperationalCalendar
          title="Global Technician Schedule (DO)"
          events={techEvents}
          type="TECH"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MetricAlertList
          title="Purchase Request Pending"
          icon={ShoppingCart}
          items={prAlerts}
          isLoading={isLoadingMetrics}
          emptyMessage="Tidak ada PR yang menunggu persetujuan"
          viewAllLink="/operasional/procurement"
        />
        <MetricAlertList
          title="Gudang Stok Rendah"
          icon={PackageMinus}
          items={stockAlerts}
          isLoading={isLoadingMetrics}
          emptyMessage="Semua stok aman"
          viewAllLink="/operasional/products"
        />
        <MetricAlertList
          title="Invoice Belum Lunas"
          icon={Receipt}
          items={invoiceAlerts}
          isLoading={isLoadingMetrics}
          emptyMessage="Tidak ada invoice pending"
          viewAllLink="/operasional/billing-list"
        />
      </div>

      <Card className="glassmorphism border border-electric-violet/30">
        <CardHeader>
          <CardTitle className="text-lg text-electric-violet uppercase tracking-tighter">Tindakan Cepat</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild className="bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300">
            <Link to="/admin/users">Kelola Pengguna</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

