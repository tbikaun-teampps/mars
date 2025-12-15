import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "./ui/badge";
import type { SortingState } from "@tanstack/react-table";
import type { UploadHistoryFilters } from "@/hooks/useUploadHistoryUrlState";

// Labels for status filter
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

interface SortableColumn {
  value: string;
  label: string;
}

interface UploadHistoryActiveBadgesProps {
  // Search
  search: string;
  onClearSearch: () => void;

  // Sorting
  sorting: SortingState;
  sortableColumns: SortableColumn[];
  onClearSorting: () => void;

  // Filters
  filters: UploadHistoryFilters;
  onRemoveFilter: (key: string) => void;

  // Unified clear
  onClearAll: () => void;
}

export function UploadHistoryActiveBadges({
  search,
  onClearSearch,
  sorting,
  sortableColumns,
  onClearSorting,
  filters,
  onRemoveFilter,
  onClearAll,
}: UploadHistoryActiveBadgesProps) {
  const badges: React.ReactNode[] = [];

  // Search badge
  if (search) {
    const displayValue =
      search.length > 20 ? search.slice(0, 20) + "..." : search;
    badges.push(
      <Badge
        key="search"
        variant="secondary"
        className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm bg-blue-100 text-blue-500"
      >
        Search: "{displayValue}"
        <button
          onClick={onClearSearch}
          className="ml-1 hover:bg-muted rounded-full p-0.5 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  }

  // Sort badge
  if (sorting.length > 0) {
    const currentSort = sorting[0];
    const columnLabel =
      sortableColumns.find((c) => c.value === currentSort.id)?.label ||
      currentSort.id;

    badges.push(
      <Badge
        key="sort"
        variant="secondary"
        className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm bg-blue-100 text-blue-500"
      >
        {columnLabel} {currentSort.desc ? "↓" : "↑"}
        <button
          onClick={onClearSorting}
          className="ml-1 hover:bg-muted rounded-full p-0.5 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  }

  // Status badge
  if (filters.status) {
    badges.push(
      <Badge
        key="status"
        variant="secondary"
        className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm bg-blue-100 text-blue-500"
      >
        Status: {STATUS_LABELS[filters.status] || filters.status}
        <button
          onClick={() => onRemoveFilter("status")}
          className="ml-1 hover:bg-muted rounded-full p-0.5 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  }

  // Date range badges
  if (filters.dateFrom || filters.dateTo) {
    const label =
      filters.dateFrom && filters.dateTo
        ? `Date: ${filters.dateFrom} to ${filters.dateTo}`
        : filters.dateFrom
        ? `Date: from ${filters.dateFrom}`
        : `Date: to ${filters.dateTo}`;
    badges.push(
      <Badge
        key="date-range"
        variant="secondary"
        className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm bg-blue-100 text-blue-500"
      >
        {label}
        <button
          onClick={() => {
            onRemoveFilter("dateFrom");
            onRemoveFilter("dateTo");
          }}
          className="ml-1 hover:bg-muted rounded-full p-0.5 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {badges}
      <Badge
        variant="outline"
        className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm border-dashed cursor-pointer hover:bg-muted"
        onClick={onClearAll}
      >
        Clear all
        <X className="h-3 w-3" />
      </Badge>
    </div>
  );
}
