import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";
import { supabase } from "@/integrations/supabase/client";
import { StaffUser, columns } from "@/components/admin/users/user-columns";
import { UserTable } from "@/components/admin/users/user-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddStaffForm } from "@/components/admin/users/add-staff-form";
import { showSuccess, showError } from "@/utils/toast";
import DashboardLayout from "@/layouts/DashboardLayout"; // Import DashboardLayout

const UserManagementPage = () => {
  const { session, profile, isLoading } = useAuthSession();
  const navigate = useNavigate();
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isAddStaffDialogOpen, setIsAddStaffDialogOpen] = useState(false);

  const fetchStaffUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at");

    if (error) {
      console.error("Error fetching staff users:", error);
      showError("Failed to load staff users.");
    } else {
      setStaffUsers(data as StaffUser[]);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (!session) {
        navigate("/"); // Redirect to home if not logged in
        return;
      }
      if (profile?.role !== "SUPER_ADMIN") {
        navigate("/dashboard"); // Redirect to dashboard if not SUPER_ADMIN
        showError("You do not have permission to access this page.");
        return;
      }
      fetchStaffUsers();
    }
  }, [isLoading, session, profile, navigate]);

  if (isLoading || !session || profile?.role !== "SUPER_ADMIN") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen text-gray-400">
          Loading or unauthorized...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-neon-cyan">User Management</h1>
          <Dialog open={isAddStaffDialogOpen} onOpenChange={setIsAddStaffDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300">Add New Staff</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] glassmorphism border border-electric-violet/30">
              <DialogHeader>
                <DialogTitle className="text-neon-cyan">Add New Staff</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Fill in the details to create a new staff user.
                </DialogDescription>
              </DialogHeader>
              <AddStaffForm
                onStaffAdded={() => {
                  fetchStaffUsers();
                  setIsAddStaffDialogOpen(false);
                }}
                onClose={() => setIsAddStaffDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
        <UserTable columns={columns} data={staffUsers} />
      </div>
    </DashboardLayout>
  );
};

export default UserManagementPage;