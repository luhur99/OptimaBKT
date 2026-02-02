import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export type StaffUser = {
  id: string;
  full_name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'OPERASIONAL_DIV' | 'SALES_DIV' | 'TECHNICIAN' | 'ACCOUNTING' | 'USER';
  created_at: string;
};

export const columns: ColumnDef<StaffUser>[] = [
  {
    accessorKey: "full_name",
    header: "Full Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("role") as StaffUser["role"];
      let variant: "default" | "secondary" | "destructive" | "outline" = "default";
      switch (role) {
        case "SUPER_ADMIN":
          variant = "destructive";
          break;
        case "OPERASIONAL_DIV":
          variant = "secondary";
          break;
        case "SALES_DIV":
          variant = "default";
          break;
        case "TECHNICIAN":
          variant = "outline";
          break;
        case "ACCOUNTING":
          variant = "default";
          break;
        case "USER":
          variant = "secondary";
          break;
      }
      return <Badge variant={variant}>{role}</Badge>;
    },
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return format(date, "PPP");
    },
  },
];
