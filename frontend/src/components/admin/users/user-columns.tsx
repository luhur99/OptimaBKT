import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export type StaffUser = {
  id: string;
  full_name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'OPERASIONAL_DIV' | 'SALES_DIV' | 'TECHNICIAN' | 'ACCOUNTING' | 'USER' | 'STAFF';
  created_at: string;
};

const getRoleBadgeVariant = (role: StaffUser["role"]): "default" | "secondary" | "destructive" | "outline" => {
  switch (role) {
    case "SUPER_ADMIN": return "destructive";
    case "OPERASIONAL_DIV": return "secondary";
    case "SALES_DIV": return "default";
    case "TECHNICIAN": return "outline";
    case "ACCOUNTING": return "default";
    case "STAFF": return "outline";
    case "USER": return "secondary";
  }
};

// Base columns used for export (no action buttons)
export const columns: ColumnDef<StaffUser>[] = [
  { accessorKey: "full_name", header: "Full Name" },
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("role") as StaffUser["role"];
      return <Badge variant={getRoleBadgeVariant(role)}>{role}</Badge>;
    },
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => format(new Date(row.getValue("created_at")), "PPP"),
  },
];

// Table columns with Change Role action for SUPER_ADMIN
export function createUserColumns({ onChangeRole }: { onChangeRole: (user: StaffUser) => void }): ColumnDef<StaffUser>[] {
  return [
    ...columns,
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChangeRole(row.original)}
          className="text-xs border-electric-violet/50 text-electric-violet hover:bg-electric-violet/10"
        >
          Change Role
        </Button>
      ),
    },
  ];
}
