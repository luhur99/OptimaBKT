import { useDashboardMetrics } from "@/hooks/use-dashboard-metrics";
import { OperationalCalendar } from "./shared/OperationalCalendar";
import { MetricAlertList } from "./shared/MetricAlertList";
import { Wrench, CheckCircle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuthSession } from "@/hooks/auth-session";

export function TechnicianDashboard() {
  const { profile } = useAuthSession();
  const { deliveryOrders, isLoading } = useDashboardMetrics();

  // Filter DOs for this specific technician
  const mySchedules = (deliveryOrders.data || []).filter((do_item: any) =>
    do_item.technician_id === profile?.id
  );

  const activeTasksCount = mySchedules.filter((do_item: any) => do_item.status === "in_progress").length;

  const techEvents = mySchedules.map((do_item: any) => ({
    id: do_item.id,
    date: do_item.delivery_date,
    time: do_item.delivery_time,
    title: `${do_item.do_number} - ${do_item.customer_name || "N/A"}`,
    type: "DO" as const,
    status: do_item.status,
    technician_id: do_item.technician_id,
    technician_name: do_item.technician_name,
  }));

  const taskAlerts = mySchedules.slice(0, 5).map((do_item: any) => ({
    id: do_item.id,
    title: do_item.do_number,
    subtitle: `${do_item.delivery_date} ${do_item.delivery_time || ""}`,
    status: do_item.status,
    statusColor: do_item.status === 'in_progress' ? 'bg-purple-500/20 text-purple-500' : 'bg-green-500/20 text-green-500',
    link: `/operasional/delivery-orders`, // Update route as per actual path
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-neon-cyan/5 border border-neon-cyan/20 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Tugas Aktif Anda</h3>
            <Wrench className="h-4 w-4 text-neon-cyan" />
          </div>
          <p className="text-4xl font-black text-neon-cyan">{activeTasksCount}</p>
          <p className="text-xs text-gray-500 mt-2 uppercase tracking-widest font-bold">
            Work Orders dalam pengerjaan
          </p>
        </div>

        <div className="bg-electric-violet/5 border border-electric-violet/20 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-electric-violet mb-1">Update Progress</h3>
            <p className="text-sm text-gray-400">Catat penyelesaian tugas Anda hari ini.</p>
          </div>
          <Button asChild className="bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow transition-all duration-300">
            <Link to="/operasional/delivery-orders">
              <CheckCircle className="mr-2 h-5 w-5" /> UPDATE STATUS
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OperationalCalendar
          title="Jadwal Kerja Anda"
          events={techEvents}
          type="TECH"
        />
        <MetricAlertList
          title="Daftar Work Order"
          icon={ClipboardList}
          items={taskAlerts}
          isLoading={isLoading}
          emptyMessage="Tidak ada tugas terjadwal"
          viewAllLink="/operasional/delivery-orders"
        />
      </div>
    </div>
  );
}
