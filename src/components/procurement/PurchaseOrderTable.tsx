import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export type PurchaseOrder = {
  id: string;
  po_number: string;
  supplier_name: string; // From join
  status: 'PR_PENDING' | 'WAITING_RECEIVED' | 'RECEIVED' | 'CLOSED';
  total_biaya: number;
  created_at: string;
  requested_by_name: string; // From join
};

interface PurchaseOrderTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick: (po: TData) => void;
}

export function PurchaseOrderTable<TData extends PurchaseOrder, TValue>({
  columns,
  data,
  onRowClick,
}: PurchaseOrderTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border border-gray-700">
      <Table>
        <TableHeader className="glassmorphism border-b border-gray-700">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id} className="text-neon-cyan">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                onClick={() => onRowClick(row.original)}
                className="cursor-pointer border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="text-gray-300">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-gray-500">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export const createPurchaseOrderColumns = (): ColumnDef<PurchaseOrder>[] => [
  {
    accessorKey: "po_number",
    header: "PO Number",
  },
  {
    accessorKey: "supplier_name",
    header: "Supplier",
  },
  {
    accessorKey: "requested_by_name",
    header: "Requested By",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as PurchaseOrder["status"];
      let colorClass = "";

      switch (status) {
        case "PR_PENDING":
          colorClass = "bg-yellow-600/20 text-yellow-300 border border-yellow-500/30";
          break;
        case "WAITING_RECEIVED":
          colorClass = "bg-blue-600/20 text-blue-300 border border-blue-500/30";
          break;
        case "RECEIVED":
          colorClass = "bg-purple-600/20 text-purple-300 border border-purple-500/30";
          break;
        case "CLOSED":
          colorClass = "bg-green-600/20 text-green-300 border border-green-500/30";
          break;
        default:
          colorClass = "bg-gray-700/20 text-gray-400 border border-gray-600/30";
          break;
      }
      return <Badge className={colorClass}>{status.replace(/_/g, ' ').toUpperCase()}</Badge>;
    },
  },
  {
    accessorKey: "total_biaya",
    header: "Total Cost",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total_biaya"));
      return `Rp ${amount.toLocaleString("id-ID")}`;
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
