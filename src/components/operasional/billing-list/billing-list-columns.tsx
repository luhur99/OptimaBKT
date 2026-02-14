import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export type InvoiceDocumentStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'CANCELLED';

export type Invoice = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  customer_name: string;
  company_name?: string;
  total_amount: number;
  subtotal_amount?: number;
  tax_amount?: number;
  with_tax?: boolean;
  payment_status: 'pending' | 'paid' | 'overdue';
  invoice_status: InvoiceDocumentStatus; // Use new enum type
  user_id: string;
  user_full_name: string; // From join
  do_number?: string;
  notes?: string;
  document_url?: string;
  stock_deducted?: boolean;
  updated_at?: string;
  created_at?: string;
};

interface CreateBillingListColumnsOptions {
  onSelectInvoice: (invoice: Invoice) => void;
}

export const createBillingListColumns = ({ onSelectInvoice }: CreateBillingListColumnsOptions): ColumnDef<Invoice>[] => [
  {
    accessorKey: "invoice_number",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-neon-cyan hover:text-neon-cyan/80"
        >
          Invoice Number
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="text-gray-300">{row.getValue("invoice_number")}</div>,
  },
  {
    accessorKey: "customer_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-neon-cyan hover:text-neon-cyan/80"
        >
          Customer Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="text-gray-300">{row.getValue("customer_name")}</div>,
  },
  {
    accessorKey: "invoice_date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-neon-cyan hover:text-neon-cyan/80"
        >
          Invoice Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("invoice_date"));
      return <div className="text-gray-300">{format(date, "PPP")}</div>;
    },
  },
  {
    accessorKey: "total_amount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-neon-cyan hover:text-neon-cyan/80"
        >
          Total Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total_amount"));
      return <div className="font-semibold text-neon-cyan">Rp {amount.toLocaleString("id-ID")}</div>;
    },
  },
  {
    accessorKey: "payment_status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-neon-cyan hover:text-neon-cyan/80"
        >
          Payment Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const status = row.getValue("payment_status") as Invoice["payment_status"];
      let colorClass = "";

      switch (status) {
        case "pending":
          colorClass = "bg-yellow-600/20 text-yellow-300 border border-yellow-500/30";
          break;
        case "paid":
          colorClass = "bg-green-600/20 text-green-300 border border-green-500/30";
          break;
        case "overdue":
          colorClass = "bg-red-600/20 text-red-300 border border-red-500/30";
          break;
        default:
          colorClass = "bg-gray-700/20 text-gray-400 border border-gray-600/30";
          break;
      }
      return <Badge className={colorClass}>{status.replace(/_/g, ' ').toUpperCase()}</Badge>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onSelectInvoice(row.original)}
        className="bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 hover:text-neon-cyan border-neon-cyan/50"
      >
        View Details
      </Button>
    ),
  },
];
