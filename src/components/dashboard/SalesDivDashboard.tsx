import { useDashboardMetrics } from "@/hooks/use-dashboard-metrics";
import { OperationalCalendar } from "./shared/OperationalCalendar";
import { MetricAlertList } from "./shared/MetricAlertList";
import { TrendingUp, PlusCircle, LayoutDashboard, CalendarDays, PackageMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";

export function SalesDivDashboard() {
  const { profile } = useAuthSession();
  const { schedulingRequests, deliveryOrders, lowStockProducts, isLoading } = useDashboardMetrics();

  // Filter requests for the current salesperson or show all if permitted
  const myRequests = (schedulingRequests.data || []).filter((sr: any) =>
    sr.sales_id === profile?.id || profile?.role === "SUPER_ADMIN"
  );

  const newBookingsCount = myRequests.filter((sr: any) => sr.status === "pending").length;

  const srEvents = myRequests.map((sr: any) => ({
    id: sr.id,
    date: sr.requested_date,
    time: sr.requested_time,
    title: `${sr.sr_number} - ${sr.customer_name}`,
    type: "SR" as const,
    status: sr.status,
  }));

  const techEvents = (deliveryOrders.data || []).map((do_item: any) => ({
    id: do_item.id,
    date: do_item.delivery_date,
    time: do_item.delivery_time,
    title: `${do_item.do_number} - ${do_item.customer_name || "N/A"}`,
    type: "DO" as const,
    status: do_item.status,
    technician_id: do_item.technician_id,
    technician_name: do_item.technician_name,
  }));

  const stockAlerts = (lowStockProducts.data || []).map((p: any) => ({
    id: p.id,
    title: p.nama_barang,
    value: `${p.stok_sekarang}/${p.safe_stock_limit}`,
    status: "LOW",
    statusColor: "bg-red-500/20 text-red-500",
    link: `/operasional/products`,
  }));

  const bookingAlerts = myRequests.slice(0, 5).map((sr: any) => ({
    id: sr.id,
    title: sr.customer_name,
    subtitle: sr.sr_number,
    status: sr.status,
    statusColor: sr.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/20 text-blue-500',
    link: `/sales/scheduling`, // Update route as per actual path
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-neon-cyan/5 border border-neon-cyan/20 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Booking Baru Anda</h3>
            <div className="bg-neon-cyan/20 p-2 rounded-lg">
              <TrendingUp className="h-4 w-4 text-neon-cyan" />
            </div>
          </div>
          <p className="text-4xl font-black text-neon-cyan">{newBookingsCount}</p>
          <p className="text-xs text-gray-500 mt-2 uppercase tracking-widest font-bold">
            Menunggu Persetujuan
          </p>
        </div>

        <div className="lg:col-span-2 bg-electric-violet/5 border border-electric-violet/20 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-electric-violet mb-1">Aksi Cepat</h3>
            <p className="text-sm text-gray-400">Buat permintaan penjadwalan baru untuk pelanggan.</p>
          </div>
          <Button asChild className="bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow transition-all duration-300">
            <Link to="/sales/scheduling">
              <PlusCircle className="mr-2 h-5 w-5" /> PENJADWALAN BARU
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OperationalCalendar
          title="Status Penjadwalan Anda"
          events={srEvents}
          type="SR"
        />
        <OperationalCalendar
          title="Jadwal Teknisi (Global)"
          events={techEvents}
          type="TECH"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricAlertList
          title="Update Penjadwalan Terkini"
          icon={CalendarDays}
          items={bookingAlerts}
          isLoading={isLoading}
          emptyMessage="Belum ada data penjadwalan"
          viewAllLink="/sales/scheduling"
        />
        <MetricAlertList
          title="Peringatan Stok Barang"
          icon={PackageMinus}
          items={stockAlerts}
          isLoading={isLoading}
          emptyMessage="Semua stok aman"
          viewAllLink="/operasional/products"
        />
      </div>
    </div>
  );
}

