import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { components } from "@/types/api";
import { DataTable } from "@/components/data-table";
import { formatDistanceToNow, format } from "date-fns";
import { useMaterialAuditLogs } from "@/api/queries";

type MaterialAuditLogEntry = components["schemas"]["MaterialAuditLogEntry"];

export function AuditLog() {
  // Pagination state
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(20);

  // Build query params from UI state
  const skip = pageIndex * pageSize;

  // Fetch material audit logs using React Query
  const { data, isLoading, isError, error } = useMaterialAuditLogs({
    skip,
    limit: pageSize,
  });

  const auditLogs = data?.items ?? [];
  const total = data?.total ?? 0;

  const handlePaginationChange = (
    updater:
      | { pageIndex: number; pageSize: number }
      | ((old: { pageIndex: number; pageSize: number }) => {
          pageIndex: number;
          pageSize: number;
        })
  ) => {
    const newPagination =
      typeof updater === "function"
        ? updater({ pageIndex, pageSize })
        : updater;
    setPageIndex(newPagination.pageIndex);
    setPageSize(newPagination.pageSize);
  };

  const pageCount = Math.ceil(total / pageSize);

  const columns: ColumnDef<MaterialAuditLogEntry>[] = [
    {
      accessorKey: "timestamp",
      header: "Timestamp",
      cell: ({ row }) => {
        const date = row.getValue("timestamp") as string;
        return (
          <div className="text-xs">
            <div>
              {formatDistanceToNow(new Date(date), { addSuffix: true })}
            </div>
            <div className="text-muted-foreground text-[10px]">
              {format(new Date(date), "yyyy-MM-dd HH:mm:ss")}
            </div>
          </div>
        );
      },
      size: 100,
    },
    {
      accessorKey: "changed_by_user",
      header: "Changed By",
      cell: ({ row }) => {
        const changedByUser = row.original.changed_by_user;
        return (
          <div className="text-xs">
            <span>{changedByUser?.full_name ?? "Unknown User"}</span>
          </div>
        );
      },
      size: 100,
    },
    {
      accessorKey: "material_number",
      header: "Material Number",
      cell: ({ row }) => (
        <div className="font-medium text-xs">
          {row.getValue("material_number")}
        </div>
      ),
      size: 100,
    },
    {
      accessorKey: "material_desc",
      header: "Material Description",
      cell: ({ row }) => {
        const desc = row.getValue("material_desc") as string | null;
        return (
          <div className="text-xs">
            {desc || <span className="text-muted-foreground">N/A</span>}
          </div>
        );
      },
      size: 200,
    },
    {
      accessorKey: "change_summary",
      header: "Changes",
      cell: ({ row }) => (
        <div className="text-xs">{row.getValue("change_summary")}</div>
      ),
      size: 300,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading audit logs...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">
          Error: {error?.message ?? "Failed to fetch audit logs"}
        </div>
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={auditLogs}
      manualPagination={true}
      pageCount={pageCount}
      pagination={{ pageIndex, pageSize }}
      totalRows={total}
      onPaginationChange={handlePaginationChange}
    />
  );
}
