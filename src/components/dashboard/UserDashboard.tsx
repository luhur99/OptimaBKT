import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ClipboardList, Loader2, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/auth-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UserDashboard() {
  const { profile } = useAuthSession();

  const { data: utilityRequests = [], isLoading } = useQuery({
    queryKey: ["user-utility-requests", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("utility_requests")
        .select("id, status")
        .eq("user_id", profile?.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  const pendingCount = utilityRequests.filter((ur: any) => ur.status === "pending").length;
  const approvedCount = utilityRequests.filter((ur: any) => ur.status === "approved").length;
  const rejectedCount = utilityRequests.filter((ur: any) => ur.status === "rejected").length;
  const totalCount = utilityRequests.length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glassmorphism border border-neon-cyan/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Status Utility Request</CardTitle>
            <ClipboardList className="h-4 w-4 text-neon-cyan" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-neon-cyan">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold text-neon-cyan">{totalCount}</div>
                <p className="text-xs text-gray-400">Total request yang Anda buat</p>
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-gray-400">
                  <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-2 text-center">
                    <p className="text-yellow-300 text-sm font-semibold">{pendingCount}</p>
                    <p>Pending</p>
                  </div>
                  <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-2 text-center">
                    <p className="text-green-300 text-sm font-semibold">{approvedCount}</p>
                    <p>Approved</p>
                  </div>
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-center">
                    <p className="text-red-300 text-sm font-semibold">{rejectedCount}</p>
                    <p>Rejected</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glassmorphism border border-electric-violet/30 flex items-center">
          <CardContent className="flex w-full items-center justify-between p-6">
            <div>
              <h3 className="text-xl font-bold text-electric-violet mb-1">Aksi Cepat</h3>
              <p className="text-sm text-gray-400">Buat pembelian utility baru sekarang.</p>
            </div>
            <Button asChild className="bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow transition-all duration-300">
              <Link to="/operasional/procurement">
                <PlusCircle className="mr-2 h-5 w-5" /> PEMBELIAN UTILITY
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
