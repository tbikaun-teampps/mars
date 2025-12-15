import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { formatDistanceToNow, format } from "date-fns";
import { useUploadJobHistory } from "@/api/queries";
import { useUploadHistoryUrlState } from "@/hooks/useUploadHistoryUrlState";
import { SearchInput } from "@/components/search-input";
import { SortingPanel } from "@/components/sorting-panel";
import { UploadHistoryFilterPanel } from "@/components/upload-history-filter-panel";
import { UploadHistoryActiveBadges } from "@/components/upload-history-active-badges";
import { Badge } from "@/components/ui/badge";
import { UploadJobStatus } from "@/api/client";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  FileText,
} from "lucide-react";

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function StatusBadge({ status }: { status: UploadJobStatus["status"] }) {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    case "processing":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function UploadHistory() {
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
  } = useUploadHistoryUrlState();

  // Build query params from UI state
  const skip = pageIndex * pageSize;
  const sortBy = sorting.length > 0 ? sorting[0].id : undefined;
  const sortOrder =
    sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined;

  // Fetch upload job history using React Query with filters
  const { data, isLoading, isError, error } = useUploadJobHistory({
    skip,
    limit: pageSize,
    sort_by: sortBy,
    sort_order: sortOrder,
    status: filters.status,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    search: filters.search,
  });

  const jobs = data?.jobs ?? [];
  const total = data?.total ?? 0;

  const pageCount = Math.ceil(total / pageSize);

  const columns: ColumnDef<UploadJobStatus>[] = [
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
      size: 120,
    },
    {
      accessorKey: "file_name",
      header: "File",
      cell: ({ row }) => {
        const fileName = row.getValue("file_name") as string | null;
        const fileSize = row.original.file_size_bytes;
        return (
          <div className="text-xs">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium truncate max-w-[200px]">
                {fileName || "Unknown file"}
              </span>
            </div>
            <div className="text-muted-foreground text-[10px] ml-5">
              {formatFileSize(fileSize)}
            </div>
          </div>
        );
      },
      size: 250,
    },
    {
      accessorKey: "created_at",
      header: "Started",
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string | null;
        if (!date) return <span className="text-muted-foreground">-</span>;
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
      size: 140,
    },
    {
      accessorKey: "completed_at",
      header: "Completed",
      cell: ({ row }) => {
        const date = row.getValue("completed_at") as string | null;
        if (!date) return <span className="text-muted-foreground text-xs">-</span>;
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
      size: 140,
    },
    {
      id: "result",
      header: "Result",
      cell: ({ row }) => {
        const status = row.original.status;
        const result = row.original.result;
        const error = row.original.error;
        const progress = row.original.progress;

        if (status === "completed" && result) {
          return (
            <div className="text-xs">
              <div>{result.inserted.toLocaleString()} materials</div>
              <div className="text-muted-foreground">
                {result.insights.toLocaleString()} insights
              </div>
            </div>
          );
        }

        if (status === "failed" && error) {
          return (
            <div className="text-xs text-red-600 max-w-[200px] truncate" title={error}>
              {error}
            </div>
          );
        }

        if (status === "processing" || status === "pending") {
          return (
            <div className="text-xs text-muted-foreground">
              {progress.percentage.toFixed(1)}% complete
            </div>
          );
        }

        return <span className="text-muted-foreground text-xs">-</span>;
      },
      size: 180,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading upload history...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">
          Error: {error?.message ?? "Failed to fetch upload history"}
        </div>
      </div>
    );
  }

  // Sortable columns for the upload history
  const sortableColumns = [
    { value: "created_at", label: "Started" },
    { value: "completed_at", label: "Completed" },
    { value: "file_name", label: "File Name" },
    { value: "status", label: "Status" },
  ];

  return (
    <DataTable
      columns={columns}
      data={jobs}
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
          placeholder="Search by file name..."
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
        <UploadHistoryFilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={clearFilters}
          activeFilterCount={activeFilterCount}
        />
      }
      activeFilterBadges={
        <UploadHistoryActiveBadges
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
