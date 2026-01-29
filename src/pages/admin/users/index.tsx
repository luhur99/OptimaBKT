import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";
import { supabase } from "@/integrations/supabase/client";
import { StaffUser, columns } from "@/components/users/user-columns";
import { UserTable } from "@/components/users/user-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddStaffForm } from "@/components/users/add-staff-form";
import { showSuccess, showError } from "@/utils/toast";

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
        navigate("/"); // Redirect to home if not SUPER_ADMIN
        showError("You do not have permission to access this page.");
        // Note: User requested redirect to /dashboard, but since it doesn't exist, redirecting to /
        return;
      }
      fetchStaffUsers();
    }
  }, [isLoading, session, profile, navigate]);

  if (isLoading || !session || profile?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading or unauthorized...
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Dialog open={isAddStaffDialogOpen} onOpenChange={setIsAddStaffDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add New Staff</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Staff</DialogTitle>
              <DialogDescription>
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
  );
};

export default UserManagementPage;