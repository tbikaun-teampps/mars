import { ColumnDef } from "@tanstack/react-table";
import { components } from "@/types/api";
import { DataTable } from "@/components/data-table";
import { formatDistanceToNow, format } from "date-fns";
import { useMaterialAuditLogs } from "@/api/queries";
import { useAuditLogUrlState } from "@/hooks/useAuditLogUrlState";
import { SearchInput } from "@/components/search-input";
import { SortingPanel } from "@/components/sorting-panel";
import { AuditLogFilterPanel } from "@/components/audit-log-filter-panel";
import { ActiveBadges } from "@/components/active-badges";

type MaterialAuditLogEntry = components["schemas"]["MaterialAuditLogEntry"];

export function AuditLog() {
  // Use URL-based state for pagination, sorting, and filters
  const {
    pageIndex,
    pageSize,
    sorting,
    filters,
    activeFilterCount,
    setPagination,
    setSorting,
    setFilters,
    clearFilters,
    clearAll,
    removeFilter,
    setSearch,
  } = useAuditLogUrlState();

  // Build query params from UI state
  const skip = pageIndex * pageSize;
  const sortBy = sorting.length > 0 ? sorting[0].id : undefined;
  const sortOrder =
    sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined;

  // Fetch material audit logs using React Query with filters
  const { data, isLoading, isError, error } = useMaterialAuditLogs({
    skip,
    limit: pageSize,
    sort_by: sortBy,
    sort_order: sortOrder,
    material_number: filters.materialNumber,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    search: filters.search,
    changed_by_user_id: filters.changedByUserId,
  });

  const auditLogs = data?.items ?? [];
  const total = data?.total ?? 0;

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

  // Sortable columns for the audit log
  const sortableColumns = [
    { value: "timestamp", label: "Timestamp" },
    { value: "material_number", label: "Material Number" },
  ];

  return (
    <DataTable
      columns={columns}
      data={auditLogs}
      manualPagination={true}
      pageCount={pageCount}
      pagination={{ pageIndex, pageSize }}
      totalRows={total}
      onPaginationChange={setPagination}
      manualSorting={true}
      sorting={sorting}
      onSortingChange={setSorting}
      searchPanel={
        <SearchInput
          value={filters.search || ""}
          onChange={setSearch}
          placeholder="Search audit logs..."
        />
      }
      sortPanel={
        <SortingPanel
          sortableColumns={sortableColumns}
          sorting={sorting}
          onSortingChange={setSorting}
        />
      }
      filterPanel={
        <AuditLogFilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={clearFilters}
          activeFilterCount={activeFilterCount}
        />
      }
      activeFilterBadges={
        <ActiveBadges
          search={filters.search || ""}
          onClearSearch={() => setSearch("")}
          sorting={sorting}
          sortableColumns={sortableColumns}
          onClearSorting={() => setSorting([])}
          filters={filters}
          onRemoveFilter={removeFilter}
          onClearAll={clearAll}
        />
      }
    />
  );
}
