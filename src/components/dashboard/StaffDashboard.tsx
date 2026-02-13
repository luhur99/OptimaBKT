import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Clock, CheckCircle, XCircle, PlusCircle } from "lucide-react";
import { showError } from "@/utils/toast";

interface UrCounts {
  pending: number;
  approved: number;
  rejected: number;
}

export const StaffDashboard = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<UrCounts>({ pending: 0, approved: 0, rejected: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchCounts = async () => {
      const { data, error } = await supabase
        .from("utility_requests")
        .select("status");

      if (!mounted) return;
      if (error) {
        showError("Gagal memuat data utility request.");
      } else {
        const result: UrCounts = { pending: 0, approved: 0, rejected: 0 };
        (data || []).forEach((row: { status: string }) => {
          if (row.status === "pending") result.pending++;
          else if (row.status === "approved") result.approved++;
          else if (row.status === "rejected") result.rejected++;
        });
        setCounts(result);
      }
      setIsLoading(false);
    };
    fetchCounts();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      {/* Utility Request Status Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-neon-cyan" /> Status Utility Request Saya
        </h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="glassmorphism border border-yellow-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-400" /> Menunggu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-300">
                {isLoading ? "—" : counts.pending}
              </p>
              <p className="text-xs text-gray-500 mt-1">Belum diproses</p>
            </CardContent>
          </Card>

          <Card className="glassmorphism border border-green-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" /> Disetujui
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-300">
                {isLoading ? "—" : counts.approved}
              </p>
              <p className="text-xs text-gray-500 mt-1">Diproses & disetujui</p>
            </CardContent>
          </Card>

          <Card className="glassmorphism border border-red-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" /> Ditolak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-300">
                {isLoading ? "—" : counts.rejected}
              </p>
              <p className="text-xs text-gray-500 mt-1">Tidak disetujui</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Action Card */}
      <div>
        <h2 className="text-lg font-semibold text-gray-300 mb-3">Aksi Cepat</h2>
        <Card className="glassmorphism border border-electric-violet/30">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-white">Buat Utility Request</p>
                <p className="text-sm text-gray-400 mt-1">
                  Ajukan permintaan pembelian kebutuhan operasional atau kantor.
                </p>
              </div>
              <Button
                onClick={() => navigate("/operasional/procurement")}
                className="bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300 shrink-0"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Buat Sekarang
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View All Link */}
      <div className="text-right">
        <Button
          variant="ghost"
          onClick={() => navigate("/operasional/utility-requests")}
          className="text-neon-cyan hover:text-neon-cyan/80 text-sm"
        >
          Lihat semua utility request saya →
        </Button>
      </div>
    </div>
  );
};
