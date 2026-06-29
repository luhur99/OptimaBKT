import React, { useEffect, useMemo, useState } from "react";
import { StaffUser, columns, createUserColumns } from "@/components/admin/users/user-columns";
import { supabase } from "@/integrations/supabase/client";
import { UserTable } from "@/components/admin/users/user-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddStaffForm } from "@/components/admin/users/add-staff-form";
import { showError, showSuccess } from "@/utils/toast";
import DashboardLayout from "@/layouts/DashboardLayout";
import { TableToolbar } from "@/components/shared/TableToolbar";
import { DatePreset, buildExportColumns, exportToCsv, filterRows, getDateRange } from "@/utils/table-tools";
import { Loader2 } from "lucide-react";

const VALID_ROLES: StaffUser["role"][] = [
  "SUPER_ADMIN",
  "OPERASIONAL_DIV",
  "SALES_DIV",
  "TECHNICIAN",
  "ACCOUNTING",
  "STAFF",
  "USER",
];

const UserManagementPage = () => {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isAddStaffDialogOpen, setIsAddStaffDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("custom");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Change Role dialog state
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [pendingRole, setPendingRole] = useState<StaffUser["role"] | "">("");
  const [isSavingRole, setIsSavingRole] = useState(false);

  const fetchStaffUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at");

    if (error) {
      showError("Failed to load staff users.");
    } else {
      setStaffUsers(data as StaffUser[]);
    }
  };

  useEffect(() => {
    fetchStaffUsers();
  }, []);

  const handleOpenChangeRole = (user: StaffUser) => {
    setSelectedUser(user);
    setPendingRole(user.role);
  };

  const handleSaveRole = async () => {
    if (!selectedUser || !pendingRole || pendingRole === selectedUser.role) return;
    setIsSavingRole(true);

    const { error } = await supabase.rpc("change_user_role", {
      target_user_id: selectedUser.id,
      new_role: pendingRole,
    });

    setIsSavingRole(false);

    if (error) {
      showError("Failed to change role: " + error.message);
      return;
    }

    const targetUser = selectedUser;
    showSuccess(`Role updated to ${pendingRole} for ${targetUser.full_name}.`);
    setStaffUsers(prev =>
      prev.map(u => u.id === targetUser.id ? { ...u, role: pendingRole as StaffUser["role"] } : u)
    );
    setSelectedUser(null);
    fetchStaffUsers();
  };

  const tableColumns = useMemo(
    () => createUserColumns({ onChangeRole: handleOpenChangeRole }),
    []
  );

  const dateRange = useMemo(
    () => getDateRange(datePreset, startDate, endDate),
    [datePreset, startDate, endDate]
  );

  const filteredUsers = useMemo(
    () =>
      filterRows(
        staffUsers,
        searchValue,
        dateRange,
        (row) => (row.created_at ? new Date(row.created_at) : null)
      ),
    [staffUsers, searchValue, dateRange]
  );

  const exportColumns = useMemo(() => buildExportColumns<StaffUser>(columns), []);

  const handleExport = () => {
    exportToCsv("staff-users", exportColumns, filteredUsers);
  };

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

        <div className="mb-4">
          <TableToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            datePreset={datePreset}
            onDatePresetChange={setDatePreset}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onExport={handleExport}
            exportDisabled={filteredUsers.length === 0}
            searchPlaceholder="Cari user..."
          />
        </div>

        <UserTable columns={tableColumns} data={filteredUsers} />
      </div>

      {/* Change Role Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) setSelectedUser(null); }}>
        <DialogContent className="sm:max-w-[400px] glassmorphism border border-electric-violet/30">
          <DialogHeader>
            <DialogTitle className="text-neon-cyan">Change Role</DialogTitle>
            <DialogDescription className="text-gray-400">
              Change role for <span className="text-white font-medium">{selectedUser?.full_name}</span>
              <br />
              <span className="text-xs text-gray-500">{selectedUser?.email}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Select
              value={pendingRole}
              onValueChange={(val) => setPendingRole(val as StaffUser["role"])}
            >
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {VALID_ROLES.map((role) => (
                  <SelectItem key={role} value={role} className="text-white hover:bg-gray-700">
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedUser(null)}
              disabled={isSavingRole}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveRole}
              disabled={isSavingRole || !pendingRole || pendingRole === selectedUser?.role}
              className="bg-electric-violet text-white hover:bg-electric-violet/80"
            >
              {isSavingRole ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default UserManagementPage;
